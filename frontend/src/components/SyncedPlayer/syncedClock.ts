import EventEmitter from 'events';
import type SyncedClockInterface from './shared/syncedClockInterface';

const CLOCK_SYNC_API = '/roomSyncAPI/v1/clockSync';
const CLOCK_SYNC_INTERVAL = 10000;

export default class SyncedClockClient
  extends EventEmitter
  implements SyncedClockInterface
{
  private _timeOffset = 0;
  private _timeSyncLoop: NodeJS.Timeout | undefined;

  constructor() {
    super();
    this._syncTime = this._syncTime.bind(this);
    this._timeSyncLoop = setInterval(this._syncTime, CLOCK_SYNC_INTERVAL);
    this._syncTime();
  }

  private _syncTime() {
    const startTime = performance.now();
    let endTime: number;

    fetch(CLOCK_SYNC_API)
      .then(response => {
        endTime = performance.now();
        return response;
      })
      .then(response => response.json())
      .then(({timestamp}) => {
        const latency = (endTime - startTime) / 2;
        this._timeOffset = timestamp + latency - endTime;

        console.log(
          `Synced time with server. Latency: ${latency}, offest: ${this._timeOffset}, current timestamp: ${this.now()}`
        );
        this.emit('synced');
      });
  }

  now() {
    return performance.now() + this._timeOffset;
  }

  destroy() {
    clearInterval(this._timeSyncLoop);
    this.removeAllListeners();
  }
}
