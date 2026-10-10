#!/usr/bin/env bash
# Downloads a short open-license clip, loops it to ~30 s, and packages it as HLS
# for the e2e suite.
# Big Buck Bunny, Blender Foundation, CC-BY 3.0: https://peach.blender.org
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../fixtures/media/bbb"
src_url="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4"

if [ -f "$out/master.m3u8" ]; then
  echo "fixture present: $out"
  exit 0
fi

command -v ffmpeg >/dev/null || { echo "ffmpeg is required to build the e2e media fixture" >&2; exit 1; }

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$src_url" -o "$tmp/clip.mp4"

printf "file '%s'\n" "$tmp/clip.mp4" "$tmp/clip.mp4" "$tmp/clip.mp4" > "$tmp/list.txt"

mkdir -p "$out"
ffmpeg -loglevel error -y -f concat -safe 0 -i "$tmp/list.txt" \
  -c:v copy -c:a aac -ac 2 \
  -hls_time 2 -hls_playlist_type vod \
  -hls_segment_filename "$out/seg_%03d.ts" \
  "$out/master.m3u8"

echo "fixture built: $out"
