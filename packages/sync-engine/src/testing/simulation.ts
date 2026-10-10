import type {
  ClientMessage,
  RoomDefinition,
  ServerMessage,
} from '@live-video-sync/sync-protocol';

import type { Effect, PlayerCommand } from '../effects.js';
import type { UserIntent } from '../inputs.js';
import { DEFAULT_ENGINE_POLICY, type EnginePolicy } from '../policy.js';
import { SyncEngine } from '../sync-engine.js';
import type { EngineView } from '../view.js';
import { FakeNetwork, type FakeNetworkOptions } from './fake-network.js';
import { FakePlayer, type FakePlayerOptions } from './fake-player.js';
import { FakeServer, type FakeServerOptions } from './fake-server.js';
import { VirtualClock } from './virtual-clock.js';

export interface SimulationOptions {
  definition: RoomDefinition;
  server?: Omit<FakeServerOptions, 'definition'>;
  /** Granularity of the simulation loop. */
  stepMs?: number;
}

export interface SimulationClientOptions {
  player?: FakePlayerOptions;
  network?: FakeNetworkOptions;
  /** This client's monotonic clock minus the simulation clock, ms. */
  clockSkewMs?: number;
  policy?: Partial<EnginePolicy>;
}

interface SimulatedClient {
  name: string;
  engine: SyncEngine;
  player: FakePlayer;
  network: FakeNetwork;
  policy: EnginePolicy;
  skewMs: number;
  connectionId: string | null;
  generation: number;
  hidden: boolean;
  lastTickAt: number;
  lastAdvanceAt: number;
  sent: ClientMessage[];
}

/** Messages the periodic broadcast will repair if a flaky relay loses them. */
const DROPPABLE: ReadonlySet<ServerMessage['t']> = new Set([
  'playback',
  'members',
  'pong',
  'log',
]);

/**
 * Several engines, each with its own fake player and network link, against
 * one fake server, all in virtual time.
 */
export class Simulation {
  public readonly clock = new VirtualClock();
  public readonly server: FakeServer;

  private readonly _stepMs: number;
  private readonly _clients = new Map<string, SimulatedClient>();

  public constructor(options: SimulationOptions) {
    this._stepMs = options.stepMs ?? 50;
    this.server = new FakeServer(
      { ...options.server, definition: options.definition },
      this.clock,
    );
  }

  /** Adds a client and connects it. */
  public addClient(name: string, options: SimulationClientOptions = {}): void {
    const policy = { ...DEFAULT_ENGINE_POLICY, ...options.policy };
    this._clients.set(name, {
      name,
      engine: new SyncEngine(name, policy),
      player: new FakePlayer(options.player),
      network: new FakeNetwork(options.network),
      policy,
      skewMs: options.clockSkewMs ?? 0,
      connectionId: null,
      generation: 0,
      hidden: false,
      lastTickAt: Number.NEGATIVE_INFINITY,
      lastAdvanceAt: this.clock.now(),
      sent: [],
    });
    this.connect(name);
  }

  public connect(name: string): void {
    const client = this._client(name);
    const generation = ++client.generation;
    client.connectionId = this.server.connect((msg) => {
      client.network.send(
        `server->${name}`,
        this.clock.now(),
        () => {
          if (client.generation !== generation) return;
          this._execute(
            client,
            client.engine.onMessage(msg, this._clientNow(client)),
          );
        },
        DROPPABLE.has(msg.t),
      );
    });
    this._execute(
      client,
      client.engine.setConnected(true, this._clientNow(client)),
    );
  }

  public disconnect(name: string): void {
    const client = this._client(name);
    if (client.connectionId !== null)
      this.server.disconnect(client.connectionId);
    client.connectionId = null;
    client.generation++;
    this._execute(
      client,
      client.engine.setConnected(false, this._clientNow(client)),
    );
  }

  /** The tab goes to the background: the OS pauses media and ticks stop. */
  public hide(name: string): void {
    const client = this._client(name);
    client.player.suspend();
    client.hidden = true;
    this._tick(client, false);
  }

  public show(name: string): void {
    this._client(name).hidden = false;
  }

  public intent(name: string, intent: UserIntent): void {
    const client = this._client(name);
    this._execute(
      client,
      client.engine.intent(intent, this._clientNow(client)),
    );
  }

  /** The user taps the overlay: the player plays inside the gesture, then the engine hears about it. */
  public tapToPlay(name: string): void {
    const client = this._client(name);
    const now = this._clientNow(client);
    const events = client.player.grantGesture(now);
    for (const event of events) {
      this._execute(client, client.engine.onPlayerEvent(event, now));
    }
    this._execute(client, client.engine.intent({ action: 'gesture' }, now));
  }

  /** Advances virtual time, stepping players, network, server, and engines. */
  public run(ms: number): void {
    const end = this.clock.now() + ms;
    while (this.clock.now() < end) {
      this.clock.advance(Math.min(this._stepMs, end - this.clock.now()));
      const now = this.clock.now();

      for (const client of this._clients.values()) {
        client.player.advance(
          client.lastAdvanceAt + client.skewMs,
          now + client.skewMs,
        );
        client.lastAdvanceAt = now;
      }
      this.server.tick();
      for (const client of this._clients.values()) {
        client.network.deliverUntil(now);
      }
      for (const client of this._clients.values()) {
        if (client.hidden || now - client.lastTickAt < client.policy.tickMs) {
          continue;
        }
        client.lastTickAt = now;
        this._tick(client, true);
      }
    }
  }

  public positions(): Record<string, number> {
    const positions: Record<string, number> = {};
    for (const client of this._clients.values()) {
      positions[client.name] = client.player.currentTime;
    }
    return positions;
  }

  /** Largest position gap between any two clients, seconds. */
  public maxPairwiseError(): number {
    const positions = Object.values(this.positions());
    return Math.max(...positions) - Math.min(...positions);
  }

  public commands(name: string, type?: PlayerCommand['type']): PlayerCommand[] {
    const commands = this._client(name).player.commands;
    return type === undefined
      ? [...commands]
      : commands.filter((c) => c.type === type);
  }

  public sent(name: string, type?: ClientMessage['t']): ClientMessage[] {
    const sent = this._client(name).sent;
    return type === undefined ? [...sent] : sent.filter((m) => m.t === type);
  }

  /** Stall reports this client has sent, in order. */
  public stallReports(name: string): boolean[] {
    const reports: boolean[] = [];
    for (const msg of this._client(name).sent) {
      if (msg.t === 'intent' && msg.intent.action === 'stall') {
        reports.push(msg.intent.on);
      }
    }
    return reports;
  }

  public view(name: string): EngineView {
    return this._client(name).engine.view();
  }

  public player(name: string): FakePlayer {
    return this._client(name).player;
  }

  private _tick(client: SimulatedClient, visible: boolean): void {
    const now = this._clientNow(client);
    const effects = client.engine.tick({
      now,
      visible,
      ...client.player.snapshot(now),
    });
    this._execute(client, effects);
  }

  private _execute(client: SimulatedClient, effects: Effect[]): void {
    for (const effect of effects) {
      if (effect.type === 'send') {
        this._send(client, effect.msg);
        continue;
      }

      const now = this._clientNow(client);
      const events = client.player.exec(effect.cmd, now);
      for (const event of events) {
        this._execute(client, client.engine.onPlayerEvent(event, now));
      }
    }
  }

  private _send(client: SimulatedClient, msg: ClientMessage): void {
    client.sent.push(msg);
    const connectionId = client.connectionId;
    if (connectionId === null) return;

    client.network.send(`${client.name}->server`, this.clock.now(), () => {
      this.server.receive(connectionId, msg);
    });
  }

  private _clientNow(client: SimulatedClient): number {
    return this.clock.now() + client.skewMs;
  }

  private _client(name: string): SimulatedClient {
    const client = this._clients.get(name);
    if (client === undefined) throw new Error(`unknown client ${name}`);
    return client;
  }
}
