import {Button} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {notifications} from '@mantine/notifications';
import apiLogout from '@src/api/accounts/logout';
import {logOut} from '@src/redux/reducers/loggedInUser';
import {useAppDispatch} from '@src/redux/store';
import {FaArrowRightFromBracket} from 'react-icons/fa6';
import {useNavigate} from 'react-router-dom';

export default function LogoutButton() {
  const [logginOut, {open: startLogout, close: doneLogout}] = useDisclosure(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  async function logout() {
    startLogout();

    const result = await apiLogout();
    if (!result) return doneLogout();

    if (result.success) {
      dispatch(logOut());
      navigate('/');
    } else {
      if (result.statusCode === 400) return;

      notifications.show({
        title: 'Failed to log you out',
        message: result.message,
        autoClose: 10_000,
        position: 'top-center',
      });
    }
    doneLogout();
  }

  return (
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
  );
}
