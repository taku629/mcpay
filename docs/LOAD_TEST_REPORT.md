# Bounded synthetic load report

Date: 2026-09-21 (UTC). Environment: repository container, Node.js local process. Command: `npm run test:load`.

## Workload and result

The dependency-free benchmark executed 50,000 operations at concurrency 50 over 1,000 customer keys. Every operation performed SHA-256 based secret comparison, key lookup, idempotency lookup/insert, consumption update, and final reporting aggregation. The run was bounded to at most 200,000 requests and made no network calls.

Observed result:

- Throughput: **103,920 operations/second**
- Latency: **p50 0.0028 ms**, **p95 0.0082 ms**, **p99 0.0250 ms**
- Integrity: **50,000 unique events**, **$50.000 aggregate**

## Interpretation and limits

This measures only in-process algorithm overhead, not Next.js, TLS, Supabase/Postgres row locks, connection pooling, Stripe, or network latency. It confirms the Map/Set hot path has no obvious CPU bottleneck and that bounded concurrency preserves totals. It is not a production capacity claim and should not be compared to hosted throughput.

Before launch, run a staging test against Supabase with no real payments: duplicate-heavy traffic, a single hot key at its budget boundary, many independent keys, revoked/cross-project keys, and injected database errors. Capture database p95/p99, lock waits, pool saturation, error rate, and exact accepted/duplicate/rejected totals.
