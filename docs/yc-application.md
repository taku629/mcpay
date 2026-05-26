# YC Application Draft — MCPay (W27 / S27)

> Internal draft. Update once: (1) revenue is non-zero, (2) cofounder is signed,
> (3) production secrets are live. Keep every answer ≤ recommended word count —
> YC partners read fast.

---

## Company

- **Company name:** MCPay
- **Company URL, if any:** https://github.com/taku629/mcpay (production app: pending DNS — `https://mcpay.dev`)
- **Phone number:** (founder personal — fill at submission)
- **Where do you live now, and where would the company be based after YC?**
  Currently Tokyo, Japan. Will relocate to SF for the batch and base the company in Delaware (US C-Corp) after YC.

---

## Founder(s)

### Why you?

> *(50 words max)*

I'm 19, self-taught, and have been shipping production TypeScript/Python infra
since I was 17. MCPay is my third SaaS this year (cp-coach, seikyu, mcpay) and
the only one I'm betting on full-time because it's the only one with a billion-dollar TAM. I write the code, the SDKs, the docs, and the launch copy myself.

### Please tell us about an interesting project, preferably outside of class or work, that two or more of you created together.

> *(solo at submission — answer reframes as "interesting project I shipped solo, here's the cofounder I'm bringing on")*

MCPay itself: a working TypeScript + Python SDK, Next.js dashboard with Stripe
Connect, Postgres/Supabase schema with RLS, scrypt-hashed API secrets,
sliding-window rate limiter, JWT verify (HS256 + RS256/ES256 via JWKS), and a
monthly aggregate-invoice cron — shipped in 6 weeks. Five commits, 35 passing
tests, MIT-licensed. https://github.com/taku629/mcpay

### How long have the founders known one another and how did you meet?

> *(fill once cofounder signed — for now: "actively recruiting a business/sales cofounder and an infra engineer; current candidates in pipeline")*

---

## Progress

### How far along are you?

Production-ready code (35 tests, strict tsc clean, security-reviewed). v0.1
public on GitHub with MIT license since 2026-05-19. Live deployment pending the
final DNS + Stripe production approval (in flight). 3 design-partner authors
identified, 0 paying customers yet — we want paying customers before we open
the doors, not after.

### How long have each of you been working on this? Have you been part-time or full-time? Please explain.

Founder: full-time since 2026-04. 6 weeks elapsed.

### What's new about what you make? What substitutes do people resort to because it doesn't exist yet (or they don't know about it)?

> *(120 words max)*

There are 11,000+ Model Context Protocol servers in the wild as of 2026 and
fewer than 5% have any monetization. The handful that do use crypto rails
(x402, Lightning, USDC), platform marketplaces (Apify), or homemade auth —
none of which the average TypeScript/Python author wants to wire up.

MCPay is **3 lines of code** that turn any MCP server into a paid service
billed in fiat via Stripe. We handle API-key issuance, per-call metering,
rate limits, monthly invoicing, and payouts to authors via Stripe Connect.
You write tools. We are the cash register for the agent economy.

The substitute today is "open-source it for free and hope someone hires you."

### Which of the following best describes your progress?

Launched / Production-ready, pre-revenue.

### How much money have you raised? From whom?

$0. No angel, no friends-and-family, no debt.

### Are people using your product? How many?

Public OSS users (GitHub stars / clones): tracked from 2026-05-22. Paying
customers: 0 — we are gating paid signup behind direct conversations to
ensure the first 10 authors actually get paid out.

---

## Idea

### Why did you pick this idea to work on? Do you have domain expertise in this area? How do you know people need what you're making?

> *(150 words max)*

I built two MCP servers myself in 2026 and immediately hit the same wall as
every other author: there is no obvious way to charge for tool calls. Stripe
alone doesn't help — the hard part is the gap between an MCP `CallTool`
request and a Stripe invoice line (per-customer keys, key verify without
latency spikes, per-tool pricing, monthly aggregation, Connect onboarding).
I shipped MCPay because nobody else was going to ship it before the agent
wave broke.

Domain expertise: I've shipped 4 production TypeScript/Python apps with
Stripe in the last 12 months. I read the MCP spec the week it dropped.
I'm the kind of person this product is for.

Demand evidence: 30+ public GitHub issues across MCP servers asking "how do
I charge for this?" — I've catalogued them. Conversations with 5 authors
all converged on "yes, but it has to be Stripe, not crypto."

### What's your competition, and what do you understand about your business that they don't?

> *(120 words max)*

- **x402 / Lightning / USDC rails:** crypto-only. Authors want USD/JPY/EUR in
  their bank, not USDC in a wallet.
- **Apify marketplace:** platform lock-in, not drop-in. Author has to migrate.
- **Stripe directly:** doesn't solve the MCP-specific gap (key verify, metering,
  per-tool pricing). Re-implemented by every author from scratch.
- **Anthropic shipping this themselves:** likely they will ship a first-party
  marketplace. We win on (a) being multi-client (Claude Desktop, Cursor, custom)
  and (b) being the plumbing, not the storefront — npm works fine even though
  GitHub has Packages.

What I understand that they don't: 99% of MCP value is in the long tail, not
the top 100. Top-down platforms lose the long tail. Bottom-up SDKs win it.

### How do or will you make money? How much could you make?

> *(100 words max)*

Take rate on author GMV, tiered:

- $0–$1k GMV/mo: **0%** (we don't take a cut until you're actually making money)
- $1k–$10k: 10%
- $10k+: 5% + invoiced enterprise terms

Stripe fees pass through to the customer. Conservative model: 1,000 active
authors × $500 GMV/mo × 8% blended take = **$480k ARR**. Aggressive: 10,000
authors × $1,000 GMV × 8% = **$9.6M ARR**.

TAM proxy: if 10% of MCP servers eventually monetize at $500/mo avg by 2028
(11k servers × 3× growth × 10% × $6k/yr × 8% take) = **~$160M annual fee
revenue floor** for the category. We want the picks-and-shovels position.

### Which category best applies to your company?

Developer Tools / Infrastructure / AI

### If you had any other ideas you considered applying with, please list them. One may be something we've been waiting for.

- **seikyu** — AI-powered invoicing for Japanese freelancers (Stripe + qualified
  invoice support + Claude email-to-quote). Built, deployed, maintenance-only
  because JP-TAM ceiling is too low for YC.
- **cp-coach** — competitive programming coach. Built, deployed, maintenance-only
  for the same reason.

I picked MCPay because it's the only one of the three with a path to a
billion-dollar outcome and the only one positioned in front of the
agent-economy wave.

### Why now? What recent changes have made it possible?

> *(80 words max)*

(1) MCP spec shipped Nov 2025 and stabilized in Q1 2026 — there is now a
single protocol surface to monetize against. (2) Claude Desktop, Cursor,
and OpenAI clients shipped MCP support inside 6 months, creating a real
distribution layer. (3) The number of public MCP servers crossed 10k in
April 2026 — large enough to support a long-tail SaaS, small enough that
we can still be the default before incumbents notice.

---

## Equity

### Have you incorporated, or formed any legal entity (like an LLC) yet?

Not yet. Will incorporate in Delaware (C-Corp) immediately on YC acceptance.

### Have you taken any investment yet?

No.

### Are you currently fundraising?

No. Will open a $1–2M post-YC SAFE round on Demo Day.

---

## Curious

### What convinced you to apply to Y Combinator?

> *(60 words max)*

Two reasons. (1) Japan does not have a venture ecosystem that funds 19-year-olds
building global B2B infra — the only realistic path to billion-grade outcomes
is US capital. (2) Picks-and-shovels infra companies (Stripe, Twilio, GitLab,
Vercel) disproportionately come from YC. The pattern is too clear to ignore.

### How did you hear about Y Combinator?

Read every YC Startup School essay since age 16. Worked through `paulgraham.com`
chronologically.

---

## Submission checklist

- [ ] Co-founder signed (or explicit solo-founder pitch ready)
- [ ] Production deploy live + paying customer ≥ 1
- [ ] Demo video (≤ 1 min, founder on camera, real Stripe payout shown)
- [ ] 5 design-partner reference contacts ready
- [ ] Personal financial runway statement (12+ months)
- [ ] English fluency proof if asked (record a 2-min walkthrough)
