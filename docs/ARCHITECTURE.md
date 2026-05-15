# Architecture

MCPay has four moving pieces. Two live in the author's environment (their MCP
server + the SDK). Two live on our side (the dashboard + the API).

```
┌─────────────────────┐         ┌─────────────────────┐
│ MCP client          │         │ MCP server author   │
│ (Claude Desktop,    │ tool    │  ┌──────────────┐   │
│  Cursor, etc.)      │ calls   │  │ MCP server   │   │
│                     │────────►│  │              │   │
│  uses customer's    │         │  │  wrapped by  │   │
│  MCPay API key      │         │  │  @mcpay/sdk  │   │
└─────────────────────┘         │  └──────┬───────┘   │
                                │         │           │
                                │  verify │ meter     │
                                │         ▼           │
                                │  ┌──────────────┐   │
                                │  │ MCPay client │   │
                                │  └──────┬───────┘   │
                                └─────────┼───────────┘
                                          │
                                          ▼
              ┌──────────────────────────────────────────────┐
              │ MCPay backend                                │
              │  ┌─────────────┐   ┌────────────────────┐    │
              │  │ POST /verify│   │ POST /usage        │    │
              │  └──────┬──────┘   └─────────┬──────────┘    │
              │         ▼                    ▼               │
              │       Postgres ◄────────────►                │
              │         │                                    │
              │         ▼                                    │
              │  Stripe Connect (payouts, invoicing)         │
              └──────────────────────────────────────────────┘
                                          │
                                          ▼
                                ┌───────────────────┐
                                │ Author's dashboard│
                                │  revenue, calls,  │
                                │  keys, payouts    │
                                └───────────────────┘
```

## Request lifecycle

1. **Author** registers a project on the MCPay dashboard. They get a
   `projectId` + `apiSecret`. They install `@mcpay/sdk` and wrap their server,
   passing pricing per tool.
2. **Author** ships their MCP server (npm / standalone / etc.) and lists it.
3. **Customer** signs up on the listing page, picks a billing plan, gets an
   `mcpay_live_...` API key.
4. **Customer** pastes the key into their MCP client config (Claude Desktop,
   Cursor, etc.). When the client calls a tool, the key flows through to the
   server.
5. **SDK** intercepts the call:
   - Calls `POST /v1/verify` with the project secret + customer key.
   - On success, records usage via `POST /v1/usage` (fire-and-forget).
   - Forwards the call to the real tool handler.
6. **Backend** rolls usage into monthly invoices and pays the author through
   Stripe Connect, minus the platform fee.

## Data model (sketch)

```sql
-- 1. Author accounts (Supabase Auth users + this side table)
authors (
  id text primary key,           -- supabase user id
  stripe_account_id text,        -- Stripe Connect account
  created_at timestamptz
)

-- 2. Projects (one per MCP server)
projects (
  id text primary key,           -- "prj_..."
  owner_id text references authors(id),
  name text,
  api_secret_hash text,          -- argon2 hash; secret shown once
  created_at timestamptz
)

-- 3. Pricing config (snapshot per project, versioned)
pricing_rules (
  project_id text references projects(id),
  tool_name text,
  type text,                     -- 'free' | 'per_call' | 'per_token' | 'monthly_unlimited'
  amount_usd numeric,
  amount_usd_per_1k numeric,
  amount_usd_per_month numeric,
  effective_from timestamptz,
  primary key (project_id, tool_name, effective_from)
)

-- 4. Customers (end users of an MCP server)
customers (
  id text primary key,           -- "cust_..."
  email text,
  stripe_customer_id text
)

-- 5. Customer API keys
customer_keys (
  api_key text primary key,      -- "mcpay_live_..."
  project_id text references projects(id),
  customer_id text references customers(id),
  monthly_budget_usd numeric,
  consumed_this_month_usd numeric default 0,
  created_at timestamptz,
  revoked_at timestamptz
)

-- 6. Usage events (the meter)
usage_events (
  id text primary key,
  project_id text references projects(id),
  api_key text references customer_keys(api_key),
  tool_name text,
  amount_usd numeric,
  tokens int,
  timestamp timestamptz
)
```

In the MVP repo, `packages/web/lib/store.ts` keeps an in-memory version of this
schema so the routes work without external services.

## Why this shape

- **Author's server stays in control**: we never proxy traffic. The SDK is a
  pure middleware. If MCPay is down (and `failOpen: true`), the server keeps
  working.
- **Fiat-first**: Stripe Connect handles KYC, tax forms, and payouts. We never
  hold author funds.
- **Self-hostable**: every backend call is a single HTTP request to a
  configurable `endpoint`. Authors can run their own.

## Open questions / future work

- **Real-time budget enforcement**: today the SDK trusts the cached
  `remainingBudgetUsd` for up to 60 seconds. For high-throughput servers we'll
  need a sliding-window counter (Redis).
- **Per-customer rate limits**: not in MVP — likely next milestone.
- **Webhooks**: authors will want `usage.recorded`, `invoice.finalized`, etc.
- **Python SDK**: planned. Same wire protocol.
