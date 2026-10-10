import type { ReactNode } from 'react';

import { MantineProvider } from '@mantine/core';
import { render as testingLibraryRender } from '@testing-library/react';

/**
 * Renders a component inside the providers the app always has.
 * @returns Testing Library render result
 */
export function render(ui: ReactNode) {
  return testingLibraryRender(ui, {
    wrapper: ({ children }) => <MantineProvider>{children}</MantineProvider>,
  });
}
