# MCPay

> **Drop-in monetization for MCP servers.** Add per-tool pricing to your Model Context Protocol server in 3 lines. Get paid in fiat via Stripe.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange.svg)]()

---

## Why MCPay?

There are 11,000+ MCP servers in the wild as of 2026. Fewer than 5% have any monetization. The handful that do are locked into crypto rails (x402, Lightning, USDC), platform marketplaces (Apify), or homemade auth — none of which the average TS/Python author wants to wire up.

**MCPay closes that gap.** Wrap your MCP server, set per-tool prices, and we handle:

- API-key issuance for your customers
- Per-call metering and rate limiting
- Stripe-based invoicing (fiat, not crypto)
- Payouts to you via Stripe Connect
- A dashboard with revenue + usage analytics

You ship tools. We ship the cash register.

## 30-Second Example

```ts
import { wrapMCPServer } from "@mcpay/sdk";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const server = new Server({ name: "my-mcp", version: "0.1.0" });

// existing tool registration ...

export default wrapMCPServer(server, {
  projectId: process.env.MCPAY_PROJECT_ID!,
  apiSecret: process.env.MCPAY_API_SECRET!,
  pricing: {
    "search_web":     { type: "per_call", amountUsd: 0.01 },
    "generate_image": { type: "per_call", amountUsd: 0.05 },
    "ping":           { type: "free" },
  },
});
```

That's it. Customers paste an MCPay-issued key into their MCP client config, calls get metered, you get paid monthly.

## Pricing (Platform)

| Tier         | Monthly GMV     | Platform fee |
| ------------ | --------------- | ------------ |
| **Starter**  | < $1,000        | **0%**       |
| **Standard** | $1,000–$10,000  | **10%**      |
| **Scale**    | > $10,000       | **5%** + invoiced |

Stripe fees are pass-through (2.9% + $0.30 / transaction, customer-facing).
We don't take a cut until you're earning real money.

## Repository Layout

```
mcpay/
├── packages/
│   ├── sdk-ts/         # @mcpay/sdk — TypeScript SDK for wrapping MCP servers
│   └── web/            # Next.js dashboard + auth + Stripe Connect
├── examples/
│   └── basic-server/   # Reference MCP server using the SDK
├── docs/
│   ├── ARCHITECTURE.md
│   └── GETTING_STARTED.md
└── README.md
```

## Roadmap

- [x] TypeScript SDK (core metering + auth)
- [x] Next.js dashboard skeleton
- [x] Stripe Connect onboarding flow
- [ ] Python SDK
- [ ] Per-customer rate limiting
- [ ] Usage-based invoicing (Stripe metered billing)
- [ ] Webhook system for usage events
- [ ] Self-hosted mode (BYO Postgres + Stripe)
- [ ] Marketplace listing page (discoverability)

## Getting Started

See [`docs/GETTING_STARTED.md`](docs/GETTING_STARTED.md).

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## License

MIT. Use it, fork it, ship monetized MCP servers.
