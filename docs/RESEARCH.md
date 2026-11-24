# 調査メモ：たけちか.NK（N.K. Works）の「1日1ゲーム」は、どう作られて、どう出されているか

調査日: 2026-11-24 / 調査方法: 公開されている X の投稿、公式サイト、GitHub（公開リポジトリ）、サイトの HTML を直接読む。
（数値・日付は、公開情報から読み取れた事実。推測は「推測」と明記する。）

---

## 1. 誰がやっているか

- **たけちか.NK**（X: [@vyaPudzd1E54661](https://x.com/vyaPudzd1E54661)、TikTok: @taketika.nk）
- プロフィール: 「ゲームを作ってます。たまにアプリも / 1日1ゲーム以上目標 / 公開しているゲームは配信、投稿、収益化okです」
- サイト [N.K. Works（nkworks-games.com）](https://nkworks-games.com/) の運営者情報: **大学生がひとり**。「考えてから公開までをひとり」で、**プログラムを書くときはAIの手も借りています**と明記。
- 公開本数: 2026年9月30日に1本目 → 2026年11月23日時点で **68本**（約55日で68本 ≒ 1日1.2本）。iPhoneアプリも2本（一画一会 / QUAD PRISM）、ほかに Sorotta。

## 2. 何を作っているか（共通の型）

- **ブラウザで動く無料ゲーム**。インストール不要、**スマホの縦持ち前提**、1回1〜2分。
- 題材は「日常のちょっとした疑問・妄想」をそのまま遊びにする（例: テーブルクロス引き、ケチ参り、前宙幅跳び、カルメ焼き、綿棒、バター塗り）。
- **診断系（結果をシェアできる）** が伸びやすい（運命の町・出身地当ては X のトレンド入り）。
- 各ゲームに **説明ページ**（遊び方・ルール・うまくなるコツ・作っていて変えたところ）があり、そこが検索からの入口になっている。

## 3. どう作っているか（技術）

GitHub の公開リポジトリ [`nkworks-games/nkworks-games.github.io`](https://github.com/nkworks-games/nkworks-games.github.io) を直接読んだ結果:

| 項目 | 実際の作り |
| --- | --- |
| 構成 | **1ゲーム = 1つの `index.html`**。ゲーム本体は 60〜90KB が中心（最大 2.1MB）。CSS/JS はインライン |
| 3D | **three.js 0.170.0 を jsDelivr の CDN から importmap で読む**（全ゲーム共通のバージョン） |
| 画像 | ほぼ無し。あっても `card.png` とスクショ用 `*.jpg` だけ。ゲーム内の見た目はコードで作る |
| 音 | 音声ファイルなし。**Web Audio でその場で鳴らす**（開発日記「音のファイルを1つも使わずに、曲を鳴らす」） |
| セーブ | localStorage。ランキングは Firebase Firestore（合計値は GitHub Actions が30分ごとに集計して静的JSONに） |
| 収益 | Google AdSense（`ca-pub-…`）＋アプリ宣伝（Sorotta / 一画一会）＋OFUSE（応援ボタン） |
| 計測 | Cloudflare Web Analytics（**DNS only 構成なので、タグは各ページに手で入れている**） |
| ドメイン | `nkworks-games.com` を GitHub Pages に CNAME。HTTPS 強制あり |
| 規模 | 4977ファイル / 約189MB。HTML は 2356枚（うち 1843 は「町ごとのシェアページ」） |

**作るときの分担（開発日記とコミット履歴から）**
- 実装はほぼ **Claude Code**。コミットの **約82%（200件中163件）** に `Co-Authored-By: Claude …` / `Claude-Session:` が付いている。
- 作者の仕事は **企画・仕様（数字で決める）・実機テスト・違和感の言語化・公開**。
- 直しもAI: 1日の中に「公開 → 直す → また直す」が何度も入る。例（2026-11-23）:
  - 00:12 水着アトリエ マージ → 01:14 全画面で描く → 02:00 スマホで即描ける → 03:44 なぞる道具 → 04:44 肋骨
  - 05:27 新作「プロフィール、書きます。」 → 07:38 要望窓口 → 10:47 撮影モード → 12:13 新作「鮭、のぼります。」 → 12:36 一時停止 → 13:45 判定の修正 → 14:22 計測タグ → 15:03 性格の研究にもとづいて作り直し
- 開発日記は「**何をやめて、何に変えたか**」を書く場所になっている（＝次の企画の材料）。

**1本あたりの時間（推測）**: 上記の流れから、1本の初版は **1〜3時間**、そのあと数時間の直し。1日22コミット・5〜6本のPRが動いた日もある（11/23）。

## 4. どう出しているか（デプロイ）

- リポジトリは **`nkworks-games/nkworks-games.github.io`**（ユーザー名\*.github.io ではないが、Pages 有効）。
- **GitHub Pages / Source: `main` の `/`（Deploy from a branch）**。`build_type: legacy`、`CNAME: nkworks-games.com`、`https_enforced: true`。
- つまり **push した瞬間に本番**。ビルド工程なし・プレビュー環境なし。
- `main` への直 push と、**PR（`pull_request` → merge）の両方**を使い分けている。PR は `nkworks-games` 名義の自己マージで、レビュー待ちはなし。
- 補助の自動化は **GitHub Actions 1本だけ**（`shusshin-stats.yml`: 30分ごとに Firestore の合計を作り直して commit & push。push 失敗時は rebase リトライ3回）。

**公開の単位（重要）**: 1本出すときは、だいたい同じ PR に

```
index.html（トップの一覧に1行） games/index.html（一覧に1カード）
games/<slug>/index.html（SEO用の説明ページ＋スクショ3枚＋thumb.jpg）
<slug>/index.html（ゲーム本体） <slug>/card.png（OGP 1200x630）
sitemap.xml（2行）
```

をまとめて入れている（例: PR #27「鮭、のぼります。」= 10ファイル）。**「ゲームを1本作る」＝「サイトの5か所を足す」**で、そこが一番つらそうな所。彼はここを毎回手でやっている。

**シェアの設計**
- 結果を画像（1200×630 の OGP）にして X に貼れるようにしている。診断系は **結果ごとに OG 画像とシェア用ページを用意**（運命の町: 1843町ぶん、今年の一字: 150字ぶん）。
- シェア文の最後に「作者→@handle」。`#運命の町当てます` のような **結果入りハッシュタグ**で、他人の投稿がそのまま宣伝になる。

**SEO**
- 各ゲームの説明ページに `VideoGame` の構造化データ、canonical、OGP、パンくず、関連ゲーム3本。
- サイトマップ 163 URL。AdSense はゲームより**説明ページ側**に置いている（ゲーム内の広告は `AD_ON` フラグで普段オフ）。

## 5. このリポジトリ（game3）で同じことをやるには、何が必要か

### すでに入れたもの（今日の作業で実装済み）

| 必要なもの | 実装 |
| --- | --- |
| 1ファイルで完結するゲームの型 | `site/jubyou-pittari/index.html`（サンプル第1号: 「10秒、ぴったり。」canvas＋Web Audio なし・外部ライブラリなし） |
| ゲームの元データ | `games.json`（slug / タイトル / キャッチ / 日付 / 説明 / 遊び方 / ルール / コツ / 変えたところ） |
| サイト全体の自動組み立て | `tools/build.js` → トップ・ゲーム一覧・**SEO説明ページ**・構造化データ・sitemap・robots を生成 |
| 公開まえの確認 | `tools/check.js`（リンク切れ / 1ファイルの約束 / 外部CDNの許可リスト / メタ情報 / サイトマップ） |
| 新しいゲームの雛形 | `npm run new -- <slug> "タイトル" "キャッチ"` |
| 手元の確認 | `npm run dev`（http://localhost:5173） |
| デプロイ | `.github/workflows/deploy.yml`（push → build → check → GitHub Pages） |
| 1日1本の習慣化 | `.github/workflows/daily-nudge.yml`（毎朝9時、今日のゲームが無ければ Issue を作る） |
| ゲーム共通の運営まわり | `tools/build.js` が全ゲームに「タイトルへ / 一覧 / ほめる / フォロー / Xでシェア」バーを自動で入れる |
| SNSカード | `og/?g=<slug>`（ブラウザだけで 1200×630 の見出し画像を描く。失敗時は `assets/ogp-fallback.jpg`） |
| 調査・運用ルール | `docs/RESEARCH.md`（本ファイル）, `docs/WORKFLOW.md`, `CLAUDE.md` |

### あなた（koki-ota0）がやる必要があること

1. **GitHub Pages を有効化**（Settings → Pages → Source: **GitHub Actions**）。
   ※ このサンドボックスの権限では Pages の API が 403 で、代行できませんでした。**ここだけ手作業が必要**です。
2. **X のハンドルを入れる**: `games.json` の `site.xHandle`（例 `"koki_ota0"`）。空のままだと「作者をフォロー」ボタンは出ません。
3. **ドメイン（任意）**: 独自ドメインにするなら、`games.json` の `site.baseUrl` を書きかえ、`site/CNAME` を追加（N.K. Works は `nkworks-games.com` を CNAME で当てています）。
4. **計測（任意）**: `site.cfAnalyticsToken` を入れると、全ページに Cloudflare Web Analytics のタグが入る（N.K. Works と同じやり方）。
5. **広告（任意）**: `site.adsenseClient` / `adsenseSlot`。AdSense は**説明ページ側**に置くのが安全（ゲームの操作を広告が邪魔しない）。
6. **毎日のリズム**: 朝 `daily-nudge` の Issue を見る → その日のお題を決める → `npm run new` → 2〜3時間で作りこむ → `npm run build && npm run check` → PR → merge。

### これから足すと効くもの（未実装・優先順）

- **結果シェアの型**（診断系のゲームで、結果ごとに OG 画像と `/r/<id>/` を生成する）。N.K. Works の伸びの中心はこれ（運命の町は朝にトレンド入り）。`og/` の仕組みを流用できる。
- **ゲーム内の「ほめる」を集計**（今は localStorage だけ。Firestore か、GitHub Actions で集計する静的JSONに）。
- **説明ページの自動生成を「スクショ付き」に**（今は `og/` の画像だけ。プレイ画面のキャプチャは手で入れる想定）。
- **配信向けの素材**（X 用の 15秒動画・TikTok 用の縦動画）。N.K. Works は X に動画付きで出している。
- **A/B 用のランディング**（同じゲームでキャッチコピーを2種類出して、X の反応を見る）。
- **失敗の記録**（`docs/WORKFLOW.md` の「やめたこと」欄）。N.K. Works の開発日記の強さはここ。

### 注意（そのまま真似しない方がよいこと）

- **`main` 直 push で即本番**は速いが、壊れた時に全ゲームが壊れる。こちらは `check` を通してから出す（build → check → deploy）。
- **外部CDN（three.js）依存**は、CDN 障害で全ゲームが動かなくなる。こちらは `check.js` の許可リストで管理し、必要なら `vendor/` に自前ホストする逃げ道を残す。
- **1ゲーム=1HTML は 2MB を超えるとスマホで辛い**（N.K. Works の最大は 2.1MB）。`check.js` は 3MB で警告する。
