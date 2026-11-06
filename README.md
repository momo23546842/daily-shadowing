# Daily Shadowing 🎧

毎日10分の英語Vlogでシャドーイングするためのアプリ。

- 毎朝6:47（シドニー時間）に、Claudeのスケジュールタスクがおすすめ動画を1本選んで `data/videos.json` に追加し、このリポジトリにpushします。
- Vercelがpushを検知して自動で再デプロイし、アプリに新しい動画が表示されます。
- 「練習した」の記録は Neon（Postgres）に保存されるので、スマホとパソコンで共有されます。
- 合言葉（`APP_PASSCODE`）を知っている人だけが使えます。

## 構成

```
public/index.html      画面（今日の動画・履歴・連続日数・合言葉ロック）
api/videos.js          GET  /api/videos   動画一覧＋練習記録
api/practice.js        POST /api/practice 練習記録を保存
api/_lib.js            Neon接続・テーブル自動作成・videos.json → Neon 同期・合言葉チェック
data/videos.json       毎朝追加される動画データ
```

テーブル（`videos`, `practice`）は初回アクセス時に自動で作成されます。SQLを手で実行する必要はありません。

## Vercel + Neon のセットアップ

1. **Vercelにリポジトリを追加**：Vercel → Add New → Project → `daily-shadowing` を Import。Framework Preset は「Other」のまま、設定は何も変えずに Deploy。
2. **Neonを連携**：プロジェクトの Storage タブ → Create Database → **Neon** → 無料プランで作成し、このプロジェクトに Connect。`DATABASE_URL` が自動で追加されます。
3. **合言葉を設定**：Settings → Environment Variables → `APP_PASSCODE` に好きな合言葉を入れて Save。
4. **再デプロイ**：Deployments → 最新のデプロイの「…」→ Redeploy（環境変数を反映するため）。
5. 発行されたURL（`https://daily-shadowing-xxxx.vercel.app`）を開いて合言葉を入力。スマホでは「ホーム画面に追加」するとアプリのように使えます。

## 動画データの形式（`data/videos.json`）

新しい日付を配列に追加します（同じ日付があれば上書き）。

```json
{
  "date": "2026-11-07",
  "weekday": "土",
  "theme": "旅行",
  "accent": "イギリス英語",
  "title": "動画タイトル",
  "channel": "チャンネル名",
  "url": "https://www.youtube.com/watch?v=XXXXXXXXXXX",
  "duration": "約10分",
  "reason": "おすすめ理由",
  "phrases": [{ "en": "phrase", "ja": "意味" }],
  "tip": "練習のコツ"
}
```
