#!/usr/bin/env node
/**
 * 公開まえの確認（依存パッケージ無し）。
 *
 *   1. どのページからも参照しているローカルのファイルが、本当にあるか
 *   2. ゲームの HTML が「1ファイルで動く」約束を守っているか
 *      （外部の CDN は許可リストの中だけ／ファイル数が増えすぎていない）
 *   3. 全ページに必須のメタ情報（title / description / og:image）があるか
 *   4. サイトマップの URL と、実際に作られたページが合っているか
 *
 * ビルドした dist/ を調べる。`npm run check` で、公開のまえに落とす。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname.replace(/\/tools$/, '');
const DIST = path.join(ROOT, 'dist');
const game3 = JSON.parse(fs.readFileSync(path.join(ROOT, 'games.json'), 'utf8'));

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(DIST);
const rel = (p) => path.relative(DIST, p).split(path.sep).join('/');
const htmlFiles = files.filter((f) => f.endsWith('.html'));

if (!files.length) err('dist/ が空です。先に `npm run build` を実行してください。');

// ---- 1. 参照されているファイルがあるか ----
// 検査の対象は dist/ の中だけ（外部 URL はここでは見ない）
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const dir = path.dirname(f);
  const re = /(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g;
  let m;
  while ((m = re.exec(html))) {
    const target = m[1];
    if (/^(https?:|data:|mailto:|tel:)/.test(target) || target.startsWith('//')) continue;
    const abs = target.startsWith('/')
      ? path.join(DIST, target.slice(('/' === target[0] ? 1 : 0)))
      : path.resolve(dir, target);
    let p = abs;
    if (!fs.existsSync(p)) {
      // ディレクトリ URL（末尾スラッシュ無しの /games）は index.html を見る
      if (fs.existsSync(path.join(abs, 'index.html'))) continue;
      err(`リンク切れ: ${rel(f)} -> ${target}`);
    }
  }
}

// ---- 2. ゲームは1ファイルで動くか ----
const CDN_ALLOW = [
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/three@[0-9.]+\//,
  /^https:\/\/cdn\.jsdelivr\.net\/npm\/@fontsource\//,
  /^https:\/\/fonts\.googleapis\.com\//,
  /^https:\/\/fonts\.gstatic\.com\//,
  /^https:\/\/static\.cloudflareinsights\.com\//,
  /^https:\/\/pagead2\.googlesyndication\.com\//,
  /^https:\/\/www\.googletagmanager\.com\//
];
for (const g of game3.games.filter((x) => x.status === 'published')) {
  const f = path.join(DIST, 'site', g.slug, 'index.html');
  if (!fs.existsSync(f)) { err(`ゲームがありません: site/${g.slug}/index.html`); continue; }
  const html = fs.readFileSync(f, 'utf8');
  const sizeKB = Buffer.byteLength(html) / 1024;
  if (sizeKB > 3000) warn(`${g.slug}: HTML が ${sizeKB.toFixed(0)}KB。分割を検討（例: assets/ に分ける）`);
  // 見るのは「読みこむ URL」だけ（src / href / import / fetch）。
  // data: URI の xmlns や、シェア用の x.com など、読みこみでない URL は対象外。
  const loadRe = /(?:src|href)\s*=\s*["'](https?:[^"']+)|(?:import|from)\s*["'](https?:[^"']+)|fetch\(\s*["'](https?:[^"']+)/g;
  const urls = [...html.matchAll(loadRe)].map((x) => x[1] || x[2] || x[3]);
  const own = new RegExp('^' + game3.site.baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const LINK_OUT = [/^https:\/\/x\.com\//, /^https:\/\/twitter\.com\//]; // 押すと外へ出るだけのリンク
  for (const u of new Set(urls)) {
    if (own.test(u) || LINK_OUT.some((r) => r.test(u))) continue;
    if (!CDN_ALLOW.some((r) => r.test(u))) warn(`${g.slug}: 外部から読みこむURL ${u}（許可リスト外。オフラインで壊れないか確認）`);
  }
  // メタ情報（og:image など）は tools/build.js が入れる。ここでは入ったかを確認する。
  if (!/twitter:card/.test(html)) warn(`${g.slug}: twitter:card がありません（SNS のカードが小さくなります）`);
  if (!/og:image/.test(html)) warn(`${g.slug}: og:image がありません（見出し画像が無いと SNS で小さく出ます）`);
  if (!/<div id="g3bar"/.test(html)) err(`${g.slug}: 共通の運営まわり（g3bar）が入っていません。tools/build.js を通しましたか？`);
}

// ---- 3. 全ページのメタ情報 ----
for (const f of htmlFiles) {
  const html = fs.readFileSync(f, 'utf8');
  const name = rel(f);
  if (/noindex/.test(html)) continue;
  if (!/<title>[^<]+<\/title>/.test(html)) err(`${name}: <title> がありません`);
  if (!/<meta name="description"/.test(html)) err(`${name}: description がありません`);
  if (!/<meta property="og:image"/.test(html)) warn(`${name}: og:image がありません`);
}

// ---- 4. サイトマップ ----
const sm = path.join(DIST, 'sitemap.xml');
if (!fs.existsSync(sm)) err('sitemap.xml がありません');
else {
  const xml = fs.readFileSync(sm, 'utf8');
  const base = game3.site.baseUrl.replace(/\/?$/, '/');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  for (const u of locs) {
    const relPath = u.startsWith(base) ? u.slice(base.length) : null;
    if (relPath === null) { err(`サイトマップのURLが baseUrl の外: ${u}`); continue; }
    const p = path.join(DIST, relPath || 'index.html');
    const ok = fs.existsSync(p) || fs.existsSync(path.join(p, 'index.html'));
    if (!ok) err(`サイトマップにあるページがない: ${u}`);
  }
  for (const g of game3.games.filter((x) => x.status === 'published')) {
    if (!locs.some((u) => u.endsWith(`/games/${g.slug}/`))) err(`サイトマップに説明ページが無い: ${g.slug}`);
  }
}

// ---- 結果 ----
for (const w of warns) console.warn('WARN', w);
for (const e of errors) console.error('ERR ', e);
console.log(`\nchecked ${htmlFiles.length} pages / ${game3.games.length} games → ${errors.length} errors, ${warns.length} warnings`);
process.exit(errors.length ? 1 : 0);
