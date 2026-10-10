import { AppShell, Container } from '@mantine/core';
import { Outlet, RouterProvider, createBrowserRouter } from 'react-router';

import { AppHeader } from '#src/components/app-header.js';
import { JoinPage } from '#src/pages/join-page.js';
import { NotFoundPage } from '#src/pages/not-found-page.js';
import { RoomPage } from '#src/pages/room-page.js';

function Layout() {
  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header>
        <AppHeader />
      </AppShell.Header>
      <AppShell.Main>
        <Container size={1280} px={0}>
          <Outlet />
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <JoinPage /> },
      { path: '/r/:code', element: <RoomPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
