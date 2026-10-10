# Rooms

One JSON file per room, named `<code>.json`, matching `RoomDefinitionSchema`
from `@live-video-sync/sync-protocol`. The code must be letters, digits, and
dashes. Point `ROOMS_DIR` at this directory (the default is `./rooms`).

Media URLs are HLS playlists. Site-relative URLs under `/media/` are served
from `MEDIA_DIR` in development and by nginx in production.

`demo.json` streams Big Buck Bunny and Tears of Steel, both by the Blender
Foundation under CC BY 3.0, from the public hls.js test stream host.
