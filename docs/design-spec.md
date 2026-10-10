# Live Video Sync — design spec

Status: implemented (2026-10-07). Deviations found during implementation are
listed in §11. See `CONTRIBUTING.md` for code conventions.

## 1. Where this is going, and what we build now

**Eventually:** a self-hosted media platform. Users upload video and music,
build playlists, and open a *watch-together room* on a playlist. Others join;
anyone can play, pause, seek, or change media; every action is attributed and
logged. Horizontally scalable. Media end-to-end encrypted so the server never
sees plaintext.

**Now:** only the room-sync slice, with everything else stubbed by the
simplest thing that has the same *shape* as the future version:

| Concern         | Now                                              | Later                                           |
| --------------- | ------------------------------------------------ | ----------------------------------------------- |
| Auth            | Cloudflare Zero Trust in front of the whole site | Platform accounts; token in `hello`             |
| Identity        | Display name typed on join                       | Account id + display name                       |
| Media           | HLS folders copied to the server over ssh        | Upload pipeline, transcoding, E2EE              |
| Room definition | `rooms/<code>.json` written over ssh             | Row created by the platform API from a playlist |
| Room live state | In memory                                        | Redis, or sticky routing per room               |
| Action log      | In memory, bounded, tail sent on join            | Database table                                  |

The seam that makes the "later" column a swap rather than a rewrite is the
repository layer on the server (§5): the sync service never knows where room
definitions or live state live, only the repository interfaces.

**Scope of the room-sync slice:** join a room by code + name; play, pause,
seek, change media; see who is in the room; see who is buffering, including in
fullscreen; see a log of who did what; survive disconnects, backgrounding, and
autoplay restrictions. Not in scope: room creation UI, accounts, uploads,
playlists as a first-class object (the room's media list *is* the playlist).

## 2. Repository layout

```
live-video-sync/
  package.json                      npm workspaces: packages/*, apps/*, e2e
  tsconfig.json                     solution file: references every workspace
  CONTRIBUTING.md                   conventions
  docs/design-spec.md               this file
  deploy/                           Dockerfile, compose file, nginx config
  deploy/data/media/convert-to-hls.sh   mkv/mp4 → HLS folder, kept beside the media
  packages/
    sync-protocol/                  §4  TypeBox schemas, PlaybackState, room reducer
    fastify-platform/               §5.1 Fastify boilerplate shared by servers
    sync-engine/                    §6  pure client engine + test fakes + simulator
  apps/
    sync-server/                    §5  Fastify: websocket route, room service, repositories
    frontend/                       §7  Vite + React + Mantine
  e2e/                              §8  Playwright suite
```

## 3. Domain model

Two things are easy to conflate, so they have different names:

- **Room**: who is here and what they did. Definition (code, name, media
  list), members, action log.
- **Playback**: what the shared player is doing. One anchor: which media,
  playing or paused, position at a server time.

```ts
interface MediaItem {
  id: string;             // stable within the room, e.g. "s3e01"
  name: string;
  url: string;            // HLS playlist, site-relative: "/media/<room>/<id>/master.m3u8"
}

interface RoomDefinition {   // rooms/<code>.json
  code: string;              // join code; also the URL: /r/<code>
  name: string;
  media: MediaItem[];
}

interface Member {
  connectionId: string;      // server-issued per socket; two tabs are two members
  name: string;              // typed on join
  stalledSince: number | null;   // server time, null when playing fine
}

// The anchor. Only the server mutates it. See positionAt().
interface PlaybackState {
  seq: number;               // server-issued, monotonic; higher wins
  mediaId: string | null;    // null until the first media is selected
  paused: boolean;
  anchorVideoTime: number;   // seconds
  anchorServerTime: number;  // ms, server clock
  waiting: number;           // members stalled >= WAIT_AFTER_MS; clock frozen while > 0
}

interface LogEntry {
  id: number;                // per-room, monotonic
  at: number;                // server time
  connectionId: string;
  name: string;
  event:
    | { kind: 'join' } | { kind: 'leave' }
    | { kind: 'play'; at: number } | { kind: 'pause'; at: number }
    | { kind: 'seek'; from: number; to: number }
    | { kind: 'media'; mediaId: string }
    | { kind: 'stall' } | { kind: 'recovered'; afterMs: number };
}

interface Room {              // the server's full live picture
  definition: RoomDefinition;
  playback: PlaybackState;
  members: Map<string, Member>;   // by connectionId
  log: LogEntry[];                // bounded to LOG_LIMIT, oldest dropped
}
```

Media is identified by `id`, not index, so the list can be edited while a room
is live. Identity is just the connection: a reload is a leave and a join, and
the log says so. Accounts will add a user id to `Member` later.

## 4. Sync protocol (`packages/sync-protocol`)

One WebSocket per tab: `GET /api/rooms/:code/ws`. Frames are JSON text.
Messages are TypeBox schemas; both sides use the `Static` types, the server
validates every inbound frame at the edge.

### 4.1 Client → server

```ts
type ClientMessage =
  | { t: 'hello'; name: string; lastSeq?: number }
  | { t: 'intent'; id: number; intent: SharedIntent }   // id: client-local, echoed in playback.cause
  | { t: 'ping'; c: number };                           // c: client monotonic ms

type SharedIntent =
  | { action: 'play' }
  | { action: 'pause' }
  | { action: 'seek'; time: number }
  | { action: 'media'; mediaId: string }
  | { action: 'stall'; on: boolean };   // a report, not a request; sent promptly (>= STALL_MS)
```

The server decides when a stall is long enough to freeze the clock (§4.3).
That keeps the "who is buffering" indicator immediate without letting hiccups
pause everyone. Intents carry no timestamps; the server's clock is the clock.

### 4.2 Server → client

```ts
type ServerMessage =
  | { t: 'welcome'; you: { connectionId: string }; room: { code: string; name: string };
      media: MediaItem[]; members: Member[]; playback: PlaybackState; log: LogEntry[] }
  | { t: 'playback'; playback: PlaybackState; cause?: { connectionId: string; intentId?: number } }
  | { t: 'members'; members: Member[] }      // on join, leave, or any stalledSince change
  | { t: 'log'; entry: LogEntry }
  | { t: 'pong'; c: number; s: number }      // s: server clock ms at reply
  | { t: 'error'; code: 'bad-message' | 'unknown-room' | 'unknown-media'; message: string };
```

- `welcome` answers `hello` and is the complete picture; a reconnecting client
  needs nothing else.
- `playback` is sent after every change *and* every `SNAPSHOT_MS`, so a client
  that missed a message converges within one interval.
- Every `ping` gets an immediate `pong`; pings double as keepalive.
- A bad frame gets an `error` and is dropped. The socket stays open.

### 4.3 Room reducer (pure)

```ts
type RoomEvent =
  | { kind: 'join'; member: Member }
  | { kind: 'leave'; connectionId: string }
  | { kind: 'intent'; connectionId: string; intent: SharedIntent }
  | { kind: 'tick' };           // re-evaluate stall ages

function roomReducer(room: Room, ev: RoomEvent, now: number, policy: RoomPolicy): Room;
// Returns the same reference when nothing changed.
```

1. Every playback change first re-anchors (`anchorVideoTime = positionAt(playback, now)`,
   `anchorServerTime = now`), applies the change, then `seq++`.
2. `play` / `pause` set `paused`. `play` with `mediaId === null` is ignored.
3. `seek` clamps to `>= 0`. (No durations in the definition; the player clamps the top.)
4. `media` with a known id sets `mediaId`, `anchorVideoTime = 0`, `paused = true`,
   and clears every member's `stalledSince`. Allowed while members are stalled.
   Unknown id → no change (the controller answers `unknown-media`).
5. `stall on` sets `member.stalledSince = now` if null; `stall off` clears it.
6. `waiting` is recomputed on every event and on `tick`: members with
   `now - stalledSince >= WAIT_AFTER_MS`, excluding any stalled longer than
   `STALL_EXPIRE_MS`. When it crosses zero in either direction: re-anchor, `seq++`.
7. `leave` removes the member; with no members left the room pauses.
8. `join` adds the member; playback unchanged.
9. Every intent except a redundant `stall` appends a `LogEntry`; so do join and leave.

### 4.4 Package tree

```
packages/sync-protocol/src/
  index.ts
  playback-state.ts    PlaybackState, positionAt           (exists as room-state.ts; rename)
  media.ts             MediaItem, RoomDefinition schemas
  member.ts            Member schema
  log.ts               LogEntry schema
  messages.ts          ClientMessage, ServerMessage, SharedIntent schemas + Static types
  policy.ts            RoomPolicy + defaults
  room/
    room.ts            Room, createRoom(definition)
    room-events.ts     RoomEvent
    room-reducer.ts    roomReducer
packages/sync-protocol/tests/unit/
  playback-state, room-reducer (table tests), messages (schema round-trips)
```

## 5. Sync server (`apps/sync-server`)

### 5.1 `packages/fastify-platform`

The boilerplate every server here will share, modeled on scribear's
`base-fastify-server`:

```
packages/fastify-platform/src/
  create-base-server.ts     Fastify + pino logger, uuid request ids, TypeBox type provider,
                            @fastify/sensible, error handler (HttpError → JSON), not-found handler
  create-logger.ts
  dependency-injection.ts   awilix container + @fastify/awilix; registerDependencies(container, {...})
  errors/http-errors.ts     HttpError(status, code, message)
  websocket/
    websocket-plugin.ts     @fastify/websocket registration
    typed-socket.ts         wraps a socket: parse JSON, validate against clientMessage schema,
                            typed send(serverMessage), drop-and-count invalid frames, close helpers
    websocket-route.ts      registerWebSocketRoute(app, { url, params, clientMessage, serverMessage, handler })
  types/                    BaseFastifyInstance etc.
```

### 5.2 Feature layering

```
apps/sync-server/src/
  index.ts                               config → buildServer → listen
  build-server.ts                        createBaseServer + DI registration + routers
  app-config.ts                          env: PORT, HOST, ROOMS_DIR, MEDIA_DIR, LOG_LEVEL
  dependency-injection/
    register-dependencies.ts             wires the classes below into the awilix container
  features/
    rooms/
      rooms.router.ts                    GET /api/rooms/:code (http), GET /api/rooms/:code/ws (websocket)
      rooms.controller.ts                http: lookup → {code,name} | 404
                                         ws: hello → join; message → RoomEvent; close → leave; reply packaging
      room-sync.service.ts               business logic: open room, join/leave, apply events via roomReducer,
                                         diff before/after → broadcast playback/members/log, snapshot + tick timers
      room-definition.repository.ts      reads ROOMS_DIR/<code>.json (later: database)
      room.repository.ts                 in-memory Map<code, Room> (later: Redis)
      connection.registry.ts             Map<connectionId, TypedSocket> per room; broadcast(code, msg)
    probes/
      probes.router.ts, probes.controller.ts   /healthz
    media/
      media.router.ts                    dev only: @fastify/static over MEDIA_DIR at /media
apps/sync-server/tests/
  unit/           room-sync.service (fake repositories, fake clock), controller, repositories (tmp dir)
  integration/    buildServer + `ws` client: hello/welcome, intent → broadcast, stall → members, reconnect
```

`room-sync.service` is the only place with logic. It calls `roomReducer`, then
compares before/after: `playback` if `seq` changed, `members` if the member
map or any `stalledSince` changed, `log` for each new entry.

A room's live state stays in memory after the last member leaves (paused), so
rejoining resumes where it stopped. A server restart loses it.

### 5.3 Scaling note (not built now)

Live state per room is a small JSON blob plus a member list. Either route
each room code to one instance, or move `room.repository` to Redis with
compare-and-set and fan out broadcasts over pub/sub. The protocol does not
change either way.

## 6. Sync engine (`packages/sync-engine`)

A pure step function wrapped in a thin class. Owns no timers, sockets, DOM,
or hls.js. The host feeds inputs; it returns effects.

### 6.1 Inputs

```ts
// Everything the engine needs to know about the local world, sampled each tick.
// Player state and what the adapter has loaded travel together: the engine's
// first question is whether the loaded media matches playback.mediaId.
interface SyncSnapshot {
  now: number;                     // host monotonic ms
  visible: boolean;
  loaded: { mediaId: string; ready: boolean } | null;
  player: {
    currentTime: number;
    paused: boolean;
    rate: number;
    readyState: 0 | 1 | 2 | 3 | 4;
    ended: boolean;
  };
}

type EngineInput =
  | { type: 'tick'; snapshot: SyncSnapshot }
  | { type: 'connected'; now: number }
  | { type: 'disconnected'; now: number }
  | { type: 'message'; msg: ServerMessage; now: number }
  | { type: 'player'; event: PlayerEvent; now: number }
  | { type: 'intent'; intent: UserIntent; now: number };

type PlayerEvent =
  | { type: 'playRejected'; reason: 'gesture' | 'other' }
  | { type: 'error'; fatal: boolean; message: string };

type UserIntent =
  | { action: 'play' } | { action: 'pause' } | { action: 'seek'; time: number }
  | { action: 'media'; mediaId: string }
  | { action: 'gesture' };             // user tapped "tap to play"
```

### 6.2 Outputs

```ts
type Effect =
  | { type: 'send'; msg: ClientMessage }
  | { type: 'player'; cmd: PlayerCommand };

type PlayerCommand =
  | { type: 'load'; mediaId: string; url: string; startAt: number }
  | { type: 'play' } | { type: 'pause' }
  | { type: 'seek'; time: number }
  | { type: 'rate'; rate: number };
```

### 6.3 State

```ts
interface EngineState {
  connection: 'disconnected' | 'connected';
  disconnectedAt: number | null;
  name: string;
  me: { connectionId: string } | null;
  room: { code: string; name: string } | null;
  playback: PlaybackState | null;
  media: MediaItem[];
  members: Member[];
  log: LogEntry[];
  clock: ClockSyncSamples;               // pure data
  lastPingAt: number;
  nextIntentId: number;
  pending: PendingIntent[];              // optimistic intents awaiting echo
  stall: { since: number | null; reported: boolean; lastProgressAt: number; lastTime: number };
  correction: { rate: number; lastSeekAt: number };
  gesture: 'unknown' | 'needed' | 'granted';
  error: string | null;
}
```

### 6.4 Step rules on a tick, in order

1. **Disconnect grace.** Disconnected longer than `DISCONNECT_GRACE_MS` and
   player not paused → emit `pause`. Controls are disabled from the instant of
   disconnect regardless.
2. **Ping.** Connected and `now - lastPingAt >= PING_MS` → emit `ping`.
3. **Bail** if no playback or no clock sample yet.
4. **Media.** `playback.mediaId !== snapshot.loaded?.mediaId` → emit
   `load { mediaId, url, startAt: positionAt(playback, serverNow) }` and stop.
   Nothing else until `loaded.ready`.
5. **Stall detection.** Playing, `readyState < 3`, `currentTime` unchanged for
   `STALL_MS` → stalled. Transitions emit `stall on` / `stall off`.
6. **Waiting for others.** `playback.waiting > 0` and I am not stalled → ensure
   paused (no intent). Skip correction.
7. **Pause/play reconciliation.** `playback.paused !== player.paused` → emit
   `pause` or `play`. Never `play` while `gesture === 'needed'`.
8. **Correction.** `drift = currentTime - positionAt(playback, serverNow)`:
   `|drift| < DEADZONE_S` → rate 1 (with hysteresis);
   `< RATE_ZONE_S` → `rate = clamp(1 - drift * RATE_GAIN, RATE_MIN, RATE_MAX)`;
   else → `seek` to target, rate 1, respect `SEEK_COOLDOWN_MS`.

Other inputs:

- `welcome`: replace room, media, members, log, playback; clear pending.
- `playback`: accept if `seq` greater; drop my pending intents up to `cause.intentId`.
- `pong`: record `(c, s, now)` into clock samples.
- `members` / `log`: replace / append (bounded).
- UI intent: apply optimistically to `playback` (re-anchored at `serverNow`),
  push to `pending`, emit `send intent`. Ignored while disconnected, while not
  `loaded.ready`, or for `media` with an unknown id.
- `gesture`: `gesture = 'granted'`. The UI also calls `player.play()`
  synchronously inside the click handler (Safari).
- `playRejected gesture`: `gesture = 'needed'`.
- `connected`: emit `hello { name, lastSeq }`; reset clock samples.
- `disconnected`: record `disconnectedAt`.
- First visible tick after a hidden stretch: ping immediately and reset
  `stall.lastProgressAt` so the lock-screen stall is not reported.

### 6.5 View

```ts
interface EngineView {
  phase: 'joining' | 'loading' | 'playing' | 'paused' | 'stalled' | 'waitingForOthers'
       | 'needsGesture' | 'ended' | 'reconnecting' | 'error';
  controlsEnabled: boolean;
  room: { code: string; name: string } | null;
  media: MediaItem[];
  currentMediaId: string | null;
  members: Member[];
  stalledMembers: Member[];              // badge: anyone stalled, even briefly
  waiting: boolean;                      // clock frozen
  log: LogEntry[];
  debug: { drift: number; rtt: number | null; offset: number | null; rate: number; seq: number };
}
```

`phase` precedence: error > reconnecting > joining > loading > needsGesture >
waitingForOthers > stalled > ended > paused > playing.

### 6.6 Policy

| name                | default     | note                               |
| ------------------- | ----------- | ---------------------------------- |
| TICK_MS             | 250         | host loop                          |
| PING_MS             | 1000        |                                    |
| DISCONNECT_GRACE_MS | 1000        | before local pause                 |
| STALL_MS            | 300         | before `stall on`                  |
| WAIT_AFTER_MS       | 1500        | server: before clock freezes       |
| STALL_EXPIRE_MS     | 30000       | server: stuck-stall safety valve   |
| SNAPSHOT_MS         | 2000        | server: periodic playback broadcast |
| DEADZONE_S          | 0.10        |                                    |
| RATE_ZONE_S         | 2.0         |                                    |
| RATE_MIN / RATE_MAX | 0.95 / 1.05 |                                    |
| RATE_GAIN           | 0.5         |                                    |
| SEEK_COOLDOWN_MS    | 1000        |                                    |
| LOG_LIMIT           | 500         | server and client                  |

### 6.7 Test harness (`src/testing/`)

```ts
class VirtualClock { now(): number; advance(ms): void }
class FakePlayer {           // deterministic <video> + adapter model
  autoplay: 'allow' | 'rejectUntilGesture';
  loadLatencyMs: number;
  stalls: Array<{ atVideoTime: number; forMs: number }>;
  snapshot(now): Pick<SyncSnapshot, 'loaded' | 'player'>; exec(cmd): PlayerEvent[]; advance(ms): void;
}
class FakeNetwork { latencyMs; jitterMs; dropRate; deliverUntil(now) }
class FakeServer { /* room-sync logic over the real roomReducer, virtual time */ }
class Simulation {
  addClient(name, opts): ClientHandle;
  run(ms): void;
  positions(): Record<string, number>;
  commands(name): PlayerCommand[];
}
```

Scenarios (`tests/scenarios/`), each asserting max pairwise position error
after settle and an upper bound on seek commands:

1. A presses play; both playing within one RTT; error < 100 ms.
2. C joins mid-play; loads at target; no seek storm.
3. A seeks; B follows with exactly one seek; nobody reports a stall.
4. B stalls 500 ms; A's badge shows B; A never pauses; B recovers by rate nudging.
5. B stalls 3 s; A waits at 1.5 s; both resume; error < 100 ms.
6. B hidden 60 s with no ticks; on return one seek, no stall report.
7. A's socket drops 5 s; A pauses after grace; resyncs on reconnect with one seek.
8. Autoplay rejected on C; room unaffected; gesture joins at target.
9. A client with 5 s wall-clock error behaves identically.
10. Media change while B is stalled: everyone lands paused at 0, B's stall cleared.
11. 20 % loss, 200 ± 80 ms jitter: converges, no oscillation.

### 6.8 Package tree

```
packages/sync-engine/src/
  index.ts
  sync-engine.ts         class: tick(snapshot) / onMessage / onPlayerEvent / intent / setConnected / view()
  engine-step.ts         engineStep(state, input, policy) → [state, effects]
  engine-state.ts        EngineState, initialEngineState(name)
  inputs.ts              SyncSnapshot, EngineInput, PlayerEvent, UserIntent
  effects.ts             Effect, PlayerCommand
  view.ts                deriveView
  policy.ts              EnginePolicy + defaults
  clock-sync.ts          pure functions over ClockSyncSamples (exists as a class; make pure)
  correction.ts          correct(drift, state, policy) → PlayerCommand | null
  stall-detector.ts
  testing/               virtual-clock, fake-player, fake-network, fake-server, simulation
packages/sync-engine/tests/
  unit/                  clock-sync, correction, stall-detector, engine-step (table tests)
  scenarios/             one file per scenario
```

## 7. Frontend (`apps/frontend`)

Mantine, keeping the original layout: `AppShell` with a header (title, theme
toggle), content centred at 1280px.

### 7.1 Pages

- `/` — join form: room code, display name (name remembered in localStorage).
  Validates the code with `GET /api/rooms/:code`.
- `/r/:code` — the room. Prompts for a name if none is stored.

### 7.2 Room page layout

```
┌──────────────────────────────────────────────────────────────┐
│ AppShell.Header: Live Video Sync · <room name>     [theme]   │
├─────────────────────────────────────┬────────────────────────┤
│ PlayerShell (fullscreen container)  │ RoomPanel              │
│   video + overlays + stall badge    │   Members (name, you,  │
│   control bar                       │     stalled dot)       │
├─────────────────────────────────────┤   Log (newest first,   │
│ Playlist                            │     "Bob paused 12:34")│
│   NavLink list, active item marked  │                        │
└─────────────────────────────────────┴────────────────────────┘
          (md and below: RoomPanel stacks under the playlist)
```

The stall badge and the overlays render inside `PlayerShell`, so they survive
fullscreen. A compact version of RoomPanel is available inside the shell as a
drawer for fullscreen use.

### 7.3 Runtime wiring (`src/player/`)

```
hls-player-adapter.ts    { exec(cmd), snapshot(): Pick<SyncSnapshot,'loaded'|'player'>, onEvent }
                         over <video playsinline> + hls.js ({ autoStartLoad:false } → loadSource + startLoad(startAt))
ws-transport.ts          reconnecting WebSocket with backoff; emits connected / disconnected / message
browser-runner.ts        setInterval(TICK_MS) → engine.tick({ now, visible, ...adapter.snapshot() }); executes effects
use-room-engine.ts       React hook owning the three above; view via useSyncExternalStore; { shared, local } dispatchers
```

Local intents (volume, mute, subtitles, audio track, fullscreen) go straight
to the adapter or DOM and never reach the engine.

### 7.4 Components

```
components/player/
  player-shell.tsx      fullscreen container, auto-hide controls, keyboard shortcuts
  video-surface.tsx     the <video>; hands the element up via callback
  status-overlay.tsx    needsGesture | waitingForOthers ("Waiting for Bob…") | reconnecting | error | loading
  stall-badge.tsx       corner chip listing stalledMembers
  control-bar.tsx       play/pause · seek-bar · time · volume · subtitle-menu · fullscreen
  seek-bar.tsx          buffered ranges; drag preview local; seek on release
  subtitle-menu.tsx     hls.subtitleTracks → local intent
components/room/
  join-form.tsx
  playlist.tsx          media list; click → shared intent { action:'media' }
  members-list.tsx
  action-log.tsx
  room-panel.tsx        members + log; also used as the in-shell drawer
```

Presentational props contract:

```tsx
interface PlayerUiProps {
  view: EngineView;
  local: LocalState;                     // volume, muted, subtitle, fullscreen, panelOpen
  onShared: (i: UserIntent) => void;
  onLocal: (i: LocalIntent) => void;
  onVideoElement: (el: HTMLVideoElement | null) => void;
}
```

### 7.5 Tests

- unit: components rendered with a fake `EngineView` via `tests/utils/render.tsx`;
  identity; ws-transport against a fake WebSocket.
- integration: `use-room-engine` with a fake transport and fake adapter,
  asserting on effects and view transitions.

## 8. End-to-end (`e2e/`)

Playwright. Starts `sync-server` with a fixture rooms dir and the built
frontend, opens two or three browser contexts in one room, and checks: join
and names appear; play in A starts B; seek in A moves B; media change; the
stall badge when B's network is throttled; log entries. Media fixture: a
short HLS stream generated by an `ffmpeg` script and committed under
`e2e/fixtures/`.

## 9. Build order

1. `sync-protocol`: rename to `PlaybackState`, media/member/log schemas,
   messages, `roomReducer` + table tests.
2. `sync-engine`: policy, pure clock-sync, correction, stall-detector,
   `engineStep`, fakes, scenarios 1–5.
3. `fastify-platform`: logger, DI, errors, typed websocket route.
4. `sync-server`: repositories, service, controller, router; integration tests.
5. `frontend`: adapter, transport, runner, hook; shell, overlay, control bar,
   playlist, room panel, join page.
6. Scenarios 6–11; e2e suite; `deploy/`.

## 10. Decisions taken

- e2e media: a 10 s Big Buck Bunny clip (CC-BY) is downloaded and looped to
  30 s of HLS by `e2e/scripts/fetch-media.sh`; ffmpeg is required for e2e only.
- Keyboard shortcuts: space/k play-pause, j/l skip 10 s, arrows skip 5 s,
  f fullscreen, m mute.

## 11. Deviations from this spec in the implementation

- Engine has an extra `idle` phase (joined, no media selected) with controls
  enabled so media can be picked.
- While the tab is hidden the engine only pings and issues no player
  commands; while it is itself stalled it skips correction.
- Correction compares against the room's `paused` flag rather than the
  player's current one, so a just-issued `play` does not also seek.
- Any accepted newer `playback` clears all pending intents.
- Policy gained `clockSamples` (8) and `rateResetS` (0.03).
- An ended player is left alone unless the room target is more than
  `rateZoneS` behind it.
- Scenario 4 uses a 1.2 s stall and scenario 5 a 4 s stall, to clear the
  300 ms detection plus 250 ms tick; scenario 11 drops only server broadcasts.
- Server: `buildServer(config, overrides?)` is async; the ws controller
  answers pings before `hello` but rejects intents with `not-joined`; an
  unknown room closes the socket with code 4404 after the error message.
- `ServerErrorCode` includes `not-joined`.
- Frontend playlist items render as buttons; `useRoomEngine` exposes
  `setShellElement` for the fullscreen target.
