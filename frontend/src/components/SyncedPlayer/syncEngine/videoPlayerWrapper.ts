import Hls from 'hls.js';
import EventEmitter from 'events';

/**
 * VideoPlayerWrapper
 *
 * Enables modifying video player silently (without triggering events)
 * Allows for the differentiation between user iteraction (triggers events) and SyncEngine actions (no events)
 * // TODO: Bunch of error handling
 */
export default class VideoPlayerWrapper extends EventEmitter {
  private _video: HTMLVideoElement | null = null;
  private _buffering = false;
  private _hls: Hls;
  private _playIgnoreCount = 0;
  private _pauseIgnoreCount = 0;
  private _seekingIgnoreCount = 0;

  constructor(videoRef: React.RefObject<HTMLVideoElement>) {
    super();
    console.log('SliencedVideoPlayerInterface.constructor()');

    this._playEventListener = this._playEventListener.bind(this);
    this._pauseEventListener = this._pauseEventListener.bind(this);
    this._seekingEventListener = this._seekingEventListener.bind(this);

    this._waitingEventListner = this._waitingEventListner.bind(this);
    this._canplayEventListner = this._canplayEventListner.bind(this);

    // TODO: Error handling
    this._hls = new Hls();
    if (!Hls.isSupported()) return;
    if (!videoRef.current) return;

    this._video = videoRef.current;
    this._hls.attachMedia(this._video);

    this._attachListeners();
  }

  setVideoSource(video_url: string) {
    this._hls.loadSource(video_url);
  }

  async getCurrentState() {
    if (this._video) {
      await new Promise(r => setImmediate(r));
      return {
        paused: this._video.paused,
        currentTime: this._video.currentTime,
        buffering: this._buffering,
      };
    }
  }

  silentPlay() {
    if (this._video?.paused) {
      this._playIgnoreCount++;
    }
    this._video?.play();
  }

  silentPause() {
    if (!this._video?.paused) {
      this._pauseIgnoreCount++;
    }
    this._video?.pause();
  }

  silentSeek(seconds: number) {
    if (this._video) {
      this._seekingIgnoreCount++;
      this._video.currentTime = seconds;
    }
  }

  destroy() {
    this._removeListeners();
    this._hls.detachMedia();
    this.removeAllListeners();
  }

  private async _playEventListener() {
    if (this._playIgnoreCount > 0) {
      this._playIgnoreCount--;
      return;
    }
    this.emit('play', await this.getCurrentState());
  }

  private async _pauseEventListener() {
    if (this._pauseIgnoreCount > 0) {
      this._pauseIgnoreCount--;
      return;
    }
    this.emit('pause', await this.getCurrentState());
  }

  private async _seekingEventListener() {
    if (this._seekingIgnoreCount > 0) {
      this._seekingIgnoreCount--;
      return;
    }
    this.emit('seek', await this.getCurrentState());
  }

  private async _waitingEventListner() {
    if (!this._buffering) {
      this._buffering = true;
      await this.getCurrentState();
      this.emit('startBuffering');
    }
  }

  private async _canplayEventListner() {
    if (this._buffering) {
      this._buffering = false;
      await this.getCurrentState();
      this.emit('stopBuffering');
    }
  }

  private _attachListeners() {
    this._video?.addEventListener('play', this._playEventListener);
    this._video?.addEventListener('pause', this._pauseEventListener);
    this._video?.addEventListener('seeking', this._seekingEventListener);

    this._video?.addEventListener('waiting', this._waitingEventListner);
    this._video?.addEventListener('canplay', this._canplayEventListner);
  }

  private _removeListeners() {
    this._video?.removeEventListener('play', this._playEventListener);
    this._video?.removeEventListener('pause', this._pauseEventListener);
    this._video?.removeEventListener('seeking', this._seekingEventListener);

    this._video?.removeEventListener('waiting', this._waitingEventListner);
    this._video?.removeEventListener('canplay', this._canplayEventListner);
  }
}
