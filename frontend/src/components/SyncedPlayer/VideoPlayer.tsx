import {FC, useEffect, useRef} from 'react';
import {Box, BoxProps} from '@mantine/core';
import videojs from 'video.js';
import Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import SyncEngine from './syncEngine';

interface VideoPlayerProps extends BoxProps {
  thumbnailUrl?: string;
  video: {src: string; type: string};
  subtitles?: {src: string; langugage: string; label: string};
  syncEngine?: SyncEngine;
}

// Hack around issue where Player does not have types for subtitle track settings
type PlayerExtended = {
  textTrackSettings: {
    setValues: (arg: unknown) => unknown;
    updateDisplay: () => unknown;
  };
} & Player;

export const VideoPlayer: FC<VideoPlayerProps> = ({
  thumbnailUrl,
  video,
  subtitles,
  syncEngine,
  ...props
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<PlayerExtended | null>(null);

  useEffect(() => {
    if (!playerRef.current && videoRef.current) {
      const videoElement = document.createElement('video-js');

      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      playerRef.current = videojs(videoElement, {
        controls: true,
        fluid: true,
        autoplay: true,
        muted: true,
        playsinline: true,
        sources: [video],
        tracks: subtitles
          ? [
              {
                kind: 'subtitles',
                src: subtitles?.src,
                srclang: subtitles?.langugage,
                label: subtitles?.label,
                backgroundOpacity: 1,
                default: true,
              },
            ]
          : [],
        poster: thumbnailUrl,
      }) as unknown as PlayerExtended;
    }

    // Default to semi-transparent subtitles background
    playerRef.current?.textTrackSettings.setValues({
      backgroundOpacity: '0.5',
    });
    playerRef.current?.textTrackSettings.updateDisplay();

    // videoRef.current?.classList.add('vjs-waiting');
    // setTimeout(() => videoRef.current?.classList.remove('vjs-waiting'), 1000);
    syncEngine?.registerPlayerRef(videoRef, playerRef);
  }, [syncEngine, subtitles, video, thumbnailUrl]);

  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <Box data-vjs-player {...props}>
      <Box ref={videoRef} />
    </Box>
  );
};
