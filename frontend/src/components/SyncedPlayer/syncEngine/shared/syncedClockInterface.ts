/**
 * SyncedClockInterface
 *
 * Simple interface for a clock object that provides timestamps
 * Used by SyncedState object
 */
export default interface SyncedClockInterface {
  now(): number;
}
