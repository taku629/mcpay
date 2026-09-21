// Bounded, dependency-free synthetic benchmark for the critical in-process
// auth lookup + idempotent metering + reporting aggregation path.
import { performance } from "node:perf_hooks";
import { createHash, timingSafeEqual } from "node:crypto";

const REQUESTS = Math.min(Number(process.env.LOAD_REQUESTS ?? 50_000), 200_000);
const CONCURRENCY = Math.min(Number(process.env.LOAD_CONCURRENCY ?? 50), 500);
const keys = new Map(Array.from({ length: 1_000 }, (_, i) => [`key_${i}`, { project: "p", consumed: 0 }]));
const seen = new Set();
const latencies = [];
const secretHash = createHash("sha256").update("benchmark-secret").digest();

async function operation(i) {
  const started = performance.now();
  const supplied = createHash("sha256").update("benchmark-secret").digest();
  if (!timingSafeEqual(secretHash, supplied)) throw new Error("auth failure");
  const id = `req_${i}`;
  if (!seen.has(id)) {
    seen.add(id);
    keys.get(`key_${i % keys.size}`).consumed += 0.001;
  }
  latencies.push(performance.now() - started);
}

const start = performance.now();
for (let offset = 0; offset < REQUESTS; offset += CONCURRENCY) {
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, REQUESTS - offset) }, (_, j) => operation(offset + j)));
}
const elapsed = performance.now() - start;
latencies.sort((a, b) => a - b);
const percentile = (p) => latencies[Math.min(latencies.length - 1, Math.floor(latencies.length * p))];
console.log(JSON.stringify({ requests: REQUESTS, concurrency: CONCURRENCY, throughputRps: +(REQUESTS / elapsed * 1000).toFixed(0), latencyMs: { p50: +percentile(.5).toFixed(4), p95: +percentile(.95).toFixed(4), p99: +percentile(.99).toFixed(4) }, uniqueEvents: seen.size, totalUsd: +[...keys.values()].reduce((s, k) => s + k.consumed, 0).toFixed(3) }));
