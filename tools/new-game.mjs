#!/usr/bin/env node
/**
 * 新しいゲームの「枠」を作る。
 *   npm run new -- <slug> "タイトル" "キャッチコピー"
 *
 * site/<slug>/index.html に、すぐ遊べる最小のゲーム（1ファイル・外部ライブラリ無し）を作り、
 * games.json に1件足す（status は draft。公開する時に published にする）。
 * あとは中身を作りかえて `npm run build && npm run check` するだけ。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [slug, title, catchCopy] = process.argv.slice(2);
if (!/^[a-z0-9-]{2,40}$/.test(slug || '')) {
  console.error('使い方: npm run new -- <slug(英小文字とハイフン)> "タイトル" "キャッチコピー"');
  process.exit(1);
}
const dir = path.join(ROOT, 'site', slug);
if (fs.existsSync(dir)) {
  console.error(`${slug} はもうあります（site/${slug}/）`);
  process.exit(1);
}
fs.mkdirSync(dir, { recursive: true });

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<title>${title}</title>
<meta name="theme-color" content="#0e1117">
<style>
  *{box-sizing:border-box}
  html,body{margin:0;height:100%;overflow:hidden;background:#0e1117;color:#eef2f7;
    font-family:"Hiragino Maru Gothic ProN","Hiragino Sans","Noto Sans JP","Yu Gothic",sans-serif;user-select:none;-webkit-user-select:none}
  #c{position:fixed;inset:0;width:100%;height:100%;display:block}
  #ui{position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;padding:24px}
  h1{font-size:clamp(24px,7vw,38px);margin:0}
  p{color:#a9b8c6;margin:0}
  button{padding:14px 26px;border-radius:999px;border:0;background:#ffce54;color:#131820;font:800 16px inherit;cursor:pointer}
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="ui">
  <h1>${title}</h1>
  <p>${catchCopy}</p>
  <button id="start">はじめる</button>
</div>
<script>
'use strict';
// ここにゲームの処理を書く（1ファイルで完結させる。外部ライブラリは CDN の three.js だけ許可）
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
function resize(){ const d = Math.min(2, devicePixelRatio||1); cv.width = cv.clientWidth*d; cv.height = cv.clientHeight*d; ctx.setTransform(d,0,0,d,0,0); }
addEventListener('resize', resize); resize();
let t0 = performance.now();
function loop(t){ ctx.clearRect(0,0,cv.width,cv.height); /* ... */ requestAnimationFrame(loop); }
requestAnimationFrame(loop);
document.getElementById('start').addEventListener('click', () => { document.getElementById('ui').remove(); t0 = performance.now(); });
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(dir, 'index.html'), html);

const dataFile = path.join(ROOT, 'games.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
data.games.push({
  slug, title, catch: catchCopy,
  date: new Date().toISOString().slice(0, 10),
  status: 'draft',
  summary: '（ここに、どんなゲームかの説明を書く）',
  howto: ['（遊び方を書く）'],
  rules: ['（ルールを書く）'],
  tips: ['（コツを書く）'],
  facts: { playtime: '約1分', players: '1人', devices: 'スマホ（縦）・パソコン' },
  notes: ''
});
fs.writeFileSync(dataFile, JSON.stringify(data, null, 2) + '\n');
console.log(`できました: site/${slug}/index.html と games.json`);
console.log('次は: npm run build && npm run check');
