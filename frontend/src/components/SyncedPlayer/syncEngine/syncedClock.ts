import EventEmitter from 'events';
import type SyncedClockInterface from './shared/syncedClockInterface';

const CLOCK_DRIFT_HISTORY_LEN = 5;
const CLOCK_SYNC_API = '/roomSyncAPI/v1/clockSync';
const CLOCK_SYNC_INTERVAL = 1000;

/**
 * SyncedClockClient
 *
 * Provides a syncronized timestamp (with no relation to real time) that is syncronized with the server's timestamp
 */
export default class SyncedClockClient
  extends EventEmitter
  implements SyncedClockInterface
{
  private _clockDriftHistory: number[] = [];
  private _timeOffset = 0;
  private _timeSyncLoop: NodeJS.Timeout | undefined;

  constructor() {
    super();
    this._syncTime = this._syncTime.bind(this);
    this._timeSyncLoop = setInterval(this._syncTime, CLOCK_SYNC_INTERVAL);
    this._syncTime();
  }

  private _syncTime() {
    const startTime = Date.now();
    let endTime: number;

    fetch(CLOCK_SYNC_API)
      .then(response => {
        endTime = Date.now();
        return response;
      })
      .then(response => response.json())
      .then(({timestamp}) => {
        const latency = (endTime - startTime) / 2;
        const drift = timestamp + latency - endTime;
        this._clockDriftHistory.push(drift);

        if (this._clockDriftHistory.length > CLOCK_DRIFT_HISTORY_LEN) {
          this._clockDriftHistory.shift();
        }

        this._timeOffset =
          this._clockDriftHistory.reduce((a, b) => a + b) /
          this._clockDriftHistory.length;

        console.log(
          `Synced time with server. Sync Latency: ${latency.toFixed(2)}\tLastest Drift: ${drift.toFixed(2)}\tOffest: ${this._timeOffset.toFixed(2)}\tCurrent Timestamp: ${this.now()}`
        );
        this.emit('synced');
      });
  }

  now() {
    return Date.now() + this._timeOffset;
  }

  destroy() {
    clearInterval(this._timeSyncLoop);
    this.removeAllListeners();
  }
}
