# Stripe Connect Japan オンランプ手順

> Internal launch artifact — 公開リポへの掲載は不要、ローンチ実務用。
> 情報源: docs.stripe.com（2026-05時点）。仕様は変わるので各タスク前にStripe Dashboardで最新版を再確認。

## このドキュメントの目的

MCPay が Stripe Connect Express をproduction launchするまでに、**「事業者として takumu (作者) が」と「プラットフォームとして MCPay が」**の二段階で何を埋める必要があるかを上から下に並べたもの。

## 結論サマリー

| 項目 | 必要か | 備考 |
|---|---|---|
| 法人登記（株式会社/合同会社） | **不要** | `business_type=individual` で個人事業主としてonramp可 |
| 開業届（個人事業主の場合） | 強く推奨 | 確定申告で「事業所得」扱いにするのに必須相当、税務上の優位性 |
| インボイス制度 適格請求書発行事業者番号 | プラットフォーム手数料を取るなら必要 | 顧客側のインボイス控除のため。`T` + 13桁 |
| 古物商など業種ライセンス | 該当業種のみ | MCPayは該当しない見込み（デジタルサービス・SaaS） |
| Stripe Platform Profile承認 | **必須** | 個別の事業説明を Stripe審査 |

## Phase A — 個人/事業主としての準備（コードと無関係）

### A-1. 開業届（任意だが推奨）
- 提出先: 所轄税務署
- 期限: 事業開始から1ヶ月以内（過去日の場合は遡って出せる）
- 内容: 屋号は「MCPay」または個人名でも可、職業は「ソフトウェア開発」等
- 効果: 青色申告 (65万円控除) が使える、屋号で銀行口座が作れる
- 19歳学生でも提出可能。親の扶養範囲（年収103万 or 130万）の影響は別途要確認

### A-2. 適格請求書発行事業者登録
- 提出先: 国税庁 e-Tax または所轄税務署
- 必須となるシナリオ: MCPayが法人顧客から手数料を取る（B2B課税売上）かつ顧客側がインボイス控除を望む場合
- 19歳学生で年売上1,000万未満なら通常は免税事業者だが、登録すると課税事業者になる
- **判断ポイント**: 初年売上見込みが200万未満ならまずは登録しない選択肢もあり。Stripe Connectで認可されたあと、初の有料顧客が「インボイス番号ください」と言ってきたタイミングでも間に合う

### A-3. 屋号付き銀行口座（任意）
- ゆうちょ・楽天・ジャパンネット銀行が屋号口座開設のハードルが低い
- 開業届のコピーが必要なケースあり
- Stripe Connect の payout 先口座は個人名でも可なので、口座開設はlaunch必須ではない

## Phase B — Stripe Platform 申請（MCPay側）

### B-1. Stripe Account（個人）作成
- https://dashboard.stripe.com/register
- 国: Japan
- ビジネスタイプ: 個人事業主
- 法定氏名、住所、生年月日、SSN相当（マイナンバー）入力
- 本人確認書類アップロード: 運転免許証 or マイナンバーカード or パスポート

### B-2. Connect Platform Profile 提出
場所: Dashboard → Connect → Settings → Platform profile
記入が必要:
- **Platform name**: `MCPay`
- **Platform website**: `https://mcpay.dev`（DNS取得後）
- **Business description**: 日英両方推奨。例:
  > MCPay is a billing infrastructure layer for Model Context Protocol (MCP) servers. We provide an SDK that lets MCP server authors charge per-call or per-token fees through Stripe Connect Express. We operate as a marketplace facilitator on behalf of the authors who connect their own Stripe accounts.
- **Industry**: `Software / SaaS`
- **Expected monthly volume**: 控えめに $1,000–$10,000 から
- **Connected account type**: Express (Standardではなく)
- **Branding**: ロゴ、primary color、support email（`support@mcpay.dev`）

Stripeの審査期間: 通常 1〜5営業日。差し戻されたら追加情報を出す。

### B-3. Connected Account Application
- Connect → Settings → Onboarding options で:
  - 取得する情報: KYC (Stripe既定で十分)
  - Capability要求: `card_payments`, `transfers`
- Express dashboard を有効化（作者向けの簡易ダッシュボードがStripe側で提供される）

### B-4. テスト環境での通し確認
本番secretsを入れる前にtest modeで:
1. `STRIPE_SECRET_KEY` = `sk_test_...`
2. Connect Express で擬似author account を1個作成
3. `examples/mcp-server-real` を起動、`/marketplace/[projectId]` 経由でtest cardから$5 top up
4. customer key発行 → MCP呼出 → usage記録
5. cron強制実行 → invoice 1本がStripe Dashboardに finalized 状態で表示
6. test bank account へ payout がpending → paid に進む

これが test mode で1回通れば、本番secretsに切り替える準備完了。

## Phase C — 本番切替（外部secrets投入）

`docs/launch/checklist.md` の Blocking 項目と完全に重複するので、そちらを正とする。

## よくある詰まり

### Q1. 個人事業主でConnect Expressに登録したが「verification pending」のまま進まない
- Kana と Kanji の両方が埋まっていない可能性大。`address_kanji.line1` のような全角・半角の取り違えが頻発する
- マイナンバー（個人番号）が必要。マイナンバーカードがなければ番号通知書 + 顔写真付身分証

### Q2. 学生・親の扶養
- 開業届を出したからといって即座に扶養から外れるわけではない
- 親の社会保険上の扶養（年収130万）と税法上の扶養（年収103万）で判定が違う
- MCPay収入が年130万を超えそうになったら親と相談

### Q3. インボイス番号
- 取得後に dashboard と顧客向け請求書に `T` + 13桁を表示する必要あり
- MCPay側のコード対応: project / customer record に invoice number カラム追加、PDF/メール文面に挿入
- ローンチ初期は手動運用でも可（顧客が1〜2件なら）

### Q4. Stripe Platform Profile審査で落ちた
- 一番多い差し戻し理由: 「サービスの提供形態が不明瞭」「規約・プライバシーが未掲載」
- mcpay.dev に Terms / Privacy / 特商法に基づく表記 の3ページを掲載してから再申請

## 関連書類リンク

- 開業届: 国税庁 [PDF](https://www.nta.go.jp/taxes/tetsuzuki/shinsei/annai/shinkoku/annai/04.htm)
- 適格請求書発行事業者登録: [国税庁 e-Tax](https://www.invoice-kohyo.nta.go.jp/)
- Stripe Connect ドキュメント: https://docs.stripe.com/connect
- Connect Japan 検証情報: https://docs.stripe.com/connect/required-verification-information
- 特商法ガイド: https://www.no-trouble.caa.go.jp/

## 次のアクション（このdoc読了後すぐ）

1. **今日**: Stripe個人アカウント作成（B-1）→ Connect Platform Profile 下書き作成（B-2）
2. **明日**: 開業届の用意（A-1）、適格請求書登録の必要性判断（A-2）
3. **2-3日後**: Stripe審査完了次第、test modeで全フロー1回通す（B-4）
4. **審査通過＆test成功後**: `docs/launch/checklist.md` の本番切替に進む

## このdocはレビュー前

- 法務・税務はあくまでガイド。商業利用前に税理士・行政書士の確認推奨
- Stripe Platform Profileの記述例は **2026-05時点の公開情報**から推定。実際の文言は審査担当者のフィードバックを反映して調整
