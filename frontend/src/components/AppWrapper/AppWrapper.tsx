import {useEffect, useRef} from 'react';
import {useDisclosure} from '@mantine/hooks';
import {notifications} from '@mantine/notifications';
import {AppShell, Box, Burger, Button, Flex, LoadingOverlay, NavLink, Text, useMatches} from '@mantine/core';
import {Link, useNavigate} from 'react-router-dom';
import {
  FaArrowRightFromBracket,
  FaArrowRightToBracket,
  FaGear,
  FaPlus,
  FaRightToBracket,
  FaUser,
  FaUsersRectangle,
} from 'react-icons/fa6';

import {useAppDispatch, useAppSelector} from '@src/redux/store';
import {isLoggedIn, loggedInUsername, logIn, logOut} from '@src/redux/reducers/loggedInUser';

import ThemeSelector from '../ThemeSelector/ThemeSelector';
import './AppWrapper.scss';
import apiWhoAmI from '@api/accounts/who-am-i';
import apiLogout from '@src/api/accounts/logout';

const hiddenOnLogin = ['/login', '/signup'];
const requireAuth = ['/manage-account', '/manage-rooms', '/join-room'];

export default function AppWrapper({page}: {page: JSX.Element}) {
  const isMobile = useMatches({
    base: true,
    xs: true,
    sm: false,
  });
  const [opened, {toggle, close}] = useDisclosure(false);
  const [checkingWhoAmI, {open: startChecking, close: doneChecking}] = useDisclosure(true);
  const [logginOut, {open: startLogout, close: doneLogout}] = useDisclosure(false);

  const loggedIn = useAppSelector(isLoggedIn);
  const username = useAppSelector(loggedInUsername);
  const dispatch = useAppDispatch();

  const navigate = useRef(useNavigate());

  useEffect(() => {
    startChecking();
    const controller = new AbortController();
    (async () => {
      const result = await apiWhoAmI(controller);
      if (!result) return;

      if (result.success) {
        dispatch(logIn(result.username));

        if (hiddenOnLogin.includes(window.location.pathname.toLowerCase())) {
          navigate.current('/');

          notifications.show({
            title: 'Already logged in',
            message: 'Redirecting away from login/signup screen',
            autoClose: 3_000,
          });
        }
      } else {
        dispatch(logOut());

        if (requireAuth.includes(window.location.pathname.toLowerCase())) {
          navigate.current('/login');
          notifications.show({
            title: 'Logged out',
            message: result.message,
            autoClose: 3_000,
          });
        }
      }
    })()
      .catch(() => {})
      .finally(doneChecking);

    return () => controller.abort();
  }, [dispatch, startChecking, doneChecking, navigate]);

  async function logout() {
    startLogout();

    const result = await apiLogout();
    if (!result) return doneLogout();

    if (result.success) {
      dispatch(logOut());
    } else {
      notifications.show({
        title: 'Failed to log you out',
        message: result.message,
        autoClose: 10_000,
      });
    }
    doneLogout();
  }

  function NavbarLink({label, to, icon}: {label: string; to: string; icon?: JSX.Element}) {
    return (
      <NavLink
        label={label}
        to={to}
        component={Link}
        leftSection={icon}
        active={window.location.pathname === to}
        onClick={close}
      ></NavLink>
    );
  }

  const loggedInNavLinks = (
    <>
      <NavbarLink label="Manage Account" to="/manage-account" icon={<FaGear />} />
      <NavbarLink label="Manage Rooms" to="/manage-accounts" icon={<FaUsersRectangle />} />
      <NavbarLink label="Create A Room" to="/join" icon={<FaPlus />} />
      <NavbarLink label="Join A Room" to="/join" icon={<FaRightToBracket />} />
    </>
  );
  const loggedOutNavLinks = (
    <>
      <NavbarLink label="Signup" to="/signup" icon={<FaUser />} />
      <NavbarLink label="Login" to="/login" icon={<FaArrowRightToBracket />} />
    </>
  );

  return (
    <AppShell
      header={{height: 60}}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: {mobile: !opened, desktop: !opened},
      }}
      padding="md"
    >
      <AppShell.Header>
        <Flex align={'center'} justify={'space-between'} h={60} p={'sm'}>
          <Flex align={'center'} justify={'space-between'}>
            <Burger opened={opened} onClick={toggle} />
            <Text
              style={{transform: 'translateY(0.1rem)'}}
              size="xl"
              fw={900}
              variant="gradient"
              gradient={{from: 'blue', to: 'teal', deg: 90}}
            >
              Live Video Sync
            </Text>
          </Flex>

          <div className="nav-right">
            <ThemeSelector showText={!isMobile} />
          </div>
        </Flex>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Box pos="relative" mih="100%">
          <LoadingOverlay visible={checkingWhoAmI} />

          {!checkingWhoAmI && (
            <Flex direction="column" mih="100%" justify="space-between">
              <div>{loggedIn ? loggedInNavLinks : loggedOutNavLinks}</div>
              <div>
                {loggedIn && (
                  <>
                    <NavLink
                      label={username}
                      to={'/account'}
                      component={Link}
                      leftSection={<FaUser />}
                      onClick={close}
                    ></NavLink>
                    <Button
                      leftSection={<FaArrowRightFromBracket />}
                      onClick={logout}
                      fullWidth
                      variant="default"
                      justify={'flex-start'}
                      loading={logginOut}
                    >
                      Log Out
                    </Button>
                  </>
                )}
              </div>
            </Flex>
          )}
        </Box>
      </AppShell.Navbar>

      <AppShell.Main h="1">{!checkingWhoAmI && page}</AppShell.Main>

      <AppShell.Footer>LiveVideoSync</AppShell.Footer>
    </AppShell>
  );
}
