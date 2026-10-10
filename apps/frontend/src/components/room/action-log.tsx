import { ScrollArea, Stack, Text } from '@mantine/core';

import type { LogEntry, MediaItem } from '@live-video-sync/sync-protocol';

import { describeLogEntry } from '#src/lib/describe-log-entry.js';
import { formatClock } from '#src/lib/format-time.js';

interface ActionLogProps {
  log: LogEntry[];
  media: MediaItem[];
}

export function ActionLog({ log, media }: ActionLogProps) {
  const newestFirst = [...log].reverse();

  return (
    <ScrollArea.Autosize mah={360}>
      <Stack gap={2}>
        {newestFirst.map((entry) => (
          <Text key={entry.id} size="sm">
            <Text span c="dimmed" size="xs" ff="monospace" mr={6}>
              {formatClock(entry.at)}
            </Text>
            {describeLogEntry(entry, media)}
          </Text>
        ))}
        {newestFirst.length === 0 && (
          <Text size="sm" c="dimmed">
            Nothing yet.
          </Text>
        )}
      </Stack>
    </ScrollArea.Autosize>
  );
}
