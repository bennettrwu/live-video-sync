/** Server-side timing rules for a room. */
export interface RoomPolicy {
  /** Stall age before the room clock freezes for everyone. */
  waitAfterMs: number;
  /** Stall age after which a member is assumed stuck and ignored. */
  stallExpireMs: number;
  /** Interval between unsolicited playback broadcasts. */
  snapshotMs: number;
  /** Log entries kept per room. */
  logLimit: number;
}

export const DEFAULT_ROOM_POLICY: RoomPolicy = {
  waitAfterMs: 1500,
  stallExpireMs: 30_000,
  snapshotMs: 2000,
  logLimit: 500,
};
