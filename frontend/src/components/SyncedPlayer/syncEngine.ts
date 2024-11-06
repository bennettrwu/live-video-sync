import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import Player from 'video.js/dist/types/player';

const reconnect_timeout = 1_000;
const sync_loop_rate = 1_000;
const ignore_userevent_listners_timeout = 100;

type SyncEvents = {
  joined: () => unknown;
  // Todo: types for this
  mediaListUpdate: (mediaList: []) => unknown;
  mediaIndexUpdate: (index: number) => unknown;
};

export default class SyncEngine {
  private _destroyed = false;

  // Todo: Types for  this
  private _mediaList = [];

  private _videojsRef?: React.RefObject<HTMLDivElement>;
  private _playerRef?: React.RefObject<Player>;

  private _ws?: WebSocket;
  private _syncLoop: NodeJS.Timeout;

  private _events = new EventEmitter() as TypedEmitter<SyncEvents>;

  private _targetState = {
    time: 0,
    paused: true,
    syncTime: Date.now() / 1_000,
    mediaIndex: 0,
  };

  private _isReady: {[key: string]: boolean} = {};
  private _ready = true;
  private _ignore = false;

  private _joined = false;
  private _joinTimeout?: NodeJS.Timeout;

  get events() {
    return this._events;
  }
  get mediaIndex() {
    return this._targetState.mediaIndex;
  }

  constructor(roomId: string) {
    fetch(`/roomSyncAPI/v1/${roomId}/mediaList`)
      .then(response => response.json())
      .then(json => {
        // Todo: Types and validation for this
        this._mediaList = json;
        this._events.emit('mediaListUpdate', this._mediaList as []);
      });

    this._connectWebsocket(roomId);

    this._syncLoop = setInterval(() => {
      const time = this._playerRef?.current?.currentTime();
      if (typeof time === 'undefined') return;

      this._ignore = true;
      if (this._allReady()) {
        this._videojsRef?.current?.classList.remove('vjs-waiting');

        const targetTime = this._targetState.paused
          ? this._targetState.time
          : this._targetState.time + (Date.now() / 1_000 - this._targetState.syncTime);
        if (Math.abs(time - targetTime) > 1) {
          this._playerRef?.current?.currentTime(targetTime);

          this._targetState.paused
            ? this._playerRef?.current?.pause()
            : this._playerRef?.current?.play();
        }
      } else {
        // Fake buffering
        this._playerRef?.current?.pause();
        this._videojsRef?.current?.classList.add('vjs-waiting');
      }

      setTimeout(() => (this._ignore = false), ignore_userevent_listners_timeout);
    }, sync_loop_rate);
  }

  private _allReady() {
    if (!this._ready) return false;

    for (const value of Object.values(this._isReady)) {
      if (!value) {
        console.log(value);
        return false;
      }
    }
    return true;
  }

  private _connectWebsocket(roomId: string) {
    if (this._destroyed) return;

    if (this._joinTimeout) clearTimeout(this._joinTimeout);
    this._joinTimeout = setTimeout(() => {
      this._joined = true;
      console.log(`Joined! State: ${JSON.stringify(this._targetState)}`);
      this._events.emit('joined');
    }, 1_000);

    this._ws = new WebSocket(`/roomSyncAPI/v1/${roomId}`);

    this._ws.addEventListener('error', err => console.error(err));

    this._ws.addEventListener('close', e => {
      console.log('Websocket closed', e);
      this._joined = false;
      setTimeout(() => this._connectWebsocket(roomId), reconnect_timeout);
    });

    this._ws.addEventListener('open', e => console.log('Websocket opened', e));

    this._ws.addEventListener('message', msg => {
      try {
        const message = JSON.parse(msg.data);

        console.log(`Received State ${JSON.stringify(message)}`);

        if (message.type === 'join') {
          this._isReady[message.uuid] = false;
          if (this._joined) {
            this._pushStateUpdate();
          }
          if (this._ready) {
            this._ws?.send(JSON.stringify({type: 'ready'}));
          }
        }
        if (message.type === 'leave') {
          delete this._isReady[message.uuid];
        }
        if (message.type === 'ready') {
          this._isReady[message.uuid] = true;
        }
        if (message.type === 'unready') {
          this._isReady[message.uuid] = false;
        }
        if (message.type === 'state') {
          if (this._targetState.mediaIndex !== message.mediaIndex) {
            this._events.emit('mediaIndexUpdate', message.mediaIndex);
          }

          this._targetState = message;
        }
      } catch (error) {
        console.error(error);
      }
    });
  }

  private _pushStateUpdate() {
    if (this._ignore) return;

    const paused = this._playerRef?.current?.paused();
    const time = this._playerRef?.current?.currentTime();
    if (typeof paused !== 'boolean' || typeof time !== 'number') return;

    // Todo: Wrap send and stringfy into new send method for type checking message
    this._ws?.send(
      JSON.stringify({
        type: 'state',
        time,
        paused,
        mediaIndex: this._targetState.mediaIndex,
      })
    );
  }

  private _onReady() {
    this._ws?.send(JSON.stringify({type: 'ready'}));
    this._ready = true;
  }

  private _onUnready() {
    this._ws?.send(JSON.stringify({type: 'unready'}));
    this._ready = false;
  }

  private _registerUserEventListeners() {
    this._playerRef?.current?.on('play', this._pushStateUpdate.bind(this));
    this._playerRef?.current?.on('pause', this._pushStateUpdate.bind(this));
    this._playerRef?.current?.on('seeking', this._pushStateUpdate.bind(this));
  }

  private _unregisterPlayerListeners() {
    this._playerRef?.current?.off('play', this._pushStateUpdate);
    this._playerRef?.current?.off('pause', this._pushStateUpdate);
    this._playerRef?.current?.off('seeking', this._pushStateUpdate);
    this._playerRef?.current?.off('canplay', this._onReady);
    this._playerRef?.current?.off('waiting', this._onUnready);
  }

  registerPlayerRef(
    videojsRef: React.RefObject<HTMLDivElement>,
    playerRef: React.RefObject<Player>
  ) {
    this._videojsRef = videojsRef;
    this._playerRef = playerRef;

    this._playerRef?.current?.on('canplay', this._onReady.bind(this));
    this._playerRef?.current?.on('waiting', this._onUnready.bind(this));
    this._events.removeListener('joined', this._registerUserEventListeners);
    if (this._joined) {
      this._registerUserEventListeners();
    } else {
      this._events.once('joined', this._registerUserEventListeners.bind(this));
    }
  }

  setMediaIndex(index: number) {
    this._targetState = {
      time: 0,
      paused: true,
      syncTime: Date.now(),
      mediaIndex: index,
    };
    this._pushStateUpdate();
    this._events.emit('mediaIndexUpdate', index);
  }

  destroy() {
    this._events.removeAllListeners();
    this._destroyed = true;
    this._ws?.close();
    this._unregisterPlayerListeners();
    clearTimeout(this._syncLoop);
  }
}
