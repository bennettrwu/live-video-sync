import { useState } from 'react';

import { Container, Paper, Text, Title } from '@mantine/core';
import { useNavigate } from 'react-router';

import { JoinForm } from '#src/components/room/join-form.js';
import { loadName, saveName } from '#src/lib/identity.js';

export function JoinPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const join = async (code: string, name: string) => {
    const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
    if (!res.ok) {
      setError(
        res.status === 404
          ? 'No room with that code.'
          : 'Could not reach the server.',
      );
      return;
    }

    saveName(name);
    await navigate(`/r/${encodeURIComponent(code)}`);
  };

  return (
    <Container size="xs" mt="xl">
      <Paper p="lg" withBorder>
        <Title order={4} mb="md">
          Join a room
        </Title>
        <JoinForm
          initialName={loadName() ?? ''}
          onSubmit={(code, name) => void join(code, name)}
        />
        {error !== null && (
          <Text c="red" mt="sm" size="sm">
            {error}
          </Text>
        )}
      </Paper>
    </Container>
  );
}
