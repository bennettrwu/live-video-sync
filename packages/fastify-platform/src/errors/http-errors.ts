/**
 * An error that maps directly to an HTTP response. Thrown from controllers
 * and turned into `{ statusCode, code, message }` by the platform error
 * handler.
 */
export class HttpError extends Error {
  public constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface ErrorReply {
  statusCode: number;
  code: string;
  message: string;
}
