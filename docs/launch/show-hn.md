# Show HN — MCPay launch draft

> Internal launch artifact. Do not publish until production secrets (Stripe live,
> Supabase prod, Upstash, api.mcpay.dev DNS) are in place. See `docs/launch/checklist.md`.

---

## Title (≤ 80 chars)

```
Show HN: MCPay – Stripe-backed billing for Model Context Protocol servers
```

Alternates (pick whichever performs better in `Show HN` peer-test):

- `Show HN: I made my MCP server generate $0.05 today – and shipped the SDK that did it`
- `Show HN: Drop-in monetization for MCP servers (3 lines, fiat via Stripe)`

## URL

`https://github.com/taku629/mcpay`

## Body

```
There are 11,000+ MCP servers in the wild and fewer than 5% are monetized.
The handful that are use crypto rails (x402, Lightning, USDC), platform
marketplaces (Apify), or homemade auth — none of which the average TS/Python
author wants to wire up.

MCPay is a drop-in SDK + dashboard that gives an MCP server a real cash
register in 3 lines:

    const server = wrapMCPServer(
      new Server({ name: "my-mcp", version: "0.1.0" }, { capabilities: { tools: {} } }),
      {
        projectId: process.env.MCPAY_PROJECT_ID!,
        apiSecret: process.env.MCPAY_API_SECRET!,
        pricing: {
          search_web: { type: "per_call", amountUsd: 0.01 },
          ping:       { type: "free" },
        },
      },
    );

The wrapper monkey-patches `setRequestHandler`, so any CallTool handler you
register is automatically gated on a customer's MCPay key and metered. Free
tools pass through untouched. Pricing is per-call, per-token, or
monthly-unlimited.

What's in the box:
- @mcpay/sdk (TS, MIT) and mcpay (Python, MIT, wire-compatible)
- Next.js dashboard with a public marketplace listing per project
- Stripe Connect Express onboarding for authors (real fiat payouts, not crypto)
- Stripe Checkout for customers to top up a prepaid budget
- Stripe webhook with signature verification + JWT verify (HS256 + RS256/ES256 via JWKS)
- Postgres/Supabase schema with RLS, scrypt-hashed api_secrets, sliding-window
  rate limiter (in-memory + Upstash backends), monthly aggregate-invoice cron

Platform fee: 0% under $1k GMV/mo, 10% to $10k, 5% + invoiced above. We don't
take a cut until you're actually making money. Stripe fees are pass-through.

A few things I'm still working on and would love feedback on:

1. The customer-key handshake. Right now clients pass the key as
   `params.arguments._mcpayKey` because no MCP client supports per-server
   header injection yet. `params._meta["x-mcpay-key"]` is also accepted and
   I'm hoping that becomes the convention.
2. The author-side webhook system for usage events (so authors can build
   their own billing dashboards on top).
3. Whether `per_token` billing should be priced on input + output tokens or
   only one side. I currently bill whatever the tool reports in `_meta.tokens`.

Repo: https://github.com/taku629/mcpay
Docs: https://github.com/taku629/mcpay/blob/main/docs/GETTING_STARTED.md
Architecture: https://github.com/taku629/mcpay/blob/main/docs/ARCHITECTURE.md

Happy to answer questions. I'm 19 and this is my first real OSS infra release,
so honest tough feedback is the point of the post.
```

## First-comment tactics

Pre-write 3 candidate responses to the most likely critical comments, post one
within the first 30 minutes:

1. **"Why not just use Stripe directly?"**
   The hard part isn't Stripe — it's the gap between an MCP `CallTool` request
   and a Stripe invoice line. You need: per-customer API keys, key verify on
   every call without latency spikes, rate limits, per-tool pricing models,
   monthly aggregation, Connect onboarding for the author. MCPay is that gap.

2. **"Anthropic will ship this in three months."**
   They might. Two responses: (a) the SDK is MIT and the schema is in-repo,
   so worst case it's a free open-source thing more people get to use; (b)
   marketplaces never beat plumbing — `npm publish` works fine even though
   GitHub has Packages.

3. **"How is this different from x402 / Lightning?"**
   x402 routes through crypto rails. Most MCP authors I've talked to want
   USD/JPY/EUR landing in their bank account, not USDC. MCPay is Stripe-only
   on purpose.

## Posting time

Best Show HN windows (US):
- Tue–Thu, 09:00–11:00 ET
- Avoid Mondays (front-page churn) and Fridays (dead by EU evening).

Target: **Tuesday or Wednesday 9:30 ET**. Be online for at least the next 4
hours to reply to comments. Front-page slot is decided in the first 90 minutes.
