import type SyncedClockInterface from './syncedClockInterface';

/**
 * SyncedState
 *
 * A class to mantain video playback state by keeping snapshots of state changes
 *
 * Assuming SyncedState objects are always provided synchronized clocks accurate to within: dt
 *
 * Two SyncedState objects are "synchronized" if calling getState() at the same time yields:
 *  - videoTime accurate between the two to within: 2 * dt
 *  - paused matches
 *  - bufferCount matches
 *  - mediaIndex matches
 *  - updateTime matches to within: dt
 *
 * The "true time" of the system is a idealized global time that remains consistent throughout the system
 *
 * Design Goals:
 * - Calling getState() always returns an up to date (updateTime = now) snapshot of the state
 * - Two "synchronized" SyncedState objects remain "synchronized" when
 *    - play() is called on both at the exact same "true time"
 *    - pause() is called on both at the exact same "true time"
 *    - seek(x) is called on both at the exact same "true time" with the same value x
 *    - addBuffering() is called on both at the exact same "true time"
 *    - subBuffering() is called on both at the exact same "true time"
 *    - setMediaIndex() is called on both at the exact same "true time"
 * - Given SyncedState objects ss0, ss1, calling ss1.setState(ss0.getState()) results in:
 *    - ss1 becoming "synchronized" with ss0
 *    - ss0 does not change state
 */
export default class SyncedState {
  private _state; // A snapshot of the state at a given timestamp

  constructor(private _clock: SyncedClockInterface) {
    this._state = {
      paused: true,
      videoTime: 0,
      bufferingCount: 0,
      mediaIndex: 0,
      updateTime: this._clock.now(),
    };
  }

  private _videoTimeAt(timestamp = this._clock.now()) {
    // If we are not actively playing back, the videoTime
    // is the same as state snapshot
    if (this._state.bufferingCount > 0) return this._state.videoTime;
    if (this._state.paused) return this._state.videoTime;

    // If we are actively playing back, we need to compute the videoTime
    // based on the snapshot time and current time
    return this._state.videoTime + (timestamp - this._state.updateTime) / 1000;
  }

  /**
   * Updates the target state snapshot to the current timestamp
   * Should be called BEFORE every state change
   */
  private _updateVideoTime(timestamp = this._clock.now()) {
    this._state.videoTime = this._videoTimeAt(timestamp);
    this._state.updateTime = timestamp;
  }

  play(timestamp?: number) {
    this._updateVideoTime(timestamp);
    this._state.paused = false;
    return this._state.updateTime;
  }

  pause(timestamp?: number) {
    this._updateVideoTime(timestamp);
    this._state.paused = true;
    return this._state.updateTime;
  }

  seek(videoTime: number, timestamp?: number) {
    this._updateVideoTime(timestamp);
    this._state.videoTime = videoTime;
    return this._state.updateTime;
  }

  addBuffering(timestamp?: number) {
    this._updateVideoTime(timestamp);
    this._state.bufferingCount++;
    return this._state.updateTime;
  }

  subBuffering(timestamp?: number) {
    this._updateVideoTime(timestamp);
    this._state.bufferingCount--;
    return this._state.updateTime;
  }

  setMediaIndex(index: number, timestamp?: number) {
    this._updateVideoTime(timestamp);
    this._state.videoTime = 0;
    this._state.mediaIndex = index;
    return this._state.updateTime;
  }

  getState() {
    const timestamp = this._clock.now();
    return Object.freeze({
      paused: this._state.paused,
      videoTime: this._videoTimeAt(timestamp),
      bufferingCount: this._state.bufferingCount,
      mediaIndex: this._state.mediaIndex,
      updateTime: timestamp,
    });
  }

  setState(
    state: Readonly<{
      paused: boolean;
      videoTime: number;
      bufferingCount: number;
      mediaIndex: number;
      updateTime: number;
    }>
  ) {
    if (this._state.updateTime > state.updateTime) return;
    this._state = Object.assign(this._state, state);
  }
}
