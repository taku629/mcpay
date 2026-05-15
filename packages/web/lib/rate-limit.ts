// Sliding-window rate limiter with pluggable backend.
//
//   - Default: in-process Map. Fine for single-instance dev.
//   - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, we use
//     Upstash's REST API to share the limit across instances (the only sane
//     option on Vercel / serverless).
//
// We implement the sliding window with sorted sets of timestamps:
//   ZREMRANGEBYSCORE key  -inf  (now - windowMs)   -- drop expired
//   ZADD              key  now   now-<rand>         -- record this hit
//   ZCARD             key                            -- count current hits
//   EXPIRE            key  windowSec                 -- TTL
// All four run in a single pipeline call.

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface Backend {
  hit(key: string, opts: RateLimitOptions): Promise<RateLimitResult>;
}

// --- in-memory backend ---------------------------------------------------

class MemoryBackend implements Backend {
  private buckets = new Map<string, number[]>();

  async hit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now();
    const cutoff = now - opts.windowMs;
    const hits = this.buckets.get(key) ?? [];
    while (hits.length > 0 && hits[0] < cutoff) hits.shift();

    if (hits.length >= opts.limit) {
      const retryAfterMs = Math.max(0, hits[0] + opts.windowMs - now);
      this.buckets.set(key, hits);
      return { ok: false, remaining: 0, retryAfterMs };
    }

    hits.push(now);
    this.buckets.set(key, hits);
    return { ok: true, remaining: opts.limit - hits.length, retryAfterMs: 0 };
  }

  prune() {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, hits] of this.buckets) {
      if (hits.length === 0 || hits[hits.length - 1] < cutoff) {
        this.buckets.delete(k);
      }
    }
  }
}

// --- Upstash REST backend ------------------------------------------------

class UpstashBackend implements Backend {
  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async hit(key: string, opts: RateLimitOptions): Promise<RateLimitResult> {
    const now = Date.now();
    const cutoff = now - opts.windowMs;
    const member = `${now}-${Math.random().toString(36).slice(2, 8)}`;
    const ttlSec = Math.ceil(opts.windowMs / 1000) + 1;

    const pipeline = [
      ["ZREMRANGEBYSCORE", key, "-inf", `(${cutoff}`],
      ["ZADD", key, String(now), member],
      ["ZCARD", key],
      ["EXPIRE", key, String(ttlSec)],
    ];

    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(pipeline),
    });

    if (!res.ok) {
      // Fail open — better to let traffic through than to drop it during a
      // Redis outage. Caller can still log.
      return { ok: true, remaining: opts.limit, retryAfterMs: 0 };
    }

    const out = (await res.json()) as Array<{ result: number | string }>;
    const count = Number(out[2]?.result ?? 0);

    if (count > opts.limit) {
      // Already over — find the oldest timestamp so we can hint a retry.
      const oldestRes = await fetch(`${this.url}/zrange/${encodeURIComponent(key)}/0/0/WITHSCORES`, {
        headers: { authorization: `Bearer ${this.token}` },
      });
      let retryAfterMs = opts.windowMs;
      if (oldestRes.ok) {
        const oldest = (await oldestRes.json()) as { result: string[] };
        const score = Number(oldest.result?.[1] ?? now);
        retryAfterMs = Math.max(0, score + opts.windowMs - now);
      }
      return { ok: false, remaining: 0, retryAfterMs };
    }

    return { ok: true, remaining: opts.limit - count, retryAfterMs: 0 };
  }
}

// --- backend selection ---------------------------------------------------

let cachedBackend: Backend | null = null;

function getBackend(): Backend {
  if (cachedBackend) return cachedBackend;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  cachedBackend = url && token ? new UpstashBackend(url, token) : new MemoryBackend();
  return cachedBackend;
}

// Async — production code paths await this.
export async function checkRateLimitAsync(
  key: string,
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  return getBackend().hit(key, opts);
}

// Synchronous wrapper that *only* uses the in-memory backend. Kept for routes
// that haven't been awaited yet — and as the fallback when Upstash isn't
// configured. New code should prefer the async variant.
const syncBackend = new MemoryBackend();
export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  // We don't await here so the API stays sync. If you need cross-instance
  // limits, switch the call site to checkRateLimitAsync.
  const upstashConfigured =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashConfigured) {
    void getBackend().hit(key, opts); // fire-and-forget for accuracy under load
  }
  // For correctness we still consult the local bucket — under burst the local
  // bucket protects this instance even if Upstash hasn't replied yet.
  // Use a dummy promise-skipping path.
  return syncHit(syncBackend, key, opts);
}

function syncHit(backend: MemoryBackend, key: string, opts: RateLimitOptions): RateLimitResult {
  // Reach into MemoryBackend's hit synchronously by reimplementing the trivial
  // body. (Keeping memory backend's interface async-uniform with Upstash
  // simplifies the contract everywhere else.)
  const anyBackend = backend as unknown as { buckets: Map<string, number[]> };
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  const hits = anyBackend.buckets.get(key) ?? [];
  while (hits.length > 0 && hits[0] < cutoff) hits.shift();
  if (hits.length >= opts.limit) {
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, hits[0] + opts.windowMs - now) };
  }
  hits.push(now);
  anyBackend.buckets.set(key, hits);
  return { ok: true, remaining: opts.limit - hits.length, retryAfterMs: 0 };
}

// Periodic prune of the local memory backend.
if (typeof setInterval !== "undefined") {
  setInterval(() => syncBackend.prune(), 5 * 60 * 1000).unref?.();
}
