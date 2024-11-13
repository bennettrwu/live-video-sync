import {ReactElement, useEffect} from 'react';
import {Button, MantineColorScheme, useMantineColorScheme} from '@mantine/core';
import {useLocalStorage} from '@mantine/hooks';

import {FaMoon, FaRobot, FaSun} from 'react-icons/fa6';

const toggleMap: {[key in MantineColorScheme]: MantineColorScheme} = {
  dark: 'light',
  light: 'auto',
  auto: 'dark',
};
const iconMap: {[key in MantineColorScheme]: ReactElement} = {
  dark: <FaMoon />,
  light: <FaSun />,
  auto: <FaRobot />,
};

export default function ThemeSelector({showText}: {showText: boolean}) {
  const {setColorScheme} = useMantineColorScheme({keepTransitions: true});

  const [theme, setTheme] = useLocalStorage<MantineColorScheme>({
    key: 'color-scheme',
    defaultValue: 'auto',
  });

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  const toggleTheme = () => {
    setTheme(toggleMap[theme]);
  };

  return (
    <>
      <Button variant="outline" onClick={toggleTheme} leftSection={showText ? iconMap[theme] : undefined}>
        {showText && theme}
        {!showText && iconMap[theme]}
      </Button>
    </>
  );
}
