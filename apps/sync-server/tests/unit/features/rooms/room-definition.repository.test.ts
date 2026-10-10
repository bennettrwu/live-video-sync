import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { RoomDefinitionRepository } from '#src/features/rooms/room-definition.repository.js';
import { demoDefinition } from '#tests/utils/fakes.js';

describe('RoomDefinitionRepository', () => {
  let roomsDir: string;
  let repository: RoomDefinitionRepository;

  beforeAll(async () => {
    roomsDir = await mkdtemp(join(tmpdir(), 'rooms-'));
    await writeFile(
      join(roomsDir, 'demo.json'),
      JSON.stringify(demoDefinition),
    );
    await writeFile(join(roomsDir, 'broken.json'), '{ not json');
    await writeFile(
      join(roomsDir, 'mismatch.json'),
      JSON.stringify({ ...demoDefinition, code: 'other' }),
    );
    repository = new RoomDefinitionRepository({
      port: 0,
      host: '',
      roomsDir,
      mediaDir: '',
      logLevel: 'silent',
    });
  });
  afterAll(() => rm(roomsDir, { recursive: true, force: true }));

  it('reads a valid definition', async () => {
    // Act
    const definition = await repository.findByCode('demo');

    // Assert
    expect(definition).toEqual(demoDefinition);
  });

  it('returns null for a missing room', async () => {
    expect(await repository.findByCode('missing')).toBeNull();
  });

  it('returns null for a code that is not a plain name', async () => {
    expect(await repository.findByCode('../demo')).toBeNull();
    expect(await repository.findByCode('demo.json')).toBeNull();
  });

  it('throws for a file that is not a definition for that code', async () => {
    await expect(repository.findByCode('broken')).rejects.toThrow();
    await expect(repository.findByCode('mismatch')).rejects.toThrow(
      /invalid room definition/,
    );
  });
});
