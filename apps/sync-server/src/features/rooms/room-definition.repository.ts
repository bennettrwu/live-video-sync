import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Check } from 'typebox/value';

import {
  type RoomDefinition,
  RoomDefinitionSchema,
} from '@live-video-sync/sync-protocol';

import type { AppConfig } from '../../app-config.js';

const CODE_PATTERN = /^[a-z0-9-]+$/i;

/**
 * Room definitions as JSON files, one per code, in the configured rooms
 * directory.
 */
export class RoomDefinitionRepository {
  private readonly _roomsDir: string;

  public constructor(config: AppConfig) {
    this._roomsDir = config.roomsDir;
  }

  /**
   * @returns the definition, or null when no such room exists
   * @throws when the file exists but is not a valid definition for that code
   */
  public async findByCode(code: string): Promise<RoomDefinition | null> {
    if (!CODE_PATTERN.test(code)) return null;

    const raw = await this._read(join(this._roomsDir, `${code}.json`));
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!Check(RoomDefinitionSchema, parsed) || parsed.code !== code) {
      throw new Error(`invalid room definition for "${code}"`);
    }
    return parsed;
  }

  private async _read(path: string): Promise<string | null> {
    try {
      return await readFile(path, 'utf8');
    } catch (error) {
      if (isMissingFile(error)) return null;
      throw error;
    }
  }
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
