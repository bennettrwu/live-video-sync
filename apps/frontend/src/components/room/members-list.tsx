import { Badge, Group, Stack, Text } from '@mantine/core';

import type { Member } from '@live-video-sync/sync-protocol';

interface MembersListProps {
  members: Member[];
  connectionId: string | null;
}

export function MembersList({ members, connectionId }: MembersListProps) {
  return (
    <Stack gap={4}>
      {members.map((member) => (
        <Group key={member.connectionId} gap="xs">
          <Text size="sm">{member.name}</Text>
          {member.connectionId === connectionId && (
            <Text size="xs" c="dimmed">
              (you)
            </Text>
          )}
          {member.stalledSince !== null && (
            <Badge size="xs" color="yellow" variant="light">
              buffering
            </Badge>
          )}
        </Group>
      ))}
    </Stack>
  );
}
