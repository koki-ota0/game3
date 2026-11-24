#!/usr/bin/env node
/**
 * 手元で見るための小さなサーバー（依存パッケージ無し）。
 *   npm run dev  → http://localhost:5173/
 *
 * dist/ を配るだけ。速くするために、リクエストのたびにビルドはしない（変更したら npm run build）。
 * ゲーム1つだけを確かめたい時は /site/<slug>/ を開く（共通バーつき）。
 */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname.replace(/\/tools$/, '');
const DIST = path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT || 5173);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2', '.glb': 'model/gltf-binary'
};

http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(DIST, url);
  if (url.endsWith('/')) file = path.join(file, 'index.html');
  if (!file.startsWith(DIST)) { res.writeHead(403).end('forbidden'); return; }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const asDir = path.join(file, 'index.html');
    if (fs.existsSync(asDir)) file = asDir;
    else { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('not found'); return; }
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
    'cache-control': 'no-store'
  });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '0.0.0.0', () => console.log(`dev: http://localhost:${PORT}/  (dist/ を配っています)`));
