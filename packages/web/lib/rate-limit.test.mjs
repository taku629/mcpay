// Tests the in-memory rate limiter logic. Inlined to avoid TS build deps —
// kept in lockstep with lib/rate-limit.ts (MemoryBackend portion).

import test from "node:test";
import assert from "node:assert/strict";

function makeBucket() {
  return { hits: [] };
}

function hit(buckets, key, opts) {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  const bucket = buckets.get(key) ?? makeBucket();
  while (bucket.hits.length > 0 && bucket.hits[0] < cutoff) bucket.hits.shift();
  if (bucket.hits.length >= opts.limit) {
    const retryAfterMs = Math.max(0, bucket.hits[0] + opts.windowMs - now);
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfterMs };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: opts.limit - bucket.hits.length, retryAfterMs: 0 };
}

test("allows requests under limit", () => {
  const buckets = new Map();
  for (let i = 0; i < 5; i++) {
    const r = hit(buckets, "k", { limit: 10, windowMs: 1000 });
    assert.equal(r.ok, true);
  }
});

test("blocks once limit reached", () => {
  const buckets = new Map();
  for (let i = 0; i < 3; i++) hit(buckets, "k", { limit: 3, windowMs: 60_000 });
  const r = hit(buckets, "k", { limit: 3, windowMs: 60_000 });
  assert.equal(r.ok, false);
  assert.equal(r.remaining, 0);
  assert.ok(r.retryAfterMs > 0);
});

test("keys are independent", () => {
  const buckets = new Map();
  hit(buckets, "a", { limit: 1, windowMs: 60_000 });
  const blockA = hit(buckets, "a", { limit: 1, windowMs: 60_000 });
  const allowB = hit(buckets, "b", { limit: 1, windowMs: 60_000 });
  assert.equal(blockA.ok, false);
  assert.equal(allowB.ok, true);
});

test("recovers after window passes", async () => {
  const buckets = new Map();
  hit(buckets, "k", { limit: 1, windowMs: 30 });
  await new Promise((r) => setTimeout(r, 40));
  const r = hit(buckets, "k", { limit: 1, windowMs: 30 });
  assert.equal(r.ok, true);
});
