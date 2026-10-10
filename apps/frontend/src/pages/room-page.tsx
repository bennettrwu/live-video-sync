import { useState } from 'react';

import { Alert, Container, Grid, Paper, Stack, Title } from '@mantine/core';
import { useParams } from 'react-router';

import { PlayerShell } from '#src/components/player/player-shell.js';
import { JoinForm } from '#src/components/room/join-form.js';
import { Playlist } from '#src/components/room/playlist.js';
import { RoomPanel } from '#src/components/room/room-panel.js';
import { loadName, saveName } from '#src/lib/identity.js';
import { useRoomEngine } from '#src/player/use-room-engine.js';

export function RoomPage() {
  const { code = '' } = useParams();
  const [name, setName] = useState<string | null>(loadName);

  if (name === null) {
    return (
      <Container size="xs" mt="xl">
        <Paper p="lg" withBorder>
          <Title order={4} mb="md">
            Who are you?
          </Title>
          <JoinForm
            initialCode={code}
            codeLocked
            onSubmit={(_code, chosen) => {
              saveName(chosen);
              setName(chosen);
            }}
          />
        </Paper>
      </Container>
    );
  }

  return <Room code={code} name={name} />;
}

function Room({ code, name }: { code: string; name: string }) {
  const engine = useRoomEngine(code, name);
  const { view, local, onShared, onLocal } = engine;

  if (!engine.supported) {
    return (
      <Alert color="red" title="Unsupported browser">
        This browser cannot play HLS through Media Source Extensions. Use a
        current Chrome, Firefox, Edge, or Safari 17.1+.
      </Alert>
    );
  }

  return (
    <Grid gap="md">
      <Grid.Col span={{ base: 12, md: 8 }}>
        <Stack gap="md">
          <Title order={4}>{view.room?.name ?? code}</Title>
          <PlayerShell
            view={view}
            local={local}
            onShared={onShared}
            onLocal={onLocal}
            onVideoElement={engine.setVideoElement}
            onShellElement={engine.setShellElement}
          />
          <Playlist
            media={view.media}
            currentMediaId={view.currentMediaId}
            disabled={!view.controlsEnabled}
            onSelect={(mediaId) => {
              onShared({ action: 'media', mediaId });
            }}
          />
        </Stack>
      </Grid.Col>
      <Grid.Col span={{ base: 12, md: 4 }}>
        <RoomPanel view={view} />
      </Grid.Col>
    </Grid>
  );
}
