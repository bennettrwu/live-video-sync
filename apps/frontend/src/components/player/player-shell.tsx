import { useEffect, useRef, useState } from 'react';

import type { EngineView, UserIntent } from '@live-video-sync/sync-engine';

import type { LocalIntent, LocalState } from '#src/player/use-room-engine.js';

import { RoomPanel } from '../room/room-panel.js';
import { ControlBar } from './control-bar.js';
import classes from './player-shell.module.css';
import { StallBadge } from './stall-badge.js';
import { StatusOverlay } from './status-overlay.js';
import { VideoSurface } from './video-surface.js';

const CONTROLS_HIDE_MS = 3000;
const SEEK_STEP_ARROW_S = 5;
const SEEK_STEP_JL_S = 10;

export interface PlayerShellProps {
  view: EngineView;
  local: LocalState;
  onShared: (intent: UserIntent) => void;
  onLocal: (intent: LocalIntent) => void;
  onVideoElement: (element: HTMLVideoElement | null) => void;
  onShellElement: (element: HTMLElement | null) => void;
}

/**
 * The fullscreen container. Everything that must stay visible in fullscreen
 * (overlays, badge, controls, room panel drawer) renders inside it.
 */
export function PlayerShell({
  view,
  local,
  onShared,
  onLocal,
  onVideoElement,
  onShellElement,
}: PlayerShellProps) {
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = () => {
    setControlsVisible(true);
    if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_MS);
  };

  useEffect(() => {
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, CONTROLS_HIDE_MS);
    return () => {
      if (hideTimerRef.current !== null) clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const handled = handleShortcut(event.key, view, local, onShared, onLocal);
      if (handled) {
        event.preventDefault();
        showControls();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [view, local, onShared, onLocal]);

  const controlsHidden =
    !controlsVisible && (view.phase === 'playing' || view.phase === 'stalled');

  return (
    <div
      ref={onShellElement}
      className={[
        classes['shell'],
        controlsHidden ? classes['idle'] : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
      onMouseMove={showControls}
      onTouchStart={showControls}
      tabIndex={-1}
    >
      <VideoSurface onElement={onVideoElement} />
      <StatusOverlay
        view={view}
        onGestureTap={() => {
          onLocal({ type: 'gestureTap' });
        }}
      />
      <StallBadge
        stalledMembers={view.stalledMembers}
        connectionId={view.connectionId}
      />

      {local.fullscreen && local.panelOpen && (
        <div className={classes['panel']}>
          <RoomPanel
            view={view}
            onClose={() => {
              onLocal({ type: 'panel', open: false });
            }}
          />
        </div>
      )}

      <div
        className={[
          classes['controls'],
          controlsHidden ? classes['hidden'] : undefined,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <ControlBar
          view={view}
          local={local}
          showPanelToggle={local.fullscreen}
          onShared={onShared}
          onLocal={onLocal}
        />
      </div>
    </div>
  );
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
}

/**
 * YouTube-style keys: space/k play-pause, j/l skip 10 s, arrows skip 5 s,
 * f fullscreen, m mute.
 * @returns whether the key was consumed
 */
function handleShortcut(
  key: string,
  view: EngineView,
  local: LocalState,
  onShared: (intent: UserIntent) => void,
  onLocal: (intent: LocalIntent) => void,
): boolean {
  const playing = view.phase === 'playing' || view.phase === 'stalled';
  const seekBy = (delta: number) => {
    if (!view.controlsEnabled) return;
    onShared({ action: 'seek', time: Math.max(0, local.currentTime + delta) });
  };

  switch (key) {
    case ' ':
    case 'k':
      if (view.controlsEnabled)
        onShared({ action: playing ? 'pause' : 'play' });
      return true;
    case 'j':
      seekBy(-SEEK_STEP_JL_S);
      return true;
    case 'l':
      seekBy(SEEK_STEP_JL_S);
      return true;
    case 'ArrowLeft':
      seekBy(-SEEK_STEP_ARROW_S);
      return true;
    case 'ArrowRight':
      seekBy(SEEK_STEP_ARROW_S);
      return true;
    case 'f':
      onLocal({ type: 'fullscreen' });
      return true;
    case 'm':
      onLocal({ type: 'mute', muted: !local.muted });
      return true;
    default:
      return false;
  }
}
