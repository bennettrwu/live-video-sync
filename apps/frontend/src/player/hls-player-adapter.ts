import Hls from 'hls.js';

import type {
  PlayerCommand,
  PlayerEvent,
  SyncSnapshot,
} from '@live-video-sync/sync-engine';

export type PlayerSnapshot = Pick<SyncSnapshot, 'loaded' | 'player'>;

export interface SubtitleTrack {
  id: number;
  name: string;
  lang: string | undefined;
}

/**
 * Drives a `<video>` element through hls.js as a pure output device. It never
 * infers user intent from media events; it only executes commands and reports
 * observations.
 */
export class HlsPlayerAdapter {
  private readonly _video: HTMLVideoElement;
  private readonly _hls: Hls;
  private readonly _listeners = new Set<(event: PlayerEvent) => void>();
  private readonly _subtitleListeners = new Set<() => void>();

  private _loadedMediaId: string | null = null;
  private _manifestParsed = false;

  public constructor(video: HTMLVideoElement) {
    this._video = video;
    this._hls = new Hls({ autoStartLoad: false });
    this._hls.attachMedia(video);

    this._hls.on(Hls.Events.MANIFEST_PARSED, () => {
      this._manifestParsed = true;
    });
    this._hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
      for (const listener of this._subtitleListeners) listener();
    });
    this._hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;

      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        this._hls.startLoad();
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        this._hls.recoverMediaError();
      } else {
        this._emit({ type: 'error', fatal: true, message: data.details });
      }
    });
  }

  public static isSupported(): boolean {
    return Hls.isSupported();
  }

  public snapshot(): PlayerSnapshot {
    const video = this._video;
    const loaded =
      this._loadedMediaId === null
        ? null
        : {
            mediaId: this._loadedMediaId,
            ready: this._manifestParsed && video.readyState >= 1,
          };
    return {
      loaded,
      player: {
        currentTime: video.currentTime,
        paused: video.paused,
        rate: video.playbackRate,
        readyState: video.readyState as 0 | 1 | 2 | 3 | 4,
        ended: video.ended,
      },
    };
  }

  public exec(cmd: PlayerCommand): void {
    switch (cmd.type) {
      case 'load':
        this._load(cmd.mediaId, cmd.url, cmd.startAt);
        return;
      case 'play':
        this.play();
        return;
      case 'pause':
        this._video.pause();
        return;
      case 'seek':
        this._video.currentTime = cmd.time;
        return;
      case 'rate':
        this._video.playbackRate = cmd.rate;
        return;
    }
  }

  /**
   * Starts playback. Exposed so a tap handler can call it synchronously inside
   * the user gesture, which Safari requires.
   */
  public play(): void {
    this._video.play().catch((err: unknown) => {
      const name = err instanceof DOMException ? err.name : '';
      if (name === 'AbortError') return;
      this._emit({
        type: 'playRejected',
        reason: name === 'NotAllowedError' ? 'gesture' : 'other',
      });
    });
  }

  public setVolume(volume: number): void {
    this._video.volume = volume;
    this._video.muted = volume === 0;
  }

  public setMuted(muted: boolean): void {
    this._video.muted = muted;
  }

  public get volume(): number {
    return this._video.volume;
  }

  public get muted(): boolean {
    return this._video.muted;
  }

  public get currentTime(): number {
    return this._video.currentTime;
  }

  public get buffered(): TimeRanges {
    return this._video.buffered;
  }

  public get duration(): number {
    return this._video.duration;
  }

  public get subtitleTracks(): SubtitleTrack[] {
    return this._hls.subtitleTracks.map((track) => ({
      id: track.id,
      name: track.name,
      lang: track.lang,
    }));
  }

  public get subtitleTrack(): number {
    return this._hls.subtitleTrack;
  }

  public set subtitleTrack(id: number) {
    this._hls.subtitleTrack = id;
  }

  public onEvent(listener: (event: PlayerEvent) => void): () => void {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  public onSubtitleTracksChanged(listener: () => void): () => void {
    this._subtitleListeners.add(listener);
    return () => this._subtitleListeners.delete(listener);
  }

  public destroy(): void {
    this._hls.destroy();
    this._listeners.clear();
    this._subtitleListeners.clear();
  }

  private _load(mediaId: string, url: string, startAt: number): void {
    this._loadedMediaId = mediaId;
    this._manifestParsed = false;
    this._hls.loadSource(url);
    this._hls.startLoad(startAt);
  }

  private _emit(event: PlayerEvent): void {
    for (const listener of this._listeners) listener(event);
  }
}
