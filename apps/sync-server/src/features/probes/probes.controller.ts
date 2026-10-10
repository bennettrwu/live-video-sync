export class ProbesController {
  public liveness(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
