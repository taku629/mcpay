# STATUS — mcpay
最終更新: 2026-05-22

## 一行で
MCPサーバー作者が3行で per-call/per-token 課金できる SaaS（Stripe Connect）。コードはローンチ可能水準、**外部secrets待ち**。

## 状態
- リポジトリ公開済 https://github.com/taku629/mcpay (Public, MIT)
- テスト 35通過（web 20 / sdk-ts 10 / sdk-python 9 / e2e 1）、tsc strict clean
- 2026-05-19: `wrapMCPServer` の「3行drop-in」が実際には課金されていなかった重大バグを修正済（READMEのコピー詐欺を解消）
- ローンチ原稿一式 `docs/launch/`（Show HN / Twitter / Zenn / checklist / outreach）完成

## ⚠️ 未コミットの変更あり
`CHANGELOG.md / README.md / docs/GETTING_STARTED.md / examples/.../server.ts / packages/sdk-ts/{README,src/index,src/types}.ts / .env.example` が変更されたまま。**まずこれをコミットして状態を確定すること。**

## 次の3手
1. **未コミット変更をレビュー→コミット**（状態が宙ぶらりん。最優先）
2. `/security-review` をかける — 決済を扱うのでローンチ前必須
3. 外部secrets（Stripe live / Supabase prod / Upstash / api.mcpay.dev DNS）が揃った日が公開Day1。それまでは awesome-mcp-servers / mcp.so 登録・Discord出現でエコシステム侵入

## 公開・収益化までの距離
**コード側はゼロ残**。ブロッカーは全て外部アカウント手続き（`docs/launch/checklist.md` の Blocking 項目）。検証先行: 5人のMCP作者に「払ってでも欲しいか」を聞いてから本ローンチ。
