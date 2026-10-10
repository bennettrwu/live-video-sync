import { Badge, Group, Loader } from '@mantine/core';

import type { Member } from '@live-video-sync/sync-protocol';

interface StallBadgeProps {
  stalledMembers: Member[];
  connectionId: string | null;
}

/** Corner chip naming anyone currently buffering. Renders nothing when nobody is. */
export function StallBadge({ stalledMembers, connectionId }: StallBadgeProps) {
  const others = stalledMembers.filter((m) => m.connectionId !== connectionId);
  if (others.length === 0) return null;

  return (
    <Group
      gap="xs"
      style={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }}
    >
      {others.map((member) => (
        <Badge
          key={member.connectionId}
          variant="filled"
          color="yellow"
          leftSection={<Loader size={10} color="dark" />}
        >
          {member.name} is buffering
        </Badge>
      ))}
    </Group>
  );
}
