#!/usr/bin/env node
/**
 * 見出し画像（OGPカード）を、依存パッケージなし・ブラウザだけで作る。
 *
 * なぜ Canvas なのか
 *   - このリポジトリは「npm install もビルドも無しで、リンクを開けば遊べる」方針。
 *     画像も同じ考え方で、その場で描く（＝画像ファイルを増やさずに、全ゲームぶん作れる）。
 *   - 日本語のフォントは、CDN からではなく GitHub 上の Noto Sans JP（OFL）を fetch して使う。
 *   - 失敗したら（オフライン等）静的な assets/ogp-fallback.jpg を返し、SNS のカードが壊れないようにする。
 *
 * 使い方:
 *   https://kokilux.github.io/game3/og?g=jubyou-pittari
 *   → 1200x630 の PNG。そのまま OGP の og:image に指定できる。
 */
const OG_W = 1200, OG_H = 630;

// サイト全体の見た目（ここを変えると全ページの見出し画像が変わる）
const THEME = {
  bg: ['#0e1117', '#18263a'],
  ink: '#eef2f7',
  sub: '#c8d6e5',
  accent: '#ffce54',
  accentInk: '#131820',
  chip: '無料・ブラウザゲーム'
};

// フォント（同じものを使い回す）
const FONT_URLS = [
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.18/files/noto-sans-jp-japanese-700-normal.woff2',
  'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-jp@5.0.18/files/noto-sans-jp-japanese-400-normal.woff2'
];

let gamesCache = null;
async function loadGames() {
  if (gamesCache) return gamesCache;
  // このページは /og/?g=<slug> なので、games.json は1つ上（サイトのトップ）にある
  const res = await fetch(new URL('../games.json', location.href), { cache: 'no-cache' });
  if (!res.ok) throw new Error('games.json が読めません: ' + res.status);
  gamesCache = await res.json();
  return gamesCache;
}

let fontPromise = null;
function ensureFonts() {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    if (!document.fonts) return;
    const faces = FONT_URLS.map((url, i) => new FontFace(
      'OgJP', `url(${url}) format('woff2')`, { weight: String(i === 0 ? 700 : 400), display: 'swap' }
    ));
    await Promise.all(faces.map(async (f) => {
      try { await f.load(); document.fonts.add(f); } catch (e) { /* 使えなければ system font で描く */ }
    }));
  })();
  return fontPromise;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 幅に合わせて折り返す（日本語はどこでも折ってよい）
function wrap(ctx, text, maxWidth) {
  const lines = [];
  let cur = '';
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxWidth && cur) { lines.push(cur); cur = ch; }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitFont(ctx, text, max, min, maxWidth, weight) {
  let size = max;
  for (;;) {
    ctx.font = `${weight} ${size}px OgJP, "Hiragino Sans", "Noto Sans JP", sans-serif`;
    if (ctx.measureText(text).width <= maxWidth || size <= min) return size;
    size -= 2;
  }
}

function drawCard(canvas, game) {
  const dpr = 1;
  canvas.width = OG_W * dpr; canvas.height = OG_H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 背景（縦のグラデーション）
  const g = ctx.createLinearGradient(0, 0, 0, OG_H);
  g.addColorStop(0, THEME.bg[0]); g.addColorStop(1, THEME.bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, OG_W, OG_H);

  // 光（右上）
  const halo = ctx.createRadialGradient(960, 190, 10, 960, 190, 380);
  halo.addColorStop(0, 'rgba(255,206,84,.34)');
  halo.addColorStop(1, 'rgba(255,206,84,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, OG_W, OG_H);

  // 円（時計のイメージ。サイトの飾り）
  ctx.strokeStyle = 'rgba(255,206,84,.55)'; ctx.lineWidth = 3;
  [300, 226, 158].forEach((r, i) => {
    ctx.beginPath(); ctx.ellipse(960, 200, r, r * .8, 0, 0, Math.PI * 2); ctx.stroke();
  });

  // ラベル
  ctx.font = '700 26px OgJP, sans-serif';
  const chipText = THEME.chip + (game.date ? ' ・ ' + game.date.replace(/-/g, '.') : '');
  const chipW = ctx.measureText(chipText).width + 44;
  ctx.fillStyle = THEME.accent;
  roundRect(ctx, 70, 84, chipW, 52, 26); ctx.fill();
  ctx.fillStyle = THEME.accentInk;
  ctx.textBaseline = 'middle';
  ctx.fillText(chipText, 92, 84 + 27);

  // タイトル（大きすぎる時は縮める）
  ctx.textBaseline = 'alphabetic';
  const title = game.title || 'ゲーム';
  const tSize = fitFont(ctx, title, 108, 56, OG_W - 150, 700);
  ctx.font = `700 ${tSize}px OgJP, sans-serif`;
  ctx.fillStyle = THEME.ink;
  ctx.fillText(title, 68, 190 + tSize * .82);

  // キャッチコピー（2行まで）
  let y = 190 + tSize * .82 + 62;
  ctx.font = '400 36px OgJP, sans-serif';
  ctx.fillStyle = THEME.sub;
  for (const line of wrap(ctx, game.catch || '', 760).slice(0, 2)) {
    ctx.fillText(line, 72, y);
    y += 54;
  }

  // フッター
  ctx.font = '400 24px OgJP, sans-serif';
  ctx.fillStyle = '#9db0c3';
  ctx.fillText('GAME3 ・ 1日1本のブラウザゲーム', 72, OG_H - 52);
  const handle = '@' + (game.xHandle || '');
  if (game.xHandle) {
    const w = ctx.measureText(handle).width;
    ctx.fillStyle = '#7f93a8';
    ctx.fillText(handle, OG_W - 72 - w, OG_H - 52);
  }
}

// URL に出してよい文字だけを使う（パスを汚さない）
function safeParam(name) {
  const v = new URLSearchParams(location.search).get(name) || '';
  return v.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 60);
}

async function main() {
  const slug = safeParam('g');
  const canvas = document.createElement('canvas');
  try {
    const data = await loadGames();
    const site = data.site || {};
    const game = (data.games || []).find((g) => g.slug === slug) || (data.games || [])[0] || {};
    await ensureFonts();
    drawCard(canvas, Object.assign({}, game, { xHandle: site.xHandle }));
    canvas.id = 'og';
    document.body.appendChild(canvas);
    document.title = (game.title || 'GAME3') + ' の見出し画像';
    window.__ogReady = true;
  } catch (e) {
    // 失敗しても SNS のカードが壊れないように、静的な画像へ切りかえる
    location.replace(new URL('../assets/ogp-fallback.jpg', location.href).href);
  }
}

main();
