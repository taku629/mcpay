# Billing reliability

## Correctness model implemented

Usage delivery now carries the SDK-generated request id through the API as the database event primary key. A retry returns `{ok:true, duplicate:true}` and never increments consumption twice. For a new event, the Postgres function locks the customer-key row, then checks tenant ownership, revocation, and available monthly budget before inserting the event and incrementing consumption in one transaction. Rollback covers either write failing.

The in-memory repository mirrors these externally visible outcomes without an `await` between validation and mutation. The server chooses the timestamp used for invoice windows, preventing caller-controlled backdating.

SDK metering is awaited in both languages. Failures remain non-fatal to an already successful tool invocation, but the bounded delivery attempt now completes before returning, reducing loss during process shutdown. Transient network failures, HTTP 429, and 5xx responses receive two retries by default with the same request id.

## Invoice audit

The monthly job uses deterministic Stripe idempotency keys for invoice creation, line creation, and finalization, plus a `(project, customer, month)` database key. This protects ordinary reruns. A crash after Stripe finalization but before `invoice_runs` persistence should be recovered by the same Stripe idempotency keys.

Residual concerns:

- The database `getInvoiceRun` then Stripe call is not a database lease. Concurrent cron workers rely on Stripe idempotency and may race when recording the unique row; classify unique conflicts as “skipped” rather than an error.
- Floating-point SDK prices become Postgres numeric values. Move public prices to integer micros/cents end-to-end before supporting large volume or more currencies.
- Monthly reset is independent of invoice aggregation. Running reset early does not alter immutable usage rows, but dashboard “consumed this month” can diverge around UTC month boundaries.
- Usage delivery has bounded retries but no durable client outbox. A server crash or sustained outage can still lose metering.
- Checkout webhook event idempotency remains a launch blocker as documented in the security audit.

## Migration

`0003_atomic_usage.sql` is additive and does not break the public API. It must be deployed before the updated usage route. During a rolling deployment, old route instances remain non-atomic, so drain or deploy the database first and minimize overlap.
