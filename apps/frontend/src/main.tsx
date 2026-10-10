import { StrictMode } from 'react';

import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { createRoot } from 'react-dom/client';

import { App } from './app.js';

const root = document.getElementById('root');
if (root === null) throw new Error('missing #root element');

createRoot(root).render(
  <StrictMode>
    <MantineProvider defaultColorScheme="auto">
      <App />
    </MantineProvider>
  </StrictMode>,
);
