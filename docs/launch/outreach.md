# Outreach plan — first 10 paying authors

Goal: 10 MCP server authors actively using MCPay within 90 days of launch.
"Active" = at least one paid CallTool routed through MCPay against a non-test
Stripe account.

## Tier A — direct DM, white-glove integration

Offer: I will personally do the integration in a paired session (Zoom or
async PRs), free of charge, in exchange for being named as a launch case
study. They keep 100% of net revenue for 6 months (no platform fee).

Hand-curated list — fill in after research, see "How to source" below.

| # | Author | Repo | Why a fit | Channel | Status |
|---|--------|------|-----------|---------|--------|
| 1 | _TBD_  |      |           |         | _pending_ |
| 2 |        |      |           |         |          |
| 3 |        |      |           |         |          |
| 4 |        |      |           |         |          |
| 5 |        |      |           |         |          |
| 6 |        |      |           |         |          |
| 7 |        |      |           |         |          |
| 8 |        |      |           |         |          |
| 9 |        |      |           |         |          |
|10 |        |      |           |         |          |

### How to source

Mine the following surfaces — pick repos with **≥ 100 stars and ≥ 1 commit
in the last 30 days**. Skip anything maintained by a company already running
its own billing (Linear, Notion, Replicate, Vercel, etc.).

1. `awesome-mcp-servers` on GitHub — top-starred third-party section.
2. `mcp.so` — sort by popularity, filter to community-built.
3. `pulse.mcp` directory — filter to non-corporate authors.
4. GitHub code search: `setRequestHandler` `CallToolRequestSchema`
   sorted by recently-updated.
5. NPM search: `@modelcontextprotocol/sdk` reverse-deps, filter to weekly
   downloads > 100.

### Disqualifying signals

- README says "free, no API, never". They explicitly do not want money.
- Repo is a personal toy project with < 5 stars.
- License is non-OSS / source-available (likely already commercial).
- Last commit > 6 months ago.

### Qualifying signals

- README explicitly mentions "API rate limits" or "please don't abuse" → they
  feel the pain.
- Issue tracker has feature requests labelled `enterprise`, `paid`,
  `commercial`.
- Author has a Twitter/X account and posts dev content (so the case study
  reaches their audience).

## Tier B — broadcast outreach

Channels (in order of expected ROI):

1. **MCP Discord** (the unofficial one with the most actives).
   - Post a single, well-formatted message in `#showcase` after Show HN.
   - Do not cross-post.
2. **`r/mcp`** (if alive at launch).
3. **`r/StripeDevs`** — angle: "We built a Stripe Connect wedge on top of
   MCP, here's the architecture."
4. **JP MCP Slack / Discord** — find the largest one through @kajitack /
   `mcp-jp` channel. Post the Zenn article, not the GitHub link.

## Tier C — passive inbound

- Add MCPay to `awesome-mcp-servers` (PR with the SDK section).
- Add MCPay to `mcp.so` directory.
- Add `monetization` topic + a clean repo description so GitHub topic search
  surfaces it.
- Submit `@mcpay/sdk` for the next `node_modules` weekly newsletter.

## Cold DM template (EN)

> Hey [name],
>
> I've been using [their MCP] for [specific use case I actually tried], so
> first — thanks for shipping it.
>
> Quick context: I built MCPay, a drop-in SDK that adds Stripe-based per-call
> billing to MCP servers. Three lines, fiat (not crypto), 0% platform fee
> under $1k GMV/month.
>
> If you'd ever consider charging for [their MCP] — even a few cents per
> call — I'd love to do the integration with you, free of charge, in
> exchange for being a launch reference. You'd keep 100% of revenue for the
> first six months (no platform fee).
>
> No commitment, just curious if "paid MCPs" is something you've thought
> about. Repo for your skim: https://github.com/taku629/mcpay
>
> — Takumu

## Cold DM template (JP)

> [名前]さん、はじめまして。
>
> [使った具体的なtool] で [自分のユースケース] に [their MCP] を使わせて
> いただいています。ありがとうございます。
>
> 簡単な自己紹介ですが、19歳の大学生で MCPay という MCPサーバー向けの
> Stripe課金SDKを作っています。3行で組み込めて、暗号資産ではなく法定通貨
> （日本円含む）でStripe経由の入金、月GMV $1,000未満なら手数料0%です。
>
> もし [their MCP] を有料化することを少しでも考えたことがあれば、最初の
> 10名の作者には僕が無料で組み込みまで一緒にやらせていただきたいです。
> 最初の6ヶ月は手数料も0%、launch事例として名前を出させてください。
>
> リポ: https://github.com/taku629/mcpay
>
> ご検討よろしくお願いします。
>
> — 拓夢
