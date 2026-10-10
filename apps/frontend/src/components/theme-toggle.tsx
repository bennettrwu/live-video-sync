import {
  ActionIcon,
  useComputedColorScheme,
  useMantineColorScheme,
} from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';

export function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme('dark');

  return (
    <ActionIcon
      variant="default"
      aria-label="Toggle color scheme"
      onClick={() => {
        setColorScheme(computed === 'dark' ? 'light' : 'dark');
      }}
    >
      {computed === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}
