# CLAUDE.md — このリポジトリでAIが守るルール

このリポジトリは「1日1本のブラウザゲーム」を公開する場所です。
N.K. Works（たけちか.NK）の作り方を参考に、**企画は人が、実装はAIが** 担当する前提で整えています。

## まず読む

- `docs/RESEARCH.md` … 参考にしている作り方・出し方の調査
- `docs/WORKFLOW.md` … 1日の進め方・ブランチ名・約束
- `games.json` … 全ゲームの元データ（サイト設定もここ）

## 絶対に守ること

1. **ゲームは `site/<slug>/index.html` の1ファイル**。CSS/JS はインライン。`npm run build` で `dist/` に出る。
   - `dist/` は生成物。**手で編集しない**（`tools/build.js` が毎回作り直す）。
2. 外部から読みこんでよいのは次のものだけ（`tools/check.js` が検査する）:
   - `https://cdn.jsdelivr.net/npm/three@0.170.0/...`
   - `https://fonts.googleapis.com/`, `https://fonts.gstatic.com/`
   - 計測・広告（`static.cloudflareinsights.com`, `pagead2.googlesyndication.com`, `www.googletagmanager.com`）
3. 画像ファイルを増やさない。**canvas で描く**。音も **Web Audio** で鳴らす（mp3 を置かない）。
4. スマホ縦持ちが本番。`env(safe-area-inset-*)` を使い、**指で隠れる位置にボタンを置かない**。
5. セーブは `localStorage`。個人情報の入力欄を作らない。
6. ゲームの表示（時計・スコア・背景の動き）が **答えの手がかりにならない**ようにする。
   例: タイマー系では、背景アニメを実時間と切りはなす。
7. 1ファイルが 3MB を超えたら分割を検討（`check.js` が警告する）。

## 新しいゲームを足す手順

```bash
npm run new -- <slug> "タイトル" "キャッチコピー"
# site/<slug>/index.html を作りこむ
# games.json の summary / howto / rules / tips / notes を埋める
npm run build && npm run check
git checkout -b game/<slug> && git add -A && git commit -m "新作「タイトル」を追加"
```

- `games.json` の `date` は公開日（Asia/Tokyo）。`status` は `draft` → `published`。
- 説明ページ・一覧・サイトマップ・OGP は **自動生成**。手で足さない。

## 直しのPR

- ブランチ: `fix/<slug>-<内容>`
- 直した理由を `games.json` の `notes` に1〜2文で足す（説明ページの「作っていて変えたところ」になる）。
- 変更が小さいほどよい。1日1本のリズムを壊さない。

## やってはいけないこと

- `dist/` をコミットする（CI が作る）。
- 外部の CDN を許可リストに足さずに使う。
- ゲームの HTML に `document.write` や `eval` を使う。
- 既存ゲームの `site/<slug>/index.html` を、理由なく大きく書きかえる（まず PR で相談）。
