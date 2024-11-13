import {Button, Center, Group, Paper, Text, TextInput} from '@mantine/core';
import {useForm} from '@mantine/form';
import {useDisclosure} from '@mantine/hooks';
import {notifications} from '@mantine/notifications';
import accountAPICreate from '@src/api/accounts/create';
import {logIn} from '@src/redux/reducers/loggedInUser';
import {useAppDispatch} from '@src/redux/store';
import {useNavigate} from 'react-router-dom';

export default function Signup() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [loading, {open: startLoading, close: stopLoading}] = useDisclosure(false);

  const form = useForm({
    mode: 'uncontrolled',
    initialValues: {
      username: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      confirmPassword: (value, values) => (value !== values.password ? 'Passwords do not match' : null),
    },
  });

  async function signup(value: typeof form.values) {
    startLoading();
    const result = await accountAPICreate(value.username, value.password);
    if (!result) return;

    if (result.success) {
      dispatch(logIn(value.username));
      navigate('/manage-rooms');
    } else if (result.statusCode === 400) {
      for (const err of result.requestErrors) {
        if (err.key === '/body/password') {
          form.setFieldError('password', err.message);
        }
        if (err.key === '/body/username') {
          form.setFieldError('username', err.message);
        }
      }
    } else {
      notifications.show({
        title: result.message,
        message: `Request Id: ${result.requestId}`,
        autoClose: false,
      });
    }

    stopLoading();
  }

  return (
    <Center h="60%">
      <Paper shadow="sm" withBorder p="xl" w="90%" maw="40rem">
        <Text size="xl" fw={900}>
          Create your account
        </Text>
        <br />

        <form onSubmit={form.onSubmit(signup)}>
          <TextInput label="Username" key={form.key('username')} {...form.getInputProps('username')} />
          <br />
          <TextInput label="Password" type="password" key={form.key('password')} {...form.getInputProps('password')} />
          <br />
          <TextInput
            label="Confirm Password"
            type="password"
            key={form.key('confirmPassword')}
            {...form.getInputProps('confirmPassword')}
          />

          <Group justify="flex-end" mt="md">
            <Button type="submit" variant="gradient" loading={loading}>
              Signup
            </Button>
          </Group>
        </form>
      </Paper>
    </Center>
  );
}
