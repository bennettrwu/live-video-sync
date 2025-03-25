// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import {MantineProvider} from '@mantine/core';
import {AppShell} from '@mantine/core';

import {createBrowserRouter, RouterProvider} from 'react-router-dom';

import Theater from './pages/Theater';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import PageHeader from './components/PageHeader/PageHeader';

import './App.scss';

export default function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <Theater />,
    },
    {
      path: '/login',
      element: <Login />,
    },
    {
      path: '/signup',
      element: <Signup />,
    },
    {
      path: '/*',
      element: <NotFound />,
    },
  ]);

  return (
    <MantineProvider>
      <AppShell header={{height: 60}} padding="md">
        <AppShell.Header>
          <PageHeader />
        </AppShell.Header>

        <AppShell.Main>
          <div className="center-vertical">
            <RouterProvider router={router} />
          </div>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}
