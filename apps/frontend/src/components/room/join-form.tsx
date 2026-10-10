import { useState } from 'react';

import { Button, Stack, TextInput } from '@mantine/core';

interface JoinFormProps {
  initialCode?: string;
  initialName?: string;
  codeLocked?: boolean;
  onSubmit: (code: string, name: string) => void;
}

/** Room code and display name entry. */
export function JoinForm({
  initialCode = '',
  initialName = '',
  codeLocked = false,
  onSubmit,
}: JoinFormProps) {
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState(initialName);
  const valid = code.trim() !== '' && name.trim() !== '';

  const submit = (event: Pick<Event, 'preventDefault'>) => {
    event.preventDefault();
    if (valid) onSubmit(code.trim(), name.trim());
  };

  return (
    <form onSubmit={submit}>
      <Stack>
        <TextInput
          label="Room code"
          value={code}
          disabled={codeLocked}
          onChange={(e) => {
            setCode(e.currentTarget.value);
          }}
          autoComplete="off"
          required
        />
        <TextInput
          label="Your name"
          value={name}
          onChange={(e) => {
            setName(e.currentTarget.value);
          }}
          maxLength={40}
          autoComplete="nickname"
          data-autofocus
          required
        />
        <Button type="submit" disabled={!valid}>
          Join
        </Button>
      </Stack>
    </form>
  );
}
