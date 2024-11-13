import {useDisclosure} from '@mantine/hooks';
import {AppShell, Box, Burger, Flex, LoadingOverlay, NavLink, Text, useMatches} from '@mantine/core';
import {Link} from 'react-router-dom';
import {FaArrowRightToBracket, FaGear, FaPlus, FaRightToBracket, FaUser, FaUsersRectangle} from 'react-icons/fa6';

import {useAppSelector} from '@src/redux/store';
import {isLoggedIn, loadingLogInState, loggedInUsername} from '@src/redux/reducers/loggedInUser';

import ThemeSelector from './ThemeSelector';
import AuthenticationVerifier from './AuthenticationVerifier';

import './AppWrapper.scss';
import LogoutButton from './LogoutButton';

export default function AppWrapper({page}: {page: JSX.Element}) {
  const isMobile = useMatches({
    base: true,
    xs: true,
    sm: false,
  });
  const [opened, {toggle, close}] = useDisclosure(false);

  const loading = useAppSelector(loadingLogInState);
  const loggedIn = useAppSelector(isLoggedIn);
  const username = useAppSelector(loggedInUsername);

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
      <NavbarLink label="Manage Rooms" to="/manage-rooms" icon={<FaUsersRectangle />} />
      <NavbarLink label="Create A Room" to="/create-room" icon={<FaPlus />} />
      <NavbarLink label="Join A Room" to="/join-room" icon={<FaRightToBracket />} />
    </>
  );
  const loggedOutNavLinks = (
    <>
      <NavbarLink label="Signup" to="/signup" icon={<FaUser />} />
      <NavbarLink label="Login" to="/login" icon={<FaArrowRightToBracket />} />
    </>
  );

  const header = (
    <Flex align={'center'} justify={'space-between'} h={60} p={'sm'}>
      <Flex align={'center'} justify={'space-between'}>
        <Burger opened={opened} onClick={toggle} />
        <Link to={loggedIn ? '/manage-rooms' : '/'} style={{textDecoration: 'none'}}>
          <Text
            style={{transform: 'translateY(0.1rem)'}}
            size="xl"
            fw={900}
            variant="gradient"
            gradient={{from: 'blue', to: 'teal', deg: 90}}
          >
            Live Video Sync
          </Text>
        </Link>
      </Flex>

      <div>
        <ThemeSelector showText={!isMobile} />
      </div>
    </Flex>
  );

  const navBar = (
    <>
      <Flex direction="column" mih="100%" justify="space-between">
        <div>{loggedIn ? loggedInNavLinks : loggedOutNavLinks}</div>
        <div>
          {loggedIn && (
            <>
              <NavLink
                label={username}
                to={'/manage-account'}
                component={Link}
                leftSection={<FaUser />}
                onClick={close}
              ></NavLink>
              <LogoutButton />
            </>
          )}
        </div>
      </Flex>
    </>
  );

  const footer = <>Copyright © 2024 | Bennett Ruichu Wu</>;

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
      <AuthenticationVerifier />
      <AppShell.Header>{header}</AppShell.Header>

      <AppShell.Navbar p="md">
        <Box pos="relative" mih="100%">
          <LoadingOverlay visible={loading} />
          {!loading && navBar}
        </Box>
      </AppShell.Navbar>

      <AppShell.Main h="1">{!loading && page}</AppShell.Main>

      <AppShell.Footer>{footer}</AppShell.Footer>
    </AppShell>
  );
}
