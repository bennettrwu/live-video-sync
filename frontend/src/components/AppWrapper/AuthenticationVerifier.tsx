import {notifications} from '@mantine/notifications';
import accountAPIWhoAmI from '@src/api/accounts/who-am-i';
import {logIn, logOut} from '@src/redux/reducers/loggedInUser';
import {useAppDispatch} from '@src/redux/store';
import {useEffect, useRef} from 'react';
import {useNavigate} from 'react-router-dom';

const hiddenOnLogin = ['/', '/login', '/signup'];
const requireAuth = ['/manage-account', '/manage-rooms', '/create-room', '/join-room'];

const RECHECK_INTERVAL = 5_000;

export default function AuthenticationVerifier() {
  const dispatch = useAppDispatch();
  const navigate = useRef(useNavigate());

  useEffect(() => {
    let controller: AbortController;
    let timeout: NodeJS.Timeout;

    async function checkLogin() {
      controller = new AbortController();

      const result = await accountAPIWhoAmI(controller);
      if (!result) return;

      if (result.success) {
        dispatch(logIn(result.username));

        if (hiddenOnLogin.includes(window.location.pathname.toLowerCase())) {
          navigate.current('/manage-rooms');

          notifications.show({title: 'Already logged in', message: 'Redirecting to your rooms'});
        }
      } else {
        dispatch(logOut());

        if (requireAuth.includes(window.location.pathname.toLowerCase())) {
          navigate.current('/login');

          if (result.statusCode === 401) {
            notifications.show({
              title: 'Logged out',
              message: result.message,
            });
          } else {
            notifications.show({
              title:
                'Something went wrong on our end when checking your session. Please refresh the page and try to login again.',
              message: `Request id: ${result.requestId}`,
              autoClose: false,
            });
            return;
          }
        }
      }
      timeout = setTimeout(checkLogin, RECHECK_INTERVAL);
    }

    checkLogin().catch(() => {});

    return () => {
      clearTimeout(timeout);
      controller?.abort();
    };
  }, [dispatch]);

  return <></>;
}
