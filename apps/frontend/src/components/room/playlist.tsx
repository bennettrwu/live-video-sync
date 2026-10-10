import { NavLink, Stack, Text } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { MediaItem } from '@live-video-sync/sync-protocol';

interface PlaylistProps {
  media: MediaItem[];
  currentMediaId: string | null;
  disabled: boolean;
  onSelect: (mediaId: string) => void;
}

export function Playlist({
  media,
  currentMediaId,
  disabled,
  onSelect,
}: PlaylistProps) {
  if (media.length === 0) {
    return <Text c="dimmed">This room has no media.</Text>;
  }

  return (
    <Stack component="nav" aria-label="Playlist" gap={2}>
      {media.map((item) => (
        <NavLink
          key={item.id}
          component="button"
          label={item.name}
          active={item.id === currentMediaId}
          disabled={disabled}
          leftSection={
            item.id === currentMediaId ? (
              <IconPlayerPlay size={16} />
            ) : undefined
          }
          onClick={() => {
            onSelect(item.id);
          }}
        />
      ))}
    </Stack>
  );
}
