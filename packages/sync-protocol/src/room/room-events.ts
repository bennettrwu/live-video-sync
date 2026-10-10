import type { Member } from '../member.js';
import type { SharedIntent } from '../messages.js';

export type RoomEvent =
  | { kind: 'join'; member: Member }
  | { kind: 'leave'; connectionId: string }
  | { kind: 'intent'; connectionId: string; intent: SharedIntent }
  /** Re-evaluates stall ages. Nothing else. */
  | { kind: 'tick' };
