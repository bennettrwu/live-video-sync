import type {LiveVideoSyncDB} from '@shared/live-video-sync-db/live-video-sync-db.js';

type FakeType = {[key: string]: () => FakeType} | Promise<void>;

export default function fakeDrizzelError(querySequence: Array<string>, error = new Error('Drizzle Error')) {
  const fake: FakeType = {};
  let current = fake;
  for (let i = 0; i < querySequence.length - 1; i++) {
    const temp = {};
    current[querySequence[i]] = () => temp;
    current = temp;
  }
  current[querySequence[querySequence.length - 1]] = () => new Promise((r, reject) => reject(error));

  return fake as unknown as LiveVideoSyncDB;
}
