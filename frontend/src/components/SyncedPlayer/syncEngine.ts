import EventEmitter from 'events';
import SilencedVideoPlayerInterface from './silencedVideoPlayerInterface';
import StateSyncEngine from './stateSyncEngine';

export type MediaList = Array<{
  name: string;
  video: string;
  index: number;
}>;
const VIDEO_SYNC_INTERVAL = 100;

// TODO: Bunch of Error handling
export default class SyncEngine extends EventEmitter {
  private _mediaList: MediaList = [];

  private _stateSyncEngine: StateSyncEngine | undefined;
  private _videoInterface: SilencedVideoPlayerInterface;

  private _syncLoop: NodeJS.Timeout;

  private _sentStartWaiting = false;
  private _mediaIndex = 0;

  constructor(
    private _roomId: string,
    videoRef: React.RefObject<HTMLVideoElement>
  ) {
    super();
    console.log('SyncEngine.constructor()');

    this._syncLoopIteration = this._syncLoopIteration.bind(this);

    this._fetchMediaList();

    this.once('updateMediaList', () => {
      this._stateSyncEngine = new StateSyncEngine(this._roomId);
    });

    // Init video interface
    this._videoInterface = new SilencedVideoPlayerInterface(videoRef);
    this._videoInterface.on('play', () => {
      console.log('play');
      this._stateSyncEngine?.play();
    });
    this._videoInterface.on('pause', () => {
      console.log('pause');
      this._stateSyncEngine?.pause();
    });
    this._videoInterface.on('seek', state => {
      console.log('seek');
      this._stateSyncEngine?.seek(state.currentTime);
    });
    this._videoInterface.on('startBuffering', () => {
      console.log('startBuffering');
      this._stateSyncEngine?.startBuffering();
    });
    this._videoInterface.on('stopBuffering', () => {
      console.log('stopBuffering');
      this._stateSyncEngine?.stopBuffering();
    });

    // Init sync loop
    this._syncLoop = setTimeout(this._syncLoopIteration, VIDEO_SYNC_INTERVAL);
  }

  setMediaIndex(index: number) {
    console.log(`syncEngine.setMediaIndex(${index})`);
    // TODO: Bounds checking
    this._stateSyncEngine?.setMediaIndex(index);
    this._silentSetMediaIndex(index);
  }

  private _silentSetMediaIndex(index: number) {
    this._mediaIndex = index;
    this._videoInterface.setVideoSource(
      this._mediaList[this._mediaIndex].video
    );
    this.emit('updateMediaList', this._mediaList, this._mediaIndex);
  }

  destroy() {
    this._stateSyncEngine?.destroy();
    this._videoInterface.destroy();

    clearTimeout(this._syncLoop);

    this.removeAllListeners();
  }

  private _fetchMediaList() {
    fetch(`/roomSyncAPI/v1/${this._roomId}/mediaList`)
      .then(response => response.json())
      .then(json => {
        // Todo: Type check for this
        this._mediaList = json;
        this._silentSetMediaIndex(0);
        this.emit('updateMediaList', this._mediaList, 0);
      });
  }

  private _startWaiting() {
    if (this._sentStartWaiting) return;
    this._sentStartWaiting = true;
    this.emit('startWaiting');
  }

  private _stopWaiting() {
    if (!this._sentStartWaiting) return;
    this._sentStartWaiting = false;
    this.emit('stopWaiting');
  }

  private _syncLoopIteration() {
    this._syncLoop = setTimeout(this._syncLoopIteration, VIDEO_SYNC_INTERVAL);

    const currentState = this._videoInterface.getCurrentState();
    if (!currentState) return;

    const targetState = this._stateSyncEngine?.getTargetState();
    if (!targetState) return;

    if (targetState.mediaIndex !== this._mediaIndex) {
      this._silentSetMediaIndex(targetState.mediaIndex);
    }

    if (targetState.waiting) {
      this._startWaiting();
    } else {
      this._stopWaiting();
    }

    if (targetState.paused !== currentState.paused) {
      if (targetState.paused) {
        this._videoInterface.silentPause();
      } else {
        this._videoInterface.silentPlay();
      }
    }

    if (Math.abs(currentState.currentTime - targetState.videoTime) > 0.5) {
      this._videoInterface.silentSeek(targetState.videoTime);
    }
  }
}
