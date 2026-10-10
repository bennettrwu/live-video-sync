import { Group, Title } from '@mantine/core';
import { Link } from 'react-router';

import { ThemeToggle } from './theme-toggle.js';

interface AppHeaderProps {
  subtitle?: string | undefined;
}

export function AppHeader({ subtitle }: AppHeaderProps) {
  return (
    <Group h="100%" px="md" justify="space-between">
      <Group gap="sm" align="baseline">
        <Title
          order={3}
          renderRoot={(props) => <Link to="/" {...props} />}
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          Live Video Sync
        </Title>
        {subtitle !== undefined && (
          <Title order={5} c="dimmed">
            {subtitle}
          </Title>
        )}
      </Group>
      <ThemeToggle />
    </Group>
  );
}
