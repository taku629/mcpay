---
title: "MCPサーバーをStripeで収益化する仕組みを作った話 (MCPay v0.1)"
emoji: "💸"
type: "tech"
topics: ["mcp", "stripe", "ai", "saas", "typescript"]
published: false
---

> Internal draft. 公開前にスクリーンショット差し替え + Stripe入金画面の実例を追加。

## TL;DR

- **MCPサーバーに3行で課金を入れるSDK + ダッシュボードを作った**
- Stripe Connect で作者に法定通貨で入金、x402/Lightningのcryptoに依存しない
- `wrapMCPServer(new Server(...), { pricing })` を呼ぶだけで `setRequestHandler` がインターセプトされ、CallToolごとに自動でAPI key検証＋メーター
- Platform手数料は月GMV $1k未満なら0%。最初に稼ぐ人を応援するのが目的
- v0.1 リポ: https://github.com/taku629/mcpay

## なぜ作ったか

2026年現在、MCPサーバーは公開されているだけで **11,000本以上**。LinearやNotionのような企業MCPは自前の課金を持っているが、個人が作った長尾のMCPサーバーの99%は無料配布のまま埋もれている。理由はシンプルで、

- API key の発行と検証
- 呼び出しごとのメーター記録
- 月次の集計と請求書発行
- Stripe Connectで作者に分配
- レート制限

これを全部書く時間が、最初の1ドルを得るためのROIに見合わない。

既存の選択肢として x402, Lightning Network, Apify Marketplace があるが、TS/Pythonで書いたMCPを「とりあえずStripeで¥980/月の課金を入れて様子を見たい」というニーズには、どれも回り道。

それなら**Stripeに薄く被せた共通インフラ**を作ろう、というのがMCPayの出発点。

## 一番ハマったところ: 3-line drop-inの実装

READMEで「3行で組み込めます」と書くのは簡単だが、最初の実装はそうなっていなかった。

```ts
// Before: 「3行」と書きつつ実際は何もしていなかった
export function wrapMCPServer(server, config) {
  server.__mcpay = { /* ... */ };  // ← マーカーを生やすだけ
  return server;
}
```

これだとユーザーが `wrapMCPServer(server, {...})` を呼んでも、tool呼び出し時に何もインターセプトされない。READMEのマーケコピーと実装が一致していなかった。

修正版は `setRequestHandler` をモンキーパッチして、CallTool schema 用のハンドラーだけを middleware でラップする:

```ts
export function wrapMCPServer<S extends MinimalMCPServer>(server: S, config: MCPayConfig): S {
  const middleware = createMCPayMiddleware<unknown>(config);
  const original = server.setRequestHandler;
  const bound = original.bind(server);

  server.setRequestHandler = (schema, handler) => {
    const isCallTool = looksLikeCallToolSchema(schema);

    const wrapped = async (...args) => {
      const req = args[0];
      if (!isCallTool && !looksLikeCallToolRequest(req)) {
        return handler(...args);
      }

      const toolName = req.params.name;
      const apiKey = extractApiKey(req);

      try {
        return await middleware({ toolName, apiKey }, () => handler(...args));
      } catch (err) {
        if (err instanceof MCPayError) {
          return {
            content: [{ type: "text", text: `[mcpay/${err.code}] ${err.message}` }],
            isError: true,
          };
        }
        throw err;
      }
    };

    return bound(schema, wrapped);
  };

  return server;
}
```

ポイント:

1. **schemaの判定を構造で行う**: `CallToolRequestSchema` を import すると `@modelcontextprotocol/sdk` への依存を強制してしまう。なので zodスキーマの内部構造 (`schema.shape.method.value === "tools/call"`) を sniff する。
2. **CallTool以外は素通し**: ListTools, ListPrompts などのスキーマ用ハンドラーは中身に触らない。
3. **MCPayErrorはMCPの規約に従う構造化エラーに変換**: `{ isError: true, content: [...] }` を返す。throwしない。

## 顧客API keyの渡し方問題

これが地味に難しい。MCP公式仕様には「サーバー単位の認証ヘッダ」がまだない。

候補:

| 方法 | 互換性 | 採用 |
|---|---|---|
| `params.arguments._mcpayKey` | 全クライアント対応 | デフォルト |
| `params._meta["x-mcpay-key"]` | MCP仕様の普及待ち | フォールバック |
| HTTP ヘッダ | HTTP transport限定 | カスタムフック |

MCPayは A → B の順で見て、足りなければ `extractApiKey(req)` フックを上書きできる設計にした。Claude Desktop / stdio transport の現状を考えると当面はAが現実解。

## アーキテクチャ全景

```
MCP Client            MCP Server (yours)              MCPay API (ours)
   │                       │                              │
   │  CallTool {           │                              │
   │   _mcpayKey: ...   ───┤                              │
   │  }                    │                              │
   │                       │── verify(key) ──────────────►│
   │                       │◄──── ok, budget, customerId─│
   │                       │                              │
   │                       │── runYourTool() ─┐           │
   │                       │                  │           │
   │                       │◄─── result ──────┘           │
   │                       │── recordUsage(amount, ...)──►│  fire-and-forget
   │◄──── tool result ─────│                              │
                                                          │
                                                  Monthly cron:
                                                  - aggregate usage
                                                  - create Stripe invoice
                                                  - payout to author via Connect
```

## エコノミクス

「11,000サーバーあるけど99%は月$1も稼いでいない」という長尾市場で、プラットフォーム手数料をどう設計するか?

最終的に「最初は0%、稼ぎ始めたら10%」にした:

| 月GMV | 手数料 |
|---|---|
| $0 – $1,000 | **0%** |
| $1,000 – $10,000 | 10% |
| $10,000+ | 5% + 請求書 |

Stripe側の手数料 (2.9% + $0.30) は顧客請求にパススルー。

これがビジネスとして成立するためには、ロングテールではなくミッドテール（月$100〜$10,000稼ぐMCP）が500〜1,000本必要。なので最初の戦略は**多数の小さな成功事例を作る**こと: 「MCPay入れたら月$50だけど自動で振り込まれた」体験を10人ぶん作って、Show HN / Zenn / X で公開していく。

## 19歳、初めてのOSSインフラ

僕は19歳の大学生で、これが初めての本格的なOSSインフラリリース。19歳でStripe Connect とMCPゲートウェイを書くのは正直しんどかったが、Cursor / Claude Code / Codex CLI のサポートで Stripe webhook 署名検証や JWT verify (HS256 + JWKS) もちゃんと書けた。

ロードマップ:

- [x] TS / Python SDK
- [x] Stripe Connect onboarding
- [x] Stripe Checkout + Webhook
- [x] Supabase Auth (magic-link)
- [x] Marketplace listing page
- [ ] Usage-based invoicing (Stripe metered billing)
- [ ] Per-author usage webhook
- [ ] MCP公式 servers リポへのコントリビュート

レビューもPRも辛口でお願いします。

リポ: https://github.com/taku629/mcpay

---

## 付録: ローカルで5分試す手順

```bash
git clone https://github.com/taku629/mcpay
cd mcpay
npm install
npm run build:sdk
npm run dev:web   # → http://localhost:3000

# 別ターミナル
cd examples/mcp-server-real
npm install
npm run build
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/server.js
```

`tools/list` のレスポンスに `search_web` / `summarize` / `ping` が返ってくれば成功。
