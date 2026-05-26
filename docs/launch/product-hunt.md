# Product Hunt launch — MCPay

> Internal draft. Launch on **Tuesday or Wednesday, 00:01 PT** (Pacific midnight).
> Do not publish until production secrets + `api.mcpay.dev` DNS are live and a
> demo video is recorded.

---

## Tagline (≤ 60 chars)

```
Stripe-backed billing for MCP servers in 3 lines
```

Alternates:

- `The cash register for the 11,000+ MCP servers` (54)
- `Add per-tool pricing to your MCP server in 3 lines` (50)
- `Drop-in fiat billing for Model Context Protocol servers` (55)

## Description (≤ 260 chars)

```
There are 11,000+ MCP servers in the wild and <5% are monetized.
MCPay is 3 lines of code that wrap your MCP server with Stripe-backed
per-tool pricing — fiat, not crypto. Per-call / per-token / monthly.
0% platform fee under $1k GMV. TS + Python SDK. MIT.
```

## Topics (pick 4)

`Developer Tools` · `AI` · `Stripe` · `Open Source`

## First-comment (post immediately after launch)

```
Hey Hunters 👋 — I'm Takumu, 19, building MCPay solo from Tokyo.

Short story: I built two MCP servers this year and hit the same wall as
every other author — there's no obvious way to charge for tool calls.
Stripe alone doesn't solve it (per-customer keys, metering, per-tool
pricing, Connect payouts all need to be wired by hand). x402 / Lightning
route through crypto. I just want USD in my bank account.

So MCPay: wrap your MCP server, set per-tool prices, we run the cash
register. Stripe Connect for payouts. Per-call / per-token / monthly
plans. 0% under $1k GMV — we don't take a cut until you actually make
money.

What I'd love feedback on today:
1. Pricing model — does the 0% → 10% → 5% tier make sense to you?
2. Customer-key handoff — we use `params.arguments._mcpayKey` because
   no client supports per-server header injection yet. Better ideas?
3. The 5-minute Quickstart — please try it and tell me where it breaks.

Repo: https://github.com/taku629/mcpay
Docs: https://github.com/taku629/mcpay/blob/main/docs/GETTING_STARTED.md

I'll be here all day answering anything. Roast away.
```

## Gallery (in order)

1. **Hero shot** — Code snippet: `wrapMCPServer(...)` 3-line example overlaid
   on a soft gradient. Caption: "3 lines. Stripe. Done."
2. **Dashboard screenshot** — Real revenue chart from the demo project (use
   sandbox data, label as "demo data"). Caption: "Live revenue, no setup."
3. **Architecture diagram** — Re-render of the ASCII diagram from
   `devto-article.md` as a clean horizontal flow.
4. **Marketplace screenshot** — Public listing page for a sample MCP. Caption:
   "Every project gets a discoverable marketplace page."
5. **Pricing table** — 0% / 10% / 5% tiers visualized. Caption: "We don't
   eat until you do."

## Demo video (≤ 60 sec)

Script:

> 0–8s: "I'm Takumu, 19. I built MCPay because there are 11,000 MCP servers
>        and almost none of them get paid."
> 8–20s: Screen-record adding `wrapMCPServer` to an existing MCP server,
>        running `npm start`, calling a tool.
> 20–35s: Show the MCPay dashboard — call appears, $0.01 added.
> 35–48s: Cut to Stripe Connect dashboard — payout pending to author.
> 48–60s: "0% under $1k GMV, MIT-licensed, ships today. Link in the post."

Record vertical and horizontal. PH prefers 16:9; reuse vertical for X.

## Hunter strategy

- Default: self-hunt. PH no longer penalizes maker-hunted launches and
  reduces dependency on a high-rep hunter.
- If a high-rep hunter (>5k followers, prior infra launches) volunteers
  before launch day, accept. Otherwise self-hunt — do not delay.

## Pre-launch outreach (T-3 days)

- 10 MCP server authors from the `outreach.md` Tier A list — short DM with
  the PH preview link, asking for an upvote and one honest comment after
  launch. **No "please upvote" coordination on launch day** (against PH ToS).
- Personal network: post a heads-up to your followers 6 hours before
  launch, link to "follow us on PH to be notified" — *not* the live URL.

## Launch-day timing

- **00:01 PT** — go live (PH day rolls over at midnight Pacific).
- **00:05 PT** — post the first-comment.
- **00:10 PT** — DM the 10 pre-warmed contacts the live URL.
- **06:00 PT** — first response wave from EU.
- **09:00 PT** — US wakes; reply to every comment within 15 min for the
  next 6 hours.
- **18:00 PT** — re-share to JP/APAC audience.

## Post-launch (T+1)

- Recap thread on X: rank, votes, signups, top comments.
- Update `STATUS.md` with hard numbers.
- File any bugs reported during launch as GitHub issues with the `ph-launch`
  label.
