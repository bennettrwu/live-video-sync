import { type AwilixContainer, asClass, asValue } from 'awilix';

import { registerDependencies } from '@live-video-sync/fastify-platform';
import {
  DEFAULT_ROOM_POLICY,
  type RoomPolicy,
} from '@live-video-sync/sync-protocol';

import type { AppConfig } from '../app-config.js';
import { ProbesController } from '../features/probes/probes.controller.js';
import { ConnectionRegistry } from '../features/rooms/connection.registry.js';
import { RoomDefinitionRepository } from '../features/rooms/room-definition.repository.js';
import { RoomSyncService } from '../features/rooms/room-sync.service.js';
import { RoomRepository } from '../features/rooms/room.repository.js';
import { RoomsController } from '../features/rooms/rooms.controller.js';
import type { AppDependencies } from './app-dependencies.js';

export interface DependencyOverrides {
  now?: () => number;
  roomPolicy?: RoomPolicy;
}

/**
 * Wires every class the server uses. Tests override the clock and policy.
 */
export function registerAppDependencies(
  container: AwilixContainer<AppDependencies>,
  config: AppConfig,
  overrides: DependencyOverrides = {},
): void {
  registerDependencies(container, {
    config: asValue(config),
    now: asValue(overrides.now ?? Date.now),
    roomPolicy: asValue(overrides.roomPolicy ?? DEFAULT_ROOM_POLICY),
    roomDefinitionRepository: asClass(RoomDefinitionRepository).singleton(),
    roomRepository: asClass(RoomRepository).singleton(),
    connectionRegistry: asClass(ConnectionRegistry).singleton(),
    roomSyncService: asClass(RoomSyncService)
      .singleton()
      .disposer((service) => {
        service.dispose();
      }),
    roomsController: asClass(RoomsController).singleton(),
    probesController: asClass(ProbesController).singleton(),
  });
}
