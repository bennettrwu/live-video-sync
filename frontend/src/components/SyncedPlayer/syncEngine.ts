import EventEmitter from 'events';
import SilencedVideoPlayerInterface from './silencedVideoPlayerInterface';

export type MediaList = Array<{
  name: string;
  video: {src: string; type: string};
  subtitles?: {src: string; langugage: string; label: string};
  thumbnailUrl?: string;
  index: number;
}>;

const ROOM_SYNC_API_BASE = '/roomSyncAPI/v1';
// TODO: Bunch of Error handling
export default class SyncEngine extends EventEmitter {
  private _roomId: string;
  private _mediaList: MediaList = [];

  private _ws: WebSocket;
  private _wsReconnectTimeout: NodeJS.Timeout | undefined = undefined;
  private _wsHeartbeatLoop: NodeJS.Timeout | undefined = undefined;
  private _wsSentStartBuffer = false;

  private _videoInterface: SilencedVideoPlayerInterface;

  private _syncLoop: NodeJS.Timeout;
  private _targetState = {
    paused: true,
    currentTime: 0,
    mediaIndex: 0,
    updateTime: Date.now(),
  };
  private _roomBufferStatus: {[key: string]: boolean} = {};

  constructor(roomId: string, videoRef: React.RefObject<HTMLVideoElement>) {
    super();
    console.log('SyncEngine.constructor()');

    this._syncLoopIteration = this._syncLoopIteration.bind(this);
    this._wsClose = this._wsClose.bind(this);
    this._wsOpen = this._wsOpen.bind(this);
    this._wsMessage = this._wsMessage.bind(this);

    // Fetch media
    this._roomId = roomId;
    this._fetchMediaList();

    this._ws = this._connectSyncServer();

    // Init video interface
    this._videoInterface = new SilencedVideoPlayerInterface(videoRef);
    this._videoInterface.on('play', state => {
      console.log('play');
      this._targetStateUpdate(state);
    });
    this._videoInterface.on('pause', state => {
      console.log('pause');
      this._targetStateUpdate(state);
    });
    this._videoInterface.on('seek', state => {
      console.log('seek');
      this._targetStateUpdate(state);
    });

    // Init sync loop
    this._syncLoop = setTimeout(this._syncLoopIteration, 100);
  }

  private _silentSetMediaIndex(index: number) {
    console.log('syncEngine._silentSetMediaIndex()');
    // TODO: Bounds checking
    this._targetState.currentTime = 0;
    this._targetState.updateTime = Date.now();
    this._targetState.mediaIndex = index;
    this._videoInterface.setVideoSource(this._mediaList[index].video.src);
    this.emit('updateMediaList', this._mediaList, this._targetState.mediaIndex);
  }

  setMediaIndex(index: number) {
    console.log('syncEngine.setMediaIndex()');
    // TODO: Bounds checking
    this._silentSetMediaIndex(index);
    this._targetStateUpdate({mediaIndex: index});
  }

  destroy() {
    console.log('syncEngine.destroy()');

    clearTimeout(this._wsReconnectTimeout);
    clearInterval(this._wsHeartbeatLoop);
    this._ws.removeEventListener('open', this._wsOpen);
    this._ws.removeEventListener('close', this._wsClose);
    this._ws.removeEventListener('message', this._wsMessage);
    this._ws.close();

    this._videoInterface.destroy();

    clearTimeout(this._syncLoop);

    this.removeAllListeners();
  }

  private _fetchMediaList() {
    console.log('syncEngine._fetchMediaList()');

    fetch(`/roomSyncAPI/v1/${this._roomId}/mediaList`)
      .then(response => response.json())
      .then(json => {
        // Todo: Type check for this
        this._mediaList = json;
        this.setMediaIndex(this._targetState.mediaIndex);
        this.emit(
          'updateMediaList',
          this._mediaList,
          this._targetState.mediaIndex
        );
      });
  }

  private _wsOpen() {
    console.log('syncEngine._wsOpen()');

    this._wsHeartbeatLoop = setInterval(() => {
      this._ws.send(JSON.stringify({type: 'heartbeat'}));
    }, 5000);
  }

  private _wsClose() {
    console.log('syncEngine._wsClose()');

    clearInterval(this._wsHeartbeatLoop);
    this._wsReconnectTimeout = setTimeout(() => {
      this._ws = this._connectSyncServer();
    }, 3000);
  }

  private _wsMessage(event: MessageEvent) {
    console.log('syncEngine._wsMessage()');

    const data = event.data;

    const message = JSON.parse(data.toString());
    console.log('ws message', message);

    if (message.type === 'join') {
      this._roomBufferStatus[message.uuid] = false;
    } else if (message.type === 'leave') {
      delete this._roomBufferStatus[message.uuid];
    } else if (message.type === 'startBuffering') {
      this._roomBufferStatus[message.uuid] = true;
    } else if (message.type === 'endBuffering') {
      this._roomBufferStatus[message.uuid] = false;
    } else if (message.type === 'targetStateUpdate') {
      if (this._targetState.mediaIndex !== message.mediaIndex) {
        this._silentSetMediaIndex(message.mediaIndex);
      }
      this._targetState.updateTime = Date.now();
      this._targetState.paused = message.paused;
      this._targetState.mediaIndex = message.mediaIndex;
      this._targetState.currentTime = message.currentTime;
    }
  }

  private _connectSyncServer() {
    console.log('syncEngine._connectSyncServer()');

    this._ws = new WebSocket(`${ROOM_SYNC_API_BASE}/${this._roomId}`);

    this._ws.addEventListener('open', this._wsOpen);
    this._ws.addEventListener('message', this._wsMessage);
    this._ws.addEventListener('close', this._wsClose);

    return this._ws;
  }

  private _targetStateUpdate(state: {
    paused?: boolean;
    mediaIndex?: number;
    currentTime?: number;
  }) {
    console.log('syncEngine._targetStateUpdate()');

    Object.assign(this._targetState, state);
    this._targetState.updateTime = Date.now();

    this._ws.send(
      JSON.stringify({
        type: 'targetStateUpdate',
        paused: this._targetState.paused,
        mediaIndex: this._targetState.mediaIndex,
        currentTime: this._targetState.currentTime,
      })
    );
  }

  private _startBuffering() {
    console.log('syncEngine._startBuffering()');

    if (this._wsSentStartBuffer) return;
    this._wsSentStartBuffer = true;
    this._ws.send(JSON.stringify({type: 'startBuffering'}));
  }

  private _stopBuffering() {
    console.log('syncEngine._stopBuffering()');

    if (!this._wsSentStartBuffer) return;
    this._wsSentStartBuffer = false;
    this._ws.send(JSON.stringify({type: '_stopBuffering'}));
  }

  private _syncLoopIteration() {
    console.log('syncEngine._syncLoopIteration()');
    this._syncLoop = setTimeout(this._syncLoopIteration, 100);

    const targetTime = this._targetState.paused
      ? this._targetState.currentTime
      : (Date.now() - this._targetState.updateTime) / 1000 +
        this._targetState.currentTime;

    const currentState = this._videoInterface.getCurrentState();
    if (!currentState) return;
    const syncDelta = currentState.currentTime - targetTime;

    console.log('target', this._targetState);
    console.log('current', currentState);

    if (this._targetState.paused) {
      if (!currentState.paused) {
        this._videoInterface.silentPause();
      }

      if (Math.abs(syncDelta) > 0.5) {
        this._videoInterface.silentSeek(targetTime);
      }
      return;
    }

    if (currentState.paused) {
      this._videoInterface.silentPlay();
    }

    if (Math.abs(syncDelta) > 0.5) {
      this._videoInterface.silentSeek(targetTime);
      return;
    }

    if (currentState.buffering && syncDelta < 0.5) {
      this._startBuffering();
    } else if (Math.abs(syncDelta) < 0.5) {
      this._stopBuffering();
    }
  }
}
