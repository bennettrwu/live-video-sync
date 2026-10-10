# E2E fixtures

`rooms/` is the rooms directory the sync-server is started with.

`media/` is generated, not committed: `npm run fixtures --workspace e2e` downloads
a 10-second Big Buck Bunny clip, loops it to 30 seconds, (Blender Foundation, CC-BY 3.0,
https://peach.blender.org) and packages it as HLS with ffmpeg. The Playwright
config runs this automatically before the suite.
