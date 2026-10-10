import type { RoomDefinition } from '@live-video-sync/sync-protocol';

import {
  Simulation,
  type SimulationClientOptions,
} from '#src/testing/simulation.js';

export const definition: RoomDefinition = {
  code: 'abc',
  name: 'Movie night',
  media: [
    { id: 'ep1', name: 'Episode 1', url: '/media/ep1.m3u8' },
    { id: 'ep2', name: 'Episode 2', url: '/media/ep2.m3u8' },
  ],
};

/** 50 ms each way, media takes 200 ms to become ready. */
export const defaultClient: SimulationClientOptions = {
  network: { latencyMs: 50 },
  player: { loadLatencyMs: 200 },
};

export function clientWith(
  overrides: SimulationClientOptions,
): SimulationClientOptions {
  return {
    ...defaultClient,
    ...overrides,
    network: { ...defaultClient.network, ...overrides.network },
    player: { ...defaultClient.player, ...overrides.player },
  };
}

/**
 * A and B joined, episode 1 selected by A and playing for `playedMs`.
 * @returns the simulation, positioned just after play started
 */
export function playingRoom(
  clients: Record<string, SimulationClientOptions> = {
    A: defaultClient,
    B: defaultClient,
  },
  playedMs = 0,
): Simulation {
  const sim = new Simulation({ definition });
  for (const [name, options] of Object.entries(clients)) {
    sim.addClient(name, options);
  }
  sim.run(1500);

  sim.intent('A', { action: 'media', mediaId: 'ep1' });
  sim.run(1000);
  sim.intent('A', { action: 'play' });
  sim.run(playedMs);
  return sim;
}
