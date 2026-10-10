import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import {
  type EngineView,
  SyncEngine,
  type UserIntent,
} from '@live-video-sync/sync-engine';

import { toggleFullscreen } from '#src/lib/fullscreen.js';

import { BrowserRunner } from './browser-runner.js';
import { HlsPlayerAdapter, type SubtitleTrack } from './hls-player-adapter.js';
import { WsTransport } from './ws-transport.js';

/** State that belongs to this tab only and never reaches the room. */
export interface LocalState {
  currentTime: number;
  duration: number;
  buffered: [number, number][];
  volume: number;
  muted: boolean;
  subtitle: number;
  subtitles: SubtitleTrack[];
  fullscreen: boolean;
  panelOpen: boolean;
}

export type LocalIntent =
  | { type: 'volume'; value: number }
  | { type: 'mute'; muted: boolean }
  | { type: 'subtitle'; id: number }
  | { type: 'fullscreen' }
  | { type: 'panel'; open: boolean }
  | { type: 'gestureTap' };

export interface RoomEngineHandle {
  view: EngineView;
  local: LocalState;
  onShared: (intent: UserIntent) => void;
  onLocal: (intent: LocalIntent) => void;
  setVideoElement: (element: HTMLVideoElement | null) => void;
  setShellElement: (element: HTMLElement | null) => void;
  supported: boolean;
}

interface Session {
  adapter: HlsPlayerAdapter;
  runner: BrowserRunner;
}

/** A stable external store for `useSyncExternalStore`, fed by the runner. */
interface ViewStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => EngineView;
  set: (view: EngineView) => void;
}

const INITIAL_LOCAL: LocalState = {
  currentTime: 0,
  duration: NaN,
  buffered: [],
  volume: 1,
  muted: false,
  subtitle: -1,
  subtitles: [],
  fullscreen: false,
  panelOpen: false,
};

const IDLE_VIEW: EngineView = {
  phase: 'joining',
  controlsEnabled: false,
  name: '',
  connectionId: null,
  room: null,
  media: [],
  currentMediaId: null,
  members: [],
  stalledMembers: [],
  waiting: false,
  log: [],
  debug: { drift: 0, rtt: null, offset: null, rate: 1, seq: 0 },
};

function createViewStore(): ViewStore {
  const listeners = new Set<() => void>();
  let view = IDLE_VIEW;
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => view,
    set: (next) => {
      view = next;
      for (const listener of listeners) listener();
    },
  };
}

function socketUrl(code: string): string {
  const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${location.host}/api/rooms/${encodeURIComponent(code)}/ws`;
}

function bufferedRanges(ranges: TimeRanges): [number, number][] {
  const result: [number, number][] = [];
  for (let i = 0; i < ranges.length; i++) {
    result.push([ranges.start(i), ranges.end(i)]);
  }
  return result;
}

/**
 * Owns the engine, transport, and player for one room and exposes them to
 * React. The session starts once a video element is attached and stops on
 * unmount or when the room or name changes.
 */
export function useRoomEngine(code: string, name: string): RoomEngineHandle {
  const sessionRef = useRef<Session | null>(null);
  const shellRef = useRef<HTMLElement | null>(null);
  const [store] = useState(createViewStore);

  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [local, setLocal] = useState<LocalState>(INITIAL_LOCAL);
  const supported = HlsPlayerAdapter.isSupported();

  useEffect(() => {
    if (video === null || !supported) return;

    const engine = new SyncEngine(name);
    const adapter = new HlsPlayerAdapter(video);
    const transport = new WsTransport({ url: socketUrl(code) });
    const runner = new BrowserRunner(engine, transport, adapter);
    sessionRef.current = { adapter, runner };

    const unsubscribeView = runner.subscribeView(() => {
      store.set(runner.view);
      setLocal((prev) => ({
        ...prev,
        currentTime: adapter.currentTime,
        duration: adapter.duration,
        buffered: bufferedRanges(adapter.buffered),
        volume: adapter.volume,
        muted: adapter.muted,
      }));
    });
    const unsubscribeSubtitles = adapter.onSubtitleTracksChanged(() => {
      setLocal((prev) => ({
        ...prev,
        subtitles: adapter.subtitleTracks,
        subtitle: adapter.subtitleTrack,
      }));
    });
    const onFullscreenChange = () => {
      setLocal((prev) => ({
        ...prev,
        fullscreen: document.fullscreenElement !== null,
      }));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);

    runner.start();

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      unsubscribeSubtitles();
      unsubscribeView();
      runner.stop();
      adapter.destroy();
      sessionRef.current = null;
      store.set(IDLE_VIEW);
    };
  }, [video, code, name, supported, store]);

  const view = useSyncExternalStore(store.subscribe, store.getSnapshot);

  const onShared = useCallback((intent: UserIntent) => {
    sessionRef.current?.runner.intent(intent);
  }, []);

  const onLocal = useCallback((intent: LocalIntent) => {
    const session = sessionRef.current;
    switch (intent.type) {
      case 'volume':
        session?.adapter.setVolume(intent.value);
        return;
      case 'mute':
        session?.adapter.setMuted(intent.muted);
        return;
      case 'subtitle':
        if (session !== null) session.adapter.subtitleTrack = intent.id;
        setLocal((prev) => ({ ...prev, subtitle: intent.id }));
        return;
      case 'fullscreen':
        if (shellRef.current !== null) void toggleFullscreen(shellRef.current);
        return;
      case 'panel':
        setLocal((prev) => ({ ...prev, panelOpen: intent.open }));
        return;
      case 'gestureTap':
        // play() must run synchronously inside the click for Safari.
        session?.adapter.play();
        session?.runner.intent({ action: 'gesture' });
        return;
    }
  }, []);

  const setShellElement = useCallback((element: HTMLElement | null) => {
    shellRef.current = element;
  }, []);

  return {
    view,
    local,
    onShared,
    onLocal,
    setVideoElement: setVideo,
    setShellElement,
    supported,
  };
}
