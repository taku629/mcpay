// Sliding-window rate limiter, in-memory. Adequate for single-instance dev.
// For multi-instance production, swap the buckets Map for Redis (key → list of
// timestamps) or use Upstash's @upstash/ratelimit which implements the same
// algorithm.

interface Bucket {
  hits: number[]; // unix-ms timestamps, monotonically increasing
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  const bucket = buckets.get(key) ?? { hits: [] };
  while (bucket.hits.length > 0 && bucket.hits[0] < cutoff) {
    bucket.hits.shift();
  }

  if (bucket.hits.length >= opts.limit) {
    const oldest = bucket.hits[0];
    const retryAfterMs = Math.max(0, oldest + opts.windowMs - now);
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterMs };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  return {
    ok: true,
    remaining: opts.limit - bucket.hits.length,
    retryAfterMs: 0,
  };
}

// Periodically prune cold buckets so unused keys don't leak memory.
if (typeof setInterval !== "undefined") {
  const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [key, bucket] of buckets) {
      if (bucket.hits.length === 0 || bucket.hits[bucket.hits.length - 1] < cutoff) {
        buckets.delete(key);
      }
    }
  }, PRUNE_INTERVAL_MS).unref?.();
}
