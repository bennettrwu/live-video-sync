import {
  CloseButton,
  Divider,
  Group,
  Paper,
  Stack,
  Title,
} from '@mantine/core';

import type { EngineView } from '@live-video-sync/sync-engine';

import { ActionLog } from './action-log.js';
import { MembersList } from './members-list.js';

interface RoomPanelProps {
  view: EngineView;
  /** When given, a close button is shown (used by the fullscreen drawer). */
  onClose?: () => void;
}

/** Members and the action log, side by side with the video or as a fullscreen drawer. */
export function RoomPanel({ view, onClose }: RoomPanelProps) {
  return (
    <Paper p="md" withBorder h="100%">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={5}>In the room</Title>
          {onClose !== undefined && (
            <CloseButton aria-label="Close room panel" onClick={onClose} />
          )}
        </Group>
        <MembersList members={view.members} connectionId={view.connectionId} />
        <Divider />
        <Title order={5}>Log</Title>
        <ActionLog log={view.log} media={view.media} />
      </Stack>
    </Paper>
  );
}
