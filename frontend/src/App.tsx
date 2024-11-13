// Import styles of packages that you've installed.
// All packages except `@mantine/hooks` require styles imports
import '@mantine/core/styles.css';
import {MantineProvider} from '@mantine/core';
import {Notifications} from '@mantine/notifications';

import {createBrowserRouter, RouterProvider} from 'react-router-dom';

import Theater from './pages/Theater';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import AppWrapper from './components/AppWrapper/AppWrapper';
import {Provider} from 'react-redux';
import {store} from './redux/store';

export default function App() {
  const router = createBrowserRouter([
    {
      path: '/',
      element: <AppWrapper page={<Theater />} />,
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
      path: '/*',
      element: <AppWrapper page={<NotFound />} />,
    },
  ]);

  return (
    <MantineProvider>
      <Provider store={store}>
        <Notifications />
        <RouterProvider router={router} />
      </Provider>
    </MantineProvider>
  );
}
