import { Button, Center, Loader, Overlay, Stack, Text } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

import type { EngineView } from '@live-video-sync/sync-engine';

interface StatusOverlayProps {
  view: EngineView;
  onGestureTap: () => void;
}

/** Full-surface message for phases where the video is not simply playing or paused. */
export function StatusOverlay({ view, onGestureTap }: StatusOverlayProps) {
  const content = overlayContent(view, onGestureTap);
  if (content === null) return null;

  return (
    <Overlay backgroundOpacity={0.6} blur={2} zIndex={2}>
      <Center h="100%">
        <Stack align="center" gap="sm">
          {content}
        </Stack>
      </Center>
    </Overlay>
  );
}

function overlayContent(view: EngineView, onGestureTap: () => void) {
  switch (view.phase) {
    case 'needsGesture':
      return (
        <Button
          size="xl"
          leftSection={<IconPlayerPlay />}
          onClick={onGestureTap}
        >
          Tap to play
        </Button>
      );
    case 'waitingForOthers':
      return (
        <>
          <Loader color="white" />
          <Text c="white">Waiting for {namesOf(view.stalledMembers)}…</Text>
        </>
      );
    case 'reconnecting':
      return (
        <>
          <Loader color="white" />
          <Text c="white">Reconnecting…</Text>
        </>
      );
    case 'joining':
    case 'loading':
      return <Loader color="white" />;
    case 'idle':
      return <Text c="white">Pick something from the playlist to start.</Text>;
    case 'error':
      return <Text c="red.3">Playback error. Reload the page.</Text>;
    default:
      return null;
  }
}

function namesOf(members: { name: string }[]): string {
  const names = members.map((m) => m.name);
  if (names.length <= 2) return names.join(' and ');
  return `${names.slice(0, -1).join(', ')} and ${String(names.at(-1))}`;
}
