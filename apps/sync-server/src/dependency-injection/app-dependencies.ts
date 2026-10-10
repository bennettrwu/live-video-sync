import type { RoomPolicy } from '@live-video-sync/sync-protocol';

import type { AppConfig } from '../app-config.js';
import type { ProbesController } from '../features/probes/probes.controller.js';
import type { ConnectionRegistry } from '../features/rooms/connection.registry.js';
import type { RoomDefinitionRepository } from '../features/rooms/room-definition.repository.js';
import type { RoomSyncService } from '../features/rooms/room-sync.service.js';
import type { RoomRepository } from '../features/rooms/room.repository.js';
import type { RoomsController } from '../features/rooms/rooms.controller.js';

export interface AppDependencies {
  config: AppConfig;
  now: () => number;
  roomPolicy: RoomPolicy;
  roomDefinitionRepository: RoomDefinitionRepository;
  roomRepository: RoomRepository;
  connectionRegistry: ConnectionRegistry;
  roomSyncService: RoomSyncService;
  roomsController: RoomsController;
  probesController: ProbesController;
}
