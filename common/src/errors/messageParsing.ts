export class InvalidSyncMessage extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'INVALID_SYNC_MESSAGE';
  }
}

export class InvalidJsonMessage extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'INVALID_JSON_MESSAGE';
  }
}
