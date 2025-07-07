import {Button} from '@mantine/core';
import {useEffect, useRef, useState} from 'react';
import SyncEngine, {type MediaList} from './syncEngine/syncEngine';

import './SyncedPlayer.scss';

export default function SyncedPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaList, setMediaList] = useState<MediaList>([]);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [syncEngine, setSyncEngine] = useState<SyncEngine>();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const engine = new SyncEngine('roomid', videoRef);
    setSyncEngine(engine);

    engine.on('updateMediaList', (mediaList, mediaIndex) => {
      setMediaList(mediaList);
      setMediaIndex(mediaIndex);
    });

    engine.on('startWaiting', () => {
      setWaiting(true);
    });
    engine.on('stopWaiting', () => {
      setWaiting(false);
    });

    return () => engine.destroy();
  }, []);

  return (
    <>
      <div style={{position: 'relative'}}>
        <div
          style={{
            display: waiting ? 'block' : 'none',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'black',
            opacity: 0.5,
          }}
        >
          <p>Waiting for somebody else's video to load.</p>
        </div>
        <video
          style={{width: '100%'}}
          ref={videoRef}
          controls
          muted={true}
          autoPlay={false}
          controlsList="noplaybackrate"
        />
      </div>

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
