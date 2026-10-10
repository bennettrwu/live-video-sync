# Live Video Sync

Watch an HLS video in sync with other people, each in their own browser.

This repository is an npm workspace; see `docs/design-spec.md` for the design.
`deploy/data/media/convert-to-hls.sh` turns an mkv/mp4 into the HLS folder the player expects, next to where the media lives.

| Workspace                   | What it is                                                        |
| --------------------------- | ----------------------------------------------------------------- |
| `packages/sync-protocol`    | WebSocket protocol: TypeBox schemas, `PlaybackState`, room reducer |
| `packages/sync-engine`      | Sans-I/O client sync engine, policies, and test fakes             |
| `packages/fastify-platform` | Fastify boilerplate: logging, request ids, validation, DI, ws     |
| `apps/sync-server`          | Room sync server                                                  |
| `apps/frontend`             | Vite + React + Mantine player                                     |
| `e2e`                       | Playwright suite: real server, built frontend, two browsers       |

## Commands

```sh
npm install
npm run dev         # server + web with hot reload
npm run typecheck   # tsc --build across all workspaces
npm run lint
npm run format
npm run test:unit
npm run test:integration
npm run test:e2e      # Playwright; needs ffmpeg and `npx playwright install chromium` once
npm run build
```

Dev: `npm run dev` starts the sync-server on 8080 (with `apps/sync-server/rooms/demo.json`)
and the frontend on 3000. Open http://localhost:3000, enter code `demo` and a name.

Deploy: see `deploy/README.md`.

Each workspace has the same scripts, so `npm run test:unit --workspace packages/sync-engine` works too.
