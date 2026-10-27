# RinjinCLAB 隣人部

静的サイト（ビルド不要）+ Discord 用画像。

## 編集する場所
- `site.js` 冒頭の `CONFIG` — Discord 招待リンク、部員の名前・役職・顔位置
- `index.html` — 文言（`data-fill` の付いた所が仮の情報）

## Discord 画像
`discord/` に出力済み。デザインを変えたら `sh discord/render.sh` で再生成（Chrome が必要）。

| ファイル | 用途 |
|---|---|
| `server-icon.png` / `server-icon-mascot.png` | サーバーアイコン 512×512 |
| `server-banner.png` | サーバーバナー 960×540（ブースト Lv2） |
| `invite-splash.png` | 招待背景 1920×1080（ブースト Lv1） |
| `logo-black.png` / `logo-white.png` | ロゴ（透過） |

## デプロイ
**GitHub Pages**
```
gh repo create rinjinclab --public --source . --push
gh api -X POST repos/{owner}/rinjinclab/pages -f "source[branch]=main" -f "source[path]=/"
```
→ `https://<user>.github.io/rinjinclab/`

**Cloudflare Pages**: ダッシュボード → Workers & Pages → Pages → Git 連携でこのリポジトリを選択。ビルドコマンドなし、出力ディレクトリ `/`。

## ローカル確認
```
python3 -m http.server 4173   # → http://localhost:4173
```
WebGL のテクスチャは file:// では読めないので、必ずサーバー経由で開く。

各シーンの静止画: `?s=<scene>&y=<0〜1>`（例 `?s=rule&y=0.65`）、イントロ固定は `&t=0.4`。
`node tools/stills.mjs out` で全シーンを書き出し（`npm i puppeteer-core` が必要）。
