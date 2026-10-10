/** Client-side timing and correction rules. */
export interface EnginePolicy {
  /** Interval the host should call `tick` at. Documented here, used by the harness. */
  tickMs: number;
  pingMs: number;
  /** Time disconnected before the local player is paused. */
  disconnectGraceMs: number;
  /** Time without progress before a stall is reported. */
  stallMs: number;
  /** Drift below which nothing is corrected. */
  deadzoneS: number;
  /** Drift below which the rate is reset to 1 once nudging. */
  rateResetS: number;
  /** Drift below which the playback rate is nudged instead of seeking. */
  rateZoneS: number;
  rateMin: number;
  rateMax: number;
  /** rate = 1 - drift * rateGain, clamped. */
  rateGain: number;
  seekCooldownMs: number;
  logLimit: number;
  clockSamples: number;
}

export const DEFAULT_ENGINE_POLICY: EnginePolicy = {
  tickMs: 250,
  pingMs: 1000,
  disconnectGraceMs: 1000,
  stallMs: 300,
  deadzoneS: 0.1,
  rateResetS: 0.03,
  rateZoneS: 2,
  rateMin: 0.95,
  rateMax: 1.05,
  rateGain: 0.5,
  seekCooldownMs: 1000,
  logLimit: 500,
  clockSamples: 8,
};
