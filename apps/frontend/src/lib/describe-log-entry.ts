import type { LogEntry, MediaItem } from '@live-video-sync/sync-protocol';

import { formatTime } from './format-time.js';

/** One line of prose per log entry, e.g. "Bob seeked 1:02 → 4:15". */
export function describeLogEntry(entry: LogEntry, media: MediaItem[]): string {
  const { name, event } = entry;
  switch (event.kind) {
    case 'join':
      return `${name} joined`;
    case 'leave':
      return `${name} left`;
    case 'play':
      return `${name} played at ${formatTime(event.at)}`;
    case 'pause':
      return `${name} paused at ${formatTime(event.at)}`;
    case 'seek':
      return `${name} seeked ${formatTime(event.from)} → ${formatTime(event.to)}`;
    case 'media':
      return `${name} switched to ${media.find((m) => m.id === event.mediaId)?.name ?? event.mediaId}`;
    case 'stall':
      return `${name} is buffering`;
    case 'recovered':
      return `${name} recovered after ${(event.afterMs / 1000).toFixed(1)} s`;
  }
}
