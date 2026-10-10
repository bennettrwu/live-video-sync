import { ActionIcon, Group, Slider, Text, Tooltip } from '@mantine/core';
import {
  IconLayoutSidebarRightCollapse,
  IconLayoutSidebarRightExpand,
  IconMaximize,
  IconMinimize,
  IconPlayerPause,
  IconPlayerPlay,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';

import type { EngineView, UserIntent } from '@live-video-sync/sync-engine';

import { formatTime } from '#src/lib/format-time.js';
import type { LocalIntent, LocalState } from '#src/player/use-room-engine.js';

import { SeekBar } from './seek-bar.js';
import { SubtitleMenu } from './subtitle-menu.js';

interface ControlBarProps {
  view: EngineView;
  local: LocalState;
  showPanelToggle: boolean;
  onShared: (intent: UserIntent) => void;
  onLocal: (intent: LocalIntent) => void;
}

export function ControlBar({
  view,
  local,
  showPanelToggle,
  onShared,
  onLocal,
}: ControlBarProps) {
  const playing = view.phase === 'playing' || view.phase === 'stalled';
  const disabled = !view.controlsEnabled;

  return (
    <Group gap="sm" px="sm" py={6} wrap="nowrap" style={{ color: 'white' }}>
      <Tooltip label={playing ? 'Pause (space)' : 'Play (space)'}>
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={disabled}
          onClick={() => {
            onShared({ action: playing ? 'pause' : 'play' });
          }}
        >
          {playing ? (
            <IconPlayerPause size={22} />
          ) : (
            <IconPlayerPlay size={22} />
          )}
        </ActionIcon>
      </Tooltip>

      <Text size="sm" ff="monospace" style={{ whiteSpace: 'nowrap' }}>
        {formatTime(local.currentTime)} / {formatTime(local.duration)}
      </Text>

      <div style={{ flex: 1 }}>
        <SeekBar
          currentTime={local.currentTime}
          duration={local.duration}
          buffered={local.buffered}
          disabled={disabled}
          onSeek={(time) => {
            onShared({ action: 'seek', time });
          }}
        />
      </div>

      <Group gap={4} wrap="nowrap">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label={local.muted ? 'Unmute' : 'Mute'}
          onClick={() => {
            onLocal({ type: 'mute', muted: !local.muted });
          }}
        >
          {local.muted ? <IconVolumeOff size={20} /> : <IconVolume size={20} />}
        </ActionIcon>
        <Slider
          aria-label="Volume"
          w={80}
          size="xs"
          min={0}
          max={1}
          step={0.05}
          value={local.muted ? 0 : local.volume}
          onChange={(value) => {
            onLocal({ type: 'volume', value });
          }}
        />
      </Group>

      <SubtitleMenu
        tracks={local.subtitles}
        active={local.subtitle}
        onSelect={(id) => {
          onLocal({ type: 'subtitle', id });
        }}
      />

      {showPanelToggle && (
        <Tooltip
          label={local.panelOpen ? 'Hide room panel' : 'Show room panel'}
        >
          <ActionIcon
            variant="subtle"
            color="gray"
            aria-label="Room panel"
            onClick={() => {
              onLocal({ type: 'panel', open: !local.panelOpen });
            }}
          >
            {local.panelOpen ? (
              <IconLayoutSidebarRightCollapse size={20} />
            ) : (
              <IconLayoutSidebarRightExpand size={20} />
            )}
          </ActionIcon>
        </Tooltip>
      )}

      <Tooltip label="Fullscreen (f)">
        <ActionIcon
          variant="subtle"
          color="gray"
          aria-label="Fullscreen"
          onClick={() => {
            onLocal({ type: 'fullscreen' });
          }}
        >
          {local.fullscreen ? (
            <IconMinimize size={20} />
          ) : (
            <IconMaximize size={20} />
          )}
        </ActionIcon>
      </Tooltip>
    </Group>
  );
}
