rm single_track.mkv subtitles.vtt
rm -rf $2
mkdir $2


set -e

# Create single track file using video stream 0, audio stream 0, subtitle stream 0
ffmpeg -i $1 -map 0:v:0 -map 0:a:0 -map 0:s:0 -c copy single_track.mkv

# Assuming input video is h264 and audio is aac
# -c:s webvtt because hls requires webvtt subtitles
# -muxdelay 0 to ensure ffmpeg doesn't add subtitle offset
ffmpeg -i single_track.mkv \
    -map 0:v:0 -map 0:a:0 -map 0:s:0 \
    -c:v copy -c:a copy -c:s webvtt \
    -var_stream_map "v:0,a:0,s:0" \
    -hls_playlist_type vod \
    -hls_time 6 \
    -muxdelay 0 \
    -master_pl_name master.m3u8 \
    -f hls $2/stream_%v.m3u8

echo '#EXTM3U

#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID=subs,NAME=English,LANGUAGE=en,AUTOSELECT=YES,DEFAULT=YES,URI=./stream_0_vtt.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=8000000,CODECS=avc1.640029,mp4a.40.2,SUBTITLES=subs
stream_0.m3u8

' > $2/master.m3u8

# If need to reencode
#ffmpeg -i single_track.mkv \
#    -map 0:v:0 -map 0:a:0 -map 0:s:0 \
#    -c:v h264 -c:a aac -c:s webvtt \
#    -var_stream_map "v:0,a:0,s:0" \
#    -hls_playlist_type vod \
#    -hls_time 6 \
#    -muxdelay 0 \
#    -master_pl_name master.m3u8 \
#    -f hls $2/video_%v.m3u8
