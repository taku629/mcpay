# TypeScript / Python SDK compatibility

## Verified contract

| Scenario | TypeScript | Python |
|---|---|---|
| 2xx valid `{ok:boolean}` | Parsed and cached for 60s | Parsed and cached for 60s |
| 401/403/other 4xx | Fail closed; no retry | Fail closed; no retry |
| 429 or 5xx | Up to `maxRetries` retries | Up to `max_retries` retries |
| Network error / timeout | Bounded retry, then fail closed (or explicit fail-open) | Bounded retry, then fail closed (or explicit fail-open) |
| Malformed JSON/schema | Fail closed | Fail closed |
| Usage reporting failure | Does not fail completed tool | Does not fail completed tool |
| Usage completion | Awaited before middleware returns | Awaited before middleware returns |

Defaults are a 5-second request deadline and two retries. TypeScript exposes `timeoutMs`/`maxRetries`; Python exposes `timeout_seconds`/`max_retries`. Both preserve the idempotency request id across retries.

## Compatibility fixes

Previously TypeScript had no deadline or retry and detached usage reporting, while Python had a timeout and awaited usage. Python could also throw on malformed JSON while TypeScript converted parsing errors through its failure path. The clients now share failure and retry semantics, and regression tests use only local mock transports.

## Remaining differences

- Python accepts an injectable `httpx.AsyncClient`; TypeScript relies on the global `fetch` implementation.
- Retry loops intentionally have no delay yet. Add capped exponential backoff with jitter and honor `Retry-After` before high-volume release.
- A verification success cache can permit a revoked key for up to 60 seconds. Make TTL configurable or add revocation push for stricter products.
- `failOpen` is dangerous for paid tools and must remain disabled in production.
