export interface FakeNetworkOptions {
  latencyMs?: number;
  jitterMs?: number;
  /** Probability in [0, 1] that a droppable message is lost. */
  dropRate?: number;
  seed?: number;
}

interface QueuedDelivery {
  at: number;
  order: number;
  deliver: () => void;
}

/**
 * Delays, jitters, and optionally drops deliveries. Messages on the same
 * link never overtake each other, like TCP.
 */
export class FakeNetwork {
  private readonly _latencyMs: number;
  private readonly _jitterMs: number;
  private readonly _dropRate: number;
  private _random: () => number;

  private _queue: QueuedDelivery[] = [];
  private _lastDeliveryAt = new Map<string, number>();
  private _order = 0;

  public constructor(options: FakeNetworkOptions = {}) {
    this._latencyMs = options.latencyMs ?? 0;
    this._jitterMs = options.jitterMs ?? 0;
    this._dropRate = options.dropRate ?? 0;
    this._random = mulberry32(options.seed ?? 1);
  }

  /**
   * Schedules a delivery.
   * @param link ordering key, e.g. "server->alice"
   * @param droppable whether `dropRate` applies
   */
  public send(
    link: string,
    now: number,
    deliver: () => void,
    droppable = false,
  ): void {
    if (droppable && this._random() < this._dropRate) return;

    const jitter = (this._random() * 2 - 1) * this._jitterMs;
    const earliest = this._lastDeliveryAt.get(link) ?? 0;
    const at = Math.max(now + this._latencyMs + jitter, earliest);
    this._lastDeliveryAt.set(link, at);
    this._queue.push({ at, order: this._order++, deliver });
  }

  /** Runs every delivery due at or before `now`, in delivery order. */
  public deliverUntil(now: number): void {
    const due = this._queue
      .filter((d) => d.at <= now)
      .sort((a, b) => a.at - b.at || a.order - b.order);
    this._queue = this._queue.filter((d) => d.at > now);
    for (const delivery of due) delivery.deliver();
  }
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
