import Hls from 'hls.js';
import EventEmitter from 'events';

// TODO: Bunch of error handling
export default class SilencedVideoPlayerInterface extends EventEmitter {
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
    console.log('SliencedVideoPlayerInterface.setVideoSource()');

    this._hls.loadSource(video_url);
  }

  getCurrentState() {
    console.log('SliencedVideoPlayerInterface.getCurrentState()');

    if (this._video) {
      return {
        paused: this._video.paused,
        currentTime: this._video.currentTime,
        buffering: this._buffering,
      };
    }
  }

  silentPlay() {
    console.log('SliencedVideoPlayerInterface.silentPlay()');

    if (this._video?.paused) {
      this._playIgnoreCount++;
    }
    this._video?.play();
  }

  silentPause() {
    console.log('SliencedVideoPlayerInterface.silentPause()');
    if (!this._video?.paused) {
      this._pauseIgnoreCount++;
    }
    this._video?.pause();
  }

  silentSeek(seconds: number) {
    console.log('SliencedVideoPlayerInterface.silentSeek()');

    if (this._video) {
      this._seekingIgnoreCount++;
      this._video.currentTime = seconds;
    }
  }

  destroy() {
    console.log('SliencedVideoPlayerInterface.destroy()');

    this._removeListeners();
    this._hls.detachMedia();
    this.removeAllListeners();
  }

  private _playEventListener() {
    console.log('SliencedVideoPlayerInterface._playEventListener()');
    if (this._playIgnoreCount > 0) {
      this._playIgnoreCount--;
      return;
    }
    this.emit('play', this.getCurrentState());
  }

  private _pauseEventListener() {
    console.log('SliencedVideoPlayerInterface._pauseEventListener()');

    if (this._pauseIgnoreCount > 0) {
      this._pauseIgnoreCount--;
      return;
    }
    this.emit('pause', this.getCurrentState());
  }

  private _seekingEventListener() {
    console.log('SliencedVideoPlayerInterface._seekingEventListener()');

    if (this._seekingIgnoreCount > 0) {
      this._seekingIgnoreCount--;
      return;
    }
    this.emit('seek', this.getCurrentState());
  }

  private _waitingEventListner() {
    console.log('SliencedVideoPlayerInterface._waitingEventListner()');

    this._buffering = true;
  }

  private _canplayEventListner() {
    console.log('SliencedVideoPlayerInterface._canplayEventListner()');

    this._buffering = false;
  }

  private _attachListeners() {
    console.log('SliencedVideoPlayerInterface._attachListeners()');

    this._video?.addEventListener('play', this._playEventListener);
    this._video?.addEventListener('pause', this._pauseEventListener);
    this._video?.addEventListener('seeking', this._seekingEventListener);

    this._video?.addEventListener('waiting', this._waitingEventListner);
    this._video?.addEventListener('canplay', this._canplayEventListner);
  }

  private _removeListeners() {
    console.log('SliencedVideoPlayerInterface._removeListeners()');

    this._video?.removeEventListener('play', this._playEventListener);
    this._video?.removeEventListener('pause', this._pauseEventListener);
    this._video?.removeEventListener('seeking', this._seekingEventListener);

    this._video?.removeEventListener('waiting', this._waitingEventListner);
    this._video?.removeEventListener('canplay', this._canplayEventListner);
  }
}
