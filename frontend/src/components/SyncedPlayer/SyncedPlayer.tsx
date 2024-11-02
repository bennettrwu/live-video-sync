import {VideoPlayer} from './VideoPlayer';

// import video_url from '/frieren/video.m3u8?url';
// import sub_url from '/frieren/subtitles.vtt?url';
// import thumbnail_url from '/frieren/thumbnail.png?url';
import {useEffect, useState} from 'react';
import SyncEngine from './syncEngine';
import {Button} from '@mantine/core';

import './SyncedPlayer.scss';

const roomId = 'test-room';

export default function SyncedPlayer() {
  const [syncEngine, setSyncEngine] = useState<SyncEngine | undefined>();
  const [mediaList, setMediaList] = useState<
    Array<{
      name: string;
      video: {src: string; type: string};
      subtitles?: {src: string; langugage: string; label: string};
      index: number;
    }>
  >([]);
  const [mediaIndex, setMediaIndex] = useState(0);

  useEffect(() => {
    const engine = new SyncEngine(roomId);
    setSyncEngine(engine);
    engine.events.on('mediaListUpdate', mediaList => {
      console.log(mediaList);
      setMediaList(mediaList);
    });
    engine.events.on('mediaIndexUpdate', index => {
      setMediaIndex(index);
    });
    return () => engine.destroy();
  }, [setSyncEngine]);

  return (
    <>
      {mediaList.length > 0 && (
        <VideoPlayer
          key={mediaIndex}
          video={mediaList[mediaIndex].video}
          subtitles={mediaList[mediaIndex].subtitles}
          syncEngine={syncEngine}
        />
      )}
      <div className="media-list">
        {mediaList.map(({name, index}) => (
          <Button
            className="media-list-element"
            fullWidth={true}
            onClick={() => {
              syncEngine?.setMediaIndex(index);
            }}
            disabled={index === mediaIndex}
          >
            {name}
          </Button>
        ))}
      </div>
    </>
  );
}
