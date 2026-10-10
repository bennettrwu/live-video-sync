import { ActionIcon, Menu, Tooltip } from '@mantine/core';
import { IconBadgeCc } from '@tabler/icons-react';

import type { SubtitleTrack } from '#src/player/hls-player-adapter.js';

interface SubtitleMenuProps {
  tracks: SubtitleTrack[];
  active: number;
  onSelect: (id: number) => void;
}

/** Picker for the subtitle tracks hls.js found in the playlist. */
export function SubtitleMenu({ tracks, active, onSelect }: SubtitleMenuProps) {
  if (tracks.length === 0) return null;

  return (
    <Menu position="top">
      <Menu.Target>
        <Tooltip label="Subtitles">
          <ActionIcon
            variant={active >= 0 ? 'filled' : 'subtle'}
            color="gray"
            aria-label="Subtitles"
          >
            <IconBadgeCc size={20} />
          </ActionIcon>
        </Tooltip>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          onClick={() => {
            onSelect(-1);
          }}
          fw={active === -1 ? 700 : undefined}
        >
          Off
        </Menu.Item>
        {tracks.map((track) => (
          <Menu.Item
            key={track.id}
            onClick={() => {
              onSelect(track.id);
            }}
            fw={active === track.id ? 700 : undefined}
          >
            {track.name}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}
