import EventEmitter from 'events';
import StateSyncronizer from './stateSynchronizer';
import VideoPlayerWrapper from './videoPlayerWrapper';

export type MediaList = Array<{
  name: string;
  video: string;
  index: number;
}>;
const VIDEO_SYNC_INTERVAL = 100;

/**
 * SyncEngine
 *
 * Handles mantaining state synchronization between StateSynchronizer and video
 * // TODO: Bunch of Error handling
 */
export default class SyncEngine extends EventEmitter {
  private _mediaList: MediaList = [];

  private _stateSync: StateSyncronizer | undefined;
  private _videoWrapper: VideoPlayerWrapper;

  private _syncLoop: NodeJS.Timeout;

  private _sentStartWaiting = false;
  private _mediaIndex = 0;

  constructor(
    private _roomId: string,
    videoRef: React.RefObject<HTMLVideoElement>
  ) {
    super();

    this._syncLoopIteration = this._syncLoopIteration.bind(this);

    this._fetchMediaList();

    this.once('updateMediaList', () => {
      this._stateSync = new StateSyncronizer(this._roomId);
    });

    // Init video interface
    this._videoWrapper = new VideoPlayerWrapper(videoRef);
    this._videoWrapper.on('play', () => {
      this._stateSync?.play();
    });
    this._videoWrapper.on('pause', () => {
      this._stateSync?.pause();
    });
    this._videoWrapper.on('seek', state => {
      this._stateSync?.seek(state.currentTime);
    });
    this._videoWrapper.on('startBuffering', () => {
      this._stateSync?.startBuffering();
    });
    this._videoWrapper.on('stopBuffering', () => {
      this._stateSync?.stopBuffering();
    });

    // Init sync loop
    this._syncLoop = setTimeout(this._syncLoopIteration, VIDEO_SYNC_INTERVAL);
  }

  setMediaIndex(index: number) {
    // TODO: Bounds checking
    this._stateSync?.setMediaIndex(index);
    this._silentSetMediaIndex(index);
  }

  private _silentSetMediaIndex(index: number) {
    this._mediaIndex = index;
    this._videoWrapper.setVideoSource(this._mediaList[this._mediaIndex].video);
    this.emit('updateMediaList', this._mediaList, this._mediaIndex);
  }

  destroy() {
    this._stateSync?.destroy();
    this._videoWrapper.destroy();

    clearTimeout(this._syncLoop);

    this.removeAllListeners();
  }

  private _fetchMediaList() {
    fetch(`/roomSyncAPI/v1/${this._roomId}/mediaList`)
      .then(response => response.json())
      .then(json => {
        // Todo: Type check for this
        this._mediaList = json;
        this._silentSetMediaIndex(this._mediaIndex);
        this.emit('updateMediaList', this._mediaList, this._mediaIndex);
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

    const currentState = this._videoWrapper.getCurrentState();
    if (!currentState) return;

    const targetState = this._stateSync?.getTargetState();
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
        this._videoWrapper.silentPause();
      } else {
        this._videoWrapper.silentPlay();
      }
    }

    if (Math.abs(currentState.currentTime - targetState.videoTime) > 0.5) {
      this._videoWrapper.silentSeek(targetState.videoTime);
    }
  }
}
