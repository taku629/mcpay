# X / Twitter ローンチスレッド（日本語＋英語2版）

> Internal launch artifact. Publish after Stripe live + api.mcpay.dev DNS.

## Account positioning

X bio（公開前に更新）:
```
19. Building MCPay — fiat billing for MCP servers. TS / Python.
github.com/taku629/mcpay
```

固定ツイート → 下記スレッドの1本目。

---

## EN thread (post first, peak time 09:00 ET)

**1/8**
There are 11,000+ MCP servers in the wild.
Fewer than 5% are monetized.

The rest can't justify the wiring: per-customer keys, metering, Stripe Connect, rate limits, invoicing.

I built the cash register so they don't have to.

🧵 MCPay — drop-in monetization for MCP servers.

**2/8**
The 3-line drop in:

```ts
const server = wrapMCPServer(new Server(...), {
  projectId, apiSecret,
  pricing: {
    search_web: { type: "per_call", amountUsd: 0.01 },
    ping: { type: "free" },
  },
});

server.setRequestHandler(CallToolRequestSchema, yourHandler);
```

The wrapper monkey-patches `setRequestHandler` so every CallTool is gated + metered. Free tools pass through.

**3/8**
Why fiat, not crypto?

Most MCP authors I've talked to don't want USDC. They want USD/JPY/EUR landing in their bank account every month, with proper invoices, in the same Stripe dashboard they already trust.

x402 and Lightning are great. MCPay is for everyone else.

**4/8**
Platform fee schedule:

- Under $1k GMV/month → **0%**
- $1k–$10k → 10%
- Over $10k → 5% + invoiced

We don't take a cut until you're making real money.
Stripe fees (2.9% + $0.30) are pass-through to the customer.

**5/8**
What ships in v0.1:

- @mcpay/sdk (TS) + mcpay (Python) — wire-compatible
- Next.js dashboard with public marketplace pages
- Stripe Connect Express onboarding
- Stripe Checkout (prepaid budgets) + webhook (signature verified)
- Supabase schema with RLS
- Sliding-window rate limit (Upstash)

**6/8**
Customer key handshake (open question, want your input):

Option A: `params.arguments._mcpayKey` — works with every MCP client today
Option B: `params._meta["x-mcpay-key"]` — needs MCP spec uptake
Option C: out-of-band HTTP header — needs HTTP MCP clients

Current default: A then B. Custom hook via `extractApiKey`.

**7/8**
What I'm not building (on purpose):

- A consumer marketplace. The MCP registry already exists.
- An MCP runtime / hosting. Lots of those.
- Anything that touches your tool logic. You ship tools, we ship the cash register.

Composable, not vertically integrated.

**8/8**
Repo: github.com/taku629/mcpay
Docs: github.com/taku629/mcpay/blob/main/docs/GETTING_STARTED.md

If you maintain an MCP server and want to switch on billing, I'll personally do the integration with you for the first 10 authors. DMs open.

— @taku629 (19, Japan, first OSS infra release)

---

## JP thread（日本語、米国スレ後 数時間ずらして投稿）

**1/8**
MCPサーバーが世界に11,000+。
そのうち収益化されているのは5%未満。

API key配布、メーター、Stripe Connect、レート制限、月次請求書 ── 全部書いてられないからみんな課金を諦めている。

そのレジ係を作りました。MCPayです。🧵

**2/8**
3行で組み込み:

```ts
const server = wrapMCPServer(new Server(...), {
  projectId, apiSecret,
  pricing: {
    search_web: { type: "per_call", amountUsd: 0.01 },
    ping: { type: "free" },
  },
});
```

wrapper が `setRequestHandler` をインターセプトして、CallToolごとに自動でAPI key検証＋計上。freeはそのまま素通り。

**3/8**
なぜ法定通貨か？

ヒアリングしたMCP作者の99%は USDC でなく「Stripeの管理画面で見慣れた円/ドル/ユーロが月末に振り込まれる」ことを望んでいる。
x402 や Lightning は素晴らしいけど、MCPayはそれ以外の人向け。

**4/8**
プラットフォーム手数料:

- 月GMV $1,000未満 → **0%**
- $1,000〜$10,000 → 10%
- $10,000以上 → 5% + 請求書

ちゃんと稼げるようになるまで僕らは1セントも取らない。Stripe側手数料(2.9% + $0.30)は顧客請求にパススルー。

**5/8**
v0.1で同梱:

- @mcpay/sdk (TS) + mcpay (Python、互換)
- Next.js ダッシュボード + プロジェクトごとの公開マーケットページ
- Stripe Connect Express オンボーディング
- Stripe Checkout（プリペイド）＋ Webhook（署名検証）
- Supabase スキーマ（RLS付き）
- Upstashベースのスライディングウィンドウrate limit

**6/8**
顧客API keyの受け渡し（仕様検討中、意見ください）:

A: `params.arguments._mcpayKey` ← 全クライアント対応、現在のデフォルト
B: `params._meta["x-mcpay-key"]` ← MCP仕様普及待ち
C: HTTPヘッダ ← HTTP transport前提

A→Bフォールバック既定、カスタムは `extractApiKey` フックで。

**7/8**
意図的に作らないもの:

- ❌ コンシューマー向けマーケットプレイス（公式registryと衝突）
- ❌ MCP ホスティング（他にいっぱい）
- ❌ ツールロジックに干渉する機能

「あなたはtoolを作る、僕らはレジを運ぶ」だけに集中。

**8/8**
リポ: github.com/taku629/mcpay
ドキュ: github.com/taku629/mcpay/blob/main/docs/GETTING_STARTED.md

MCPサーバー運営してる方で課金スイッチ入れたい人、最初の10名は僕が組み込みまで一緒にやります。DMどうぞ。

19歳、これが初めてのOSS infraリリースです。辛口フィードバック歓迎。
