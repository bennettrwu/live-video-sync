import type { PlayerCommand } from './effects.js';
import type { CorrectionState } from './engine-state.js';
import type { EnginePolicy } from './policy.js';

export interface CorrectionInput {
  currentTime: number;
  target: number;
  paused: boolean;
}

/**
 * Decides how to close the gap between the local position and the target.
 * Small drift is ignored, moderate drift is absorbed by nudging the playback
 * rate, large drift seeks. A paused player can only seek.
 * @returns the updated correction state and the commands to issue
 */
export function correct(
  input: CorrectionInput,
  correction: CorrectionState,
  now: number,
  policy: EnginePolicy,
): { correction: CorrectionState; commands: PlayerCommand[] } {
  const drift = input.currentTime - input.target;
  const magnitude = Math.abs(drift);
  const canSeek = now - correction.lastSeekAt >= policy.seekCooldownMs;
  const commands: PlayerCommand[] = [];
  let next = correction;

  const resetRate = () => {
    if (next.rate !== 1) {
      commands.push({ type: 'rate', rate: 1 });
      next = { ...next, rate: 1 };
    }
  };
  const seek = () => {
    commands.push({ type: 'seek', time: input.target });
    next = { ...next, lastSeekAt: now };
    resetRate();
  };

  if (input.paused) {
    resetRate();
    if (magnitude >= policy.deadzoneS && canSeek) seek();
  } else if (magnitude < policy.deadzoneS) {
    if (magnitude < policy.rateResetS) resetRate();
  } else if (magnitude < policy.rateZoneS) {
    const rate = clamp(
      1 - drift * policy.rateGain,
      policy.rateMin,
      policy.rateMax,
    );
    if (rate !== next.rate) {
      commands.push({ type: 'rate', rate });
      next = { ...next, rate };
    }
  } else if (canSeek) {
    seek();
  }

  return { correction: next, commands };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
