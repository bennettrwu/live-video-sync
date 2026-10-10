/** A clock that only moves when told to. */
export class VirtualClock {
  private _now = 0;

  public now(): number {
    return this._now;
  }

  public advance(ms: number): void {
    this._now += ms;
  }
}
