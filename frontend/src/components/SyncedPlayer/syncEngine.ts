import EventEmitter from 'events';
import SilencedVideoPlayerInterface from './silencedVideoPlayerInterface';

export type MediaList = Array<{
  name: string;
  video: string;
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

  private _sentStartWaiting = false;

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
      console.log('play', state);
      this._targetStateUpdate(state);
    });
    this._videoInterface.on('pause', state => {
      console.log('pause', state);
      this._targetStateUpdate(state);
    });
    this._videoInterface.on('seek', state => {
      console.log('seek', state);
      this._targetStateUpdate(state);
    });

    // Init sync loop
    this._syncLoop = setTimeout(this._syncLoopIteration, 100);
  }

  setMediaIndex(index: number) {
    console.log(`syncEngine.setMediaIndex(${index})`);
    // TODO: Bounds checking
    this._targetState.currentTime = 0;
    this._targetState.mediaIndex = index;
    this._silentSetMediaIndex(index);
    this._targetStateUpdate(this._targetState);
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
        this._silentSetMediaIndex(this._targetState.mediaIndex);
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
    console.log(`syncEngine._wsMessage(${event.data.toString()})`);

    const data = event.data;

    const message = JSON.parse(data.toString());
    console.log('ws message', message);

    if (message.type === 'leave') {
      delete this._roomBufferStatus[message.uuid];
    } else if (message.type === 'startBuffering') {
      this._roomBufferStatus[message.uuid] = true;
    } else if (message.type === 'stopBuffering') {
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
    paused: boolean;
    mediaIndex: number;
    currentTime: number;
  }) {
    console.log(`syncEngine._targetStateUpdate(${JSON.stringify(state)})`);

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

  private _silentSetMediaIndex(index: number) {
    console.log(`syncEngine._silentSetMediaIndex(${index})`);
    // TODO: Bounds checking
    this._videoInterface.setVideoSource(this._mediaList[index].video);
    this.emit('updateMediaList', this._mediaList, index);
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
    this._ws.send(JSON.stringify({type: 'stopBuffering'}));
  }

  private _startWaiting() {
    console.log('syncEngine._startWaiting()');

    if (this._sentStartWaiting) return;
    this._sentStartWaiting = true;
    this.emit('startWaiting');
  }

  private _stopWaiting() {
    console.log('syncEngine._stopWaiting()');

    if (!this._sentStartWaiting) return;
    this._sentStartWaiting = false;
    this.emit('stopWaiting');
  }

  private _syncLoopIteration() {
    console.log('syncEngine._syncLoopIteration()');
    this._syncLoop = setTimeout(this._syncLoopIteration, 100);

    const currentState = this._videoInterface.getCurrentState();
    if (!currentState) return;

    const targetTime = this._targetState.paused
      ? this._targetState.currentTime
      : (Date.now() - this._targetState.updateTime) / 1000 +
        this._targetState.currentTime;
    const syncDelta = currentState.currentTime - targetTime;

    // Check if others are buffering
    for (const uuid in this._roomBufferStatus) {
      if (this._roomBufferStatus[uuid]) {
        // if so, fake buffering
        if (!currentState.paused) {
          this._videoInterface.silentPause();
        }
        this._startWaiting();
        return;
      }
    }
    this._stopWaiting();

    // If target is paused, ensure player matches
    if (this._targetState.paused) {
      if (!currentState.paused) {
        this._videoInterface.silentPause();
      }

      if (Math.abs(syncDelta) > 0.5) {
        this._videoInterface.silentSeek(targetTime);
      }
      return;
    }

    // If video is currently buffering and out of sync, send buffering message
    if (currentState.buffering) {
      if (syncDelta < -1) {
        this._startBuffering();
      }
      return;
    } else {
      // Back in sync
      this._stopBuffering();
    }

    // If target is not paused, ensure player matches
    if (currentState.paused) {
      this._videoInterface.silentPlay();
    }

    if (Math.abs(syncDelta) > 0.5) {
      this._videoInterface.silentSeek(targetTime);
      return;
    }
  }
}
