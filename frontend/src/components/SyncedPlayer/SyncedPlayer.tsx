import {Button, Group} from '@mantine/core';
import {useEffect, useRef, useState} from 'react';
import SyncEngine, {type MediaList} from './syncEngine';
import SilencedVideoPlayerInterface from './silencedVideoPlayerInterface';

const VIDEO_URL = './frieren28/video.m3u8';

export default function SyncedPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaList, setMediaList] = useState<MediaList>([]);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [syncEngine, setSyncEngine] = useState<SyncEngine>();

  useEffect(() => {
    const engine = new SyncEngine('roomid', videoRef);
    setSyncEngine(engine);
    engine.on('updateMediaList', (mediaList, mediaIndex) => {
      setMediaList(mediaList);
      setMediaIndex(mediaIndex);
    });
    return () => {
      engine.destroy();
    };
  }, []);

  return (
    <>
      <video
        style={{width: '100%'}}
        ref={videoRef}
        controls
        src={VIDEO_URL}
        muted={true}
        autoPlay={true}
      />
      <div className="media-list">
        {mediaList.map(({name, index}) => (
          <Button
            key={index}
            className="media-list-element"
            fullWidth={true}
            onClick={() => {
              setMediaIndex(index);
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
