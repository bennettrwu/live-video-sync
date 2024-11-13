// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import {MantineProvider} from '@mantine/core';
import {Notifications} from '@mantine/notifications';

import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import {Provider} from 'react-redux';
import {store} from './redux/store';

import AppWrapper from './components/AppWrapper/AppWrapper';
import Theater from './pages/Theater';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import Welcome from './pages/Welcome';
import ManageAccount from './pages/ManageAccount';
import ManageRooms from './pages/ManageRooms';
import CreateRoom from './pages/CreateRoom';
import JoinRoom from './pages/JoinRoom';

const DEFAULT_NOTIFICATION_AUTOCLOSE = 3_000;
const DEFAULT_NOTIFICATION_POSITION = 'top-center';

export default function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <AppWrapper page={<Welcome />} />,
    },
    {
      path: '/login',
      element: <AppWrapper page={<Login />} />,
    },
    {
      path: '/signup',
      element: <AppWrapper page={<Signup />} />,
    },
    {
      path: '/manage-account',
      element: <AppWrapper page={<ManageAccount />} />,
    },
    {
      path: '/manage-rooms',
      element: <AppWrapper page={<ManageRooms />} />,
    },
    {
      path: '/create-room',
      element: <AppWrapper page={<CreateRoom />} />,
    },
    {
      path: '/join-room',
      element: <AppWrapper page={<JoinRoom />} />,
    },
    {
      path: '/theater',
      element: <AppWrapper page={<Theater />} />,
    },
    {
      path: '/*',
      element: <AppWrapper page={<NotFound />} />,
    },
  ]);

  return (
    <MantineProvider>
      <Provider store={store}>
        <Notifications autoClose={DEFAULT_NOTIFICATION_AUTOCLOSE} position={DEFAULT_NOTIFICATION_POSITION} />
        <RouterProvider router={router} />
      </Provider>
    </MantineProvider>
  );
}
