import type { Room } from '@live-video-sync/sync-protocol';

/** Live rooms, in memory. Rooms survive their last member leaving. */
export class RoomRepository {
  private readonly _rooms = new Map<string, Room>();

  public get(code: string): Room | undefined {
    return this._rooms.get(code);
  }

  public set(code: string, room: Room): void {
    this._rooms.set(code, room);
  }
}
