import {ReactElement, useEffect} from 'react';
import {Button, MantineColorScheme, useCombobox, useMantineColorScheme} from '@mantine/core';
import {useLocalStorage} from '@mantine/hooks';

import {FaMoon, FaRobot, FaSun} from 'react-icons/fa6';

const toggle_map: {[key in MantineColorScheme]: MantineColorScheme} = {
  dark: 'light',
  light: 'auto',
  auto: 'dark',
};
const icon_map: {[key in MantineColorScheme]: ReactElement} = {
  dark: <FaMoon />,
  light: <FaSun />,
  auto: <FaRobot />,
};

export default function ThemeSelector({showText}: {showText: boolean}) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
    onDropdownOpen: eventSource => {
      if (eventSource === 'keyboard') {
        combobox.selectActiveOption();
      } else {
        combobox.updateSelectedOptionIndex('active');
      }
    },
  });

  const {setColorScheme} = useMantineColorScheme();

  const [theme, setTheme] = useLocalStorage<MantineColorScheme>({
    key: 'color-scheme',
    defaultValue: 'auto',
  });

  useEffect(() => {
    setColorScheme(theme);
  }, [theme, setColorScheme]);

  const toggleTheme = () => {
    setTheme(toggle_map[theme]);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={toggleTheme}
        leftSection={showText ? icon_map[theme] : undefined}
      >
        {showText && theme}
        {!showText && icon_map[theme]}
      </Button>
    </>
  );
}
