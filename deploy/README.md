# Deploying

Two containers: `sync-server` (node) and `frontend` (nginx serving the built
app, the HLS media, and proxying `/api` to the sync-server). The frontend
listens on `127.0.0.1:8000`; put your existing reverse proxy (with Cloudflare
Zero Trust in front) on that port.

```sh
mkdir -p deploy/data/rooms deploy/data/media
cp apps/sync-server/rooms/demo.json deploy/data/rooms/
docker compose -f deploy/compose.yml up -d --build
```

Add a room: write `deploy/data/rooms/<code>.json` (see
`packages/sync-protocol` `RoomDefinitionSchema`). It is read on first join.
Add media: copy an HLS folder into `deploy/data/media/<name>/` and reference
`/media/<name>/master.m3u8` from a room file. `deploy/data/media/convert-to-hls.sh` produces such a folder from an mkv/mp4; run
it from inside `deploy/data/media/` so the output lands beside the other media.
