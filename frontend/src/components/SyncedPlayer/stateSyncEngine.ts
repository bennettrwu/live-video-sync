import SyncedState from './shared/syncedState';
import SyncedClockClient from './syncedClock';

const WS_HEARTBEAT_INTERVAL = 1000;

export default class StateSyncEngine {
  private _ws: WebSocket | undefined;
  private _wsReconnectTimeout: NodeJS.Timeout | undefined;
  private _wsHeartbeatLoop: NodeJS.Timeout;

  private _clock: SyncedClockClient;
  private _syncState: SyncedState | undefined;

  private _isBuffering = false;

  constructor(private _roomId: string) {
    this._wsOpen = this._wsOpen.bind(this);
    this._wsClose = this._wsClose.bind(this);
    this._wsMessage = this._wsMessage.bind(this);

    this._clock = new SyncedClockClient();

    this._clock.once('synced', () => {
      this._syncState = new SyncedState(this._clock);
      this._connectSyncServer();
    });

    this._wsHeartbeatLoop = setInterval(() => {
      this._ws?.send(JSON.stringify({type: 'heartbeat'}));
    }, WS_HEARTBEAT_INTERVAL);
  }

  getTargetState() {
    const state = this._syncState?.getState();
    if (!state) return;

    const waiting = this._isBuffering ? false : state.bufferingCount > 0;
    const paused = waiting || state.paused;
    const videoTime = state.videoTime;
    return {waiting, paused, videoTime, mediaIndex: state.mediaIndex};
  }

  play() {
    console.log('Client play event');
    this._syncState?.play();
    this._ws?.send(JSON.stringify({type: 'play'}));
  }

  pause() {
    console.log('Client pause event');
    this._syncState?.pause();
    this._ws?.send(JSON.stringify({type: 'pause'}));
  }

  seek(videoTime: number) {
    console.log('Client seek event, videoTime:', videoTime);
    this._syncState?.seek(videoTime);
    this._ws?.send(JSON.stringify({type: 'seek', videoTime}));
  }

  startBuffering() {
    if (!this._isBuffering) {
      console.log('Client startBuffering event');
      this._isBuffering = true;
      this._syncState?.addBuffering();
      this._ws?.send(JSON.stringify({type: 'startBuffering'}));
    }
  }

  stopBuffering() {
    if (this._isBuffering) {
      console.log('Client stopBuffering event');
      this._isBuffering = false;
      this._syncState?.subBuffering();
      this._ws?.send(JSON.stringify({type: 'stopBuffering'}));
    }
  }

  setMediaIndex(index: number) {
    console.log('Client setMediaIndex event, index:', index);
    this._syncState?.setMediaIndex(index);
    this._ws?.send(JSON.stringify({type: 'setMediaIndex', mediaIndex: index}));
  }

  destroy() {
    this._clock.destroy();

    this._ws?.removeEventListener('open', this._wsOpen);
    this._ws?.removeEventListener('close', this._wsClose);
    this._ws?.removeEventListener('message', this._wsMessage);
    this._ws?.close();
    this._ws = undefined;

    clearTimeout(this._wsReconnectTimeout);
    clearTimeout(this._wsHeartbeatLoop);
  }

  private _wsOpen() {
    console.log('Connected to Sync Server');
  }

  private _wsClose() {
    console.log('Disconnected from Sync Server');

    this._ws = undefined;
    this._wsReconnectTimeout = setTimeout(this._connectSyncServer, 1000);
  }

  private _wsMessage(event: MessageEvent) {
    const data = event.data;
    const message = JSON.parse(data.toString());

    if (message.type === 'targetStateUpdate') {
      this._syncState?.setState({
        paused: message.paused,
        videoTime: message.videoTime,
        bufferingCount: message.bufferingCount,
        mediaIndex: message.mediaIndex,
        updateTime: message.updateTime,
      });
      console.log('Updated targetState', this._syncState?.getState());
    }
  }

  private _connectSyncServer() {
    this._ws = new WebSocket(`/roomSyncAPI/v1/${this._roomId}`);

    this._ws.addEventListener('open', this._wsOpen);
    this._ws.addEventListener('message', this._wsMessage);
    this._ws.addEventListener('close', this._wsClose);
  }
}
