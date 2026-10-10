/**
 * Server clock offset estimation from ping/pong round trips (Cristian's
 * algorithm). The sample with the smallest round trip is trusted, since
 * queueing delay only ever adds to a round trip.
 */
export interface ClockSyncSample {
  /** Server clock minus local clock, ms. */
  offsetMs: number;
  rttMs: number;
}

export type ClockSyncSamples = readonly ClockSyncSample[];

/**
 * Adds one round trip to the window. A negative round trip (local clock
 * stepped mid-probe) is discarded.
 * @param sentAt local time the ping was sent
 * @param serverTime server time echoed in the pong
 * @param receivedAt local time the pong arrived
 * @returns the window, oldest samples dropped beyond `maxSamples`
 */
export function recordSample(
  samples: ClockSyncSamples,
  sentAt: number,
  serverTime: number,
  receivedAt: number,
  maxSamples: number,
): ClockSyncSamples {
  const rttMs = receivedAt - sentAt;
  if (!(rttMs >= 0)) return samples;

  const next = [
    ...samples,
    { offsetMs: serverTime - (sentAt + receivedAt) / 2, rttMs },
  ];
  return next.length > maxSamples ? next.slice(next.length - maxSamples) : next;
}

/** @returns the lowest-RTT sample, or null when there are none */
export function bestSample(samples: ClockSyncSamples): ClockSyncSample | null {
  let best: ClockSyncSample | null = null;
  for (const sample of samples) {
    if (best === null || sample.rttMs < best.rttMs) best = sample;
  }
  return best;
}

/** @returns server minus local clock in ms, or null when unsampled */
export function bestOffset(samples: ClockSyncSamples): number | null {
  return bestSample(samples)?.offsetMs ?? null;
}

/** @returns round trip of the trusted sample in ms, or null when unsampled */
export function bestRtt(samples: ClockSyncSamples): number | null {
  return bestSample(samples)?.rttMs ?? null;
}
