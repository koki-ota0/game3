# GAME3 — 1日1本のブラウザゲーム

リンクを開けばすぐ遊べるブラウザゲームを、**1日1本**公開するためのリポジトリです。
`main` に push すると、組み立て（build）→ 確認（check）→ 公開（GitHub Pages）が自動で走ります。

- 公開先: https://kokilux.github.io/game3/
- ゲームの元データ（一覧・サイト設定）: `games.json`
- 組み立て: `npm run build` → `dist/`
- 確認: `npm run check`

> このリポジトリは、個人開発者 **たけちか.NK（N.K. Works / [@vyaPudzd1E54661](https://x.com/vyaPudzd1E54661)）** さんの
> 「1日1ゲーム以上」の作り方・出し方を調べて、**同じことを自分で回せる形**に作り直したものです。
> 調査の詳細と、このリポジトリで足りないものの一覧は [docs/RESEARCH.md](docs/RESEARCH.md) にまとめました。

---

## なぜこの構成なのか（N.K. Works から学んだこと）

| N.K. Works のやり方 | このリポジトリでの対応 |
| --- | --- |
| 1ゲーム = **1つの HTML**（CSS/JS も全部その中） | `site/<slug>/index.html` を1枚で作る。画像は canvas、音は Web Audio でその場で作る |
| 本体を `main` に直接置き、**GitHub Pages（Deploy from a branch）** で公開 | 同じ GitHub Pages。ただし `dist/` を Actions で組み立てて出す（一覧・説明ページ・サイトマップを自動生成するため） |
| ゲームごとに **説明ページ（SEO）/ 一覧 / サイトマップ / OGP画像** を用意 | `games.json` 1か所から **全部自動生成**（`npm run build`） |
| AI（Claude Code）で実装し、**人（作者）が企画・実機テスト・違和感の言語化** | 同じ。`CLAUDE.md` に、AI が守るルール（1ファイル・外部CDNの制限など）を先に書いておく |
| 出したあと **直しつづける**（Nightly の小さなPRが毎日） | 1ゲーム = 1 PR。ブランチ名は `game/<slug>`、直しは `fix/<slug>-<内容>` |
| 収益: AdSense・アプリ宣伝・OFUSE | `games.json` の `adsenseClient` を入れるだけで全ページに反映（未設定なら広告なし） |

---

## クイックスタート

```bash
npm run dev                                   # 手元で見る（http://localhost:5173）
npm run new -- my-game "タイトル" "キャッチコピー"  # 新しいゲームの枠を作る
# site/my-game/index.html を作りこむ
npm run build && npm run check                # 組み立て＋公開まえの確認
git checkout -b game/my-game && git add -A && git commit -m "新作「タイトル」を追加" && git push
# → PR を作って main に merge すると、自動で公開される
```

## フォルダ

```
games.json                 ← 全ゲームの元データ（これだけ直せばサイト全体が変わる）
site/<slug>/index.html     ← ゲーム本体（1ファイルで完結）
assets/                    ← サイト共通の CSS・見出し画像のフォールバック
og/                        ← 見出し画像（OGP）をブラウザだけで描くページ（?g=スラッグ）
tools/build.js             ← dist/ を組み立てる（トップ・一覧・説明ページ・サイトマップ）
tools/check.js             ← 公開まえの確認（リンク切れ・1ファイルの約束・サイトマップ）
tools/new-game.mjs         ← 新しいゲームの雛形
tools/dev.js               ← 手元用のサーバー
.github/workflows/         ← 公開（Pages）・毎日の合図・定期ビルド
docs/                      ← 調査メモ・運用ルール
```

## ルール（このリポジトリの約束）

1. **ゲームは1ファイル**。CSS・JS・画像（canvas で描く）・音（Web Audio で鳴らす）は `index.html` の中に。
   外部から読むのは three.js（jsDelivr）と、計測・広告のタグだけ（`tools/check.js` が確認します）。
2. **スマホの縦持ちが本番**。指1〜2本で遊べること。`env(safe-area-inset-*)` を必ず使う。
3. **公開したら直す**。出しっぱなしにせず、遊んで気づいたことを次の小さなPRにする。
4. **1日1本**。`npm run build && npm run check` が通ってから merge。`daily-nudge.yml` が毎朝チェックします。

詳しくは [docs/WORKFLOW.md](docs/WORKFLOW.md)。
