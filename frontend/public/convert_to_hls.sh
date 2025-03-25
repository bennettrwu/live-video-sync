rm single_track.mkv subtitles.vtt
rm -rf $2
mkdir $2


set -e

# Create single track file using video stream 0, audio stream 0, subtitle stream 0
ffmpeg -i $1 -map 0:v:0 -map 0:a:0 -map 0:s:0 -c copy single_track.mkv

# Extract subtitles
ffmpeg -i single_track.mkv -f webvtt $2/subtitles.vtt

# Assuming supported video codec
ffmpeg -i single_track.mkv -c:v copy -c:a copy -sn -hls_list_size 0 -f hls $2/video.m3u8

# If reencoding is needed
# ffmpeg -i input.mkv -sn -hls_list_size 0 -f hls  $2/video.m3u8

ffmpeg -i $1 -ss 00:00:01.000 -vframes 1 $2/thumbnail.png




