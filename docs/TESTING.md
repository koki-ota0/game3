# ゲームの自動テスト（ブラウザ無しで、実際に遊ぶ）

この環境では Chromium / Playwright を落とせないため、**jsdom + @napi-rs/canvas** で
ゲームの HTML をそのまま読み込み、本物のポインタ操作を投げて、画面を PNG に保存して
目で確認できるようにしている。

## 準備（初回だけ）

```bash
mkdir -p /tmp/harness && cd /tmp/harness
npm init -y >/dev/null
npm i jsdom @napi-rs/canvas
```

## 使い方

```bash
# 全8ステージを、設計した解のとおりに指で狙ってクリアできるか
node /tmp/harness/play2.cjs site/domino-tsunaide/index.html /tmp/harness/out

# ビルド済み（#g3bar 入り）のページで、レイアウトが崩れないか
node /tmp/harness/built.cjs
```

`play2.cjs` は、ゲーム本体の `STAGES` を HTML から読んで解を取得するので、
**実装とテストのズレが起きない**。指のブレ（±6px）も入れている。

## 通ること（8/8 が期待値）

- `CLEARED 8/8` … 全ステージでベルが鳴る
- `PLACED-AS-PLANNED 8/8` … 狙った本数どおりに置ける
- `logs: []` … 例外なし

## ハマりどころ

- jsdom の canvas は `canvas.width = ...` しても中身が消えないので、
  テスト側でサイズ変更を裏の Canvas に転送してあげる必要がある。
- `clientWidth` をスタブしないと、ゲームが 0px を見て真っ黒になる。
- `#g3bar` はゲームの `<script>` より後ろに差し込まれるので、
  ゲーム側は高さを後から測り直す（`watchBar()`）。
