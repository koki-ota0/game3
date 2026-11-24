#!/usr/bin/env node
/**
 * 全ページを組み立てる（依存パッケージ無し・Node 標準だけ）。
 *
 *   1. games.json を読む（ゲームの一覧・サイト設定。ここが唯一の「元データ」）
 *   2. site/<slug>/index.html があれば、body の中に共通の運営まわり（フォロー・ほめる・シェア）を足す
 *   3. トップ / ゲーム一覧 / ゲームごとの説明ページ（SEO用） / サイトマップ / robots.txt を作る
 *
 * なぜ「元データ1つ + 生成」なのか
 *   N.K. Works のような1日1本の運用では、新しいゲームを出すたびに「一覧・サイトマップ・説明ページ・
 *   OGP画像」を手で直すのが、いちばん時間を食う。ここを1コマンドにしておくと、
 *   新しいゲームは games.json に1件足して `npm run build` するだけで、サイト全体に反映される。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname.replace(/\/tools$/, '');
const DIST = path.join(ROOT, 'dist');
const SRC = path.join(ROOT, 'site');
const P = (...a) => path.join(...a);

const data = JSON.parse(fs.readFileSync(P(ROOT, 'games.json'), 'utf8'));
const site = data.site || {};
const games = (data.games || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));

const BASE = (site.baseUrl || '/').replace(/\/?$/, '/');
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const abs = (p = '') => BASE + String(p).replace(/^\//, '');
// 「ページ内リンク」は相対で作る（独自ドメインに移しても、そのまま動く）
const gameRel = (g, depth = 0) => '../'.repeat(depth) + 'site/' + g.slug + '/';
const gameUrl = (g) => abs('site/' + g.slug + '/');
const pageUrl = (g) => abs('games/' + g.slug + '/');
// 見出し画像（OGP）は「実在する画像ファイル」でなければ SNS が読めない。
//   site/<slug>/card.png があればそれを使い、無ければサイト共通の画像にする。
//   card.png は og/?g=<slug> をブラウザで開いて保存したもの（1200x630）。
function cardFile(g) {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    const f = P(SRC, g.slug, 'card.' + ext);
    if (fs.existsSync(f)) return { rel: `site/${g.slug}/card.${ext}`, abs: f };
  }
  return { rel: 'assets/ogp-fallback.jpg', abs: P(ROOT, 'assets', 'ogp-fallback.jpg') };
}
const ogImage = (g) => abs(cardFile(g).rel);
const dateJa = (d) => d ? d.replace(/-/g, '.') : '';

// ---------- 共通パーツ ----------
function head({ title, desc, canonical, image, extra = '', depth = 0 }) {
  const prefix = depth ? '../'.repeat(depth) : '';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="theme-color" content="${esc(site.themeColor || '#111827')}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(site.name || 'GAME3')}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${esc(image)}">
${site.adsenseClient ? `<meta name="google-adsense-account" content="${esc(site.adsenseClient)}">` : ''}
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%230e1117'/%3E%3Ccircle cx='32' cy='32' r='20' fill='none' stroke='%23ffce54' stroke-width='4'/%3E%3Cpath d='M32 18v14l10 6' stroke='%23ffce54' stroke-width='4' fill='none' stroke-linecap='round'/%3E%3C/svg%3E">
<link rel="stylesheet" href="${prefix}assets/site.css">
${extra}
</head>`;
}

function header(active = '', depth = 0) {
  const p = depth ? '../'.repeat(depth) : '';
  const n = site.name || 'GAME3';
  return `<header class="h"><div class="wrap">
<a class="logo" href="${p || './'}">${esc(n)}</a>
<nav><a href="${p}games/"${active === 'games' ? ' aria-current="page"' : ''}>ゲーム</a><a href="${p}about.html"${active === 'about' ? ' aria-current="page"' : ''}>運営者情報</a></nav>
</div></header>`;
}

function footer(depth = 0) {
  const p = depth ? '../'.repeat(depth) : '';
  const cf = site.cfAnalyticsToken
    ? `\n<!-- Cloudflare Web Analytics --><script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "${esc(site.cfAnalyticsToken)}"}'></script>`
    : '';
  return `<footer class="f"><div class="wrap">
<p><a href="${p || './'}">トップ</a> ・ <a href="${p}games/">ゲーム一覧</a> ・ <a href="${p}about.html">運営者情報</a> ・ <a href="${p}privacy-policy.html">プライバシーポリシー</a></p>
<p>© ${new Date().getFullYear()} ${esc(site.name || 'GAME3')}</p>
</div></footer>${cf}
</body>
</html>`;
}

function card(g, depth = 0) {
  return `<li><a class="card" href="${esc(gameRel(g, depth))}">
<div class="tx"><b>${esc(g.title)}</b><span>${esc(g.catch || '')}</span><em>${esc(dateJa(g.date))} 公開</em></div></a></li>`;
}

// ゲームの game ページに足す meta（OGP/Twitter カード）
function gameMeta(g) {
  const shareUrl = encodeURIComponent(gameUrl(g));
  return `<meta name="description" content="${esc(g.catch || '')}">` +
    `<link rel="canonical" href="${esc(gameUrl(g))}">` +
    `<meta property="og:type" content="website">` +
    `<meta property="og:site_name" content="${esc(site.name || 'GAME3')}">` +
    `<meta property="og:title" content="${esc(g.title)}">` +
    `<meta property="og:description" content="${esc(g.catch || '')}">` +
    `<meta property="og:url" content="${esc(gameUrl(g))}">` +
    `<meta property="og:image" content="${esc(ogImage(g))}">` +
    `<meta property="og:image:width" content="1200">` +
    `<meta property="og:image:height" content="630">` +
    `<meta name="twitter:card" content="summary_large_image">` +
    `<meta name="twitter:title" content="${esc(g.title)}">` +
    `<meta name="twitter:description" content="${esc(g.catch || '')}">` +
    `<meta name="twitter:image" content="${esc(ogImage(g))}">`;
}

// ゲームのページに足す共通の運営まわり（フォロー・ほめる・シェア）
function gameExtras(g) {
  const share = encodeURIComponent(g.title + ' を遊んだ！ #ブラウザゲーム');
  const shareUrl = encodeURIComponent(gameUrl(g));
  const follow = site.xHandle
    ? `<a class="pill" target="_blank" rel="noopener" href="https://x.com/intent/follow?screen_name=${encodeURIComponent(site.xHandle.replace(/^@/, ''))}">作者をフォロー</a>`
    : '';
  return `
<style>
  #g3bar{position:fixed;left:0;right:0;bottom:0;z-index:2147483000;display:flex;gap:8px;justify-content:center;align-items:center;
    padding:8px 10px calc(8px + env(safe-area-inset-bottom));background:#0b0f14e6;border-top:1px solid #ffffff1f;
    font:600 13px/1.2 "Hiragino Maru Gothic ProN","Hiragino Sans","Noto Sans JP",sans-serif;color:#e9eef5;backdrop-filter:blur(6px)}
  #g3bar a,#g3bar button{display:inline-flex;align-items:center;gap:6px;padding:8px 12px;border-radius:999px;border:1px solid #ffffff2b;
    background:#ffffff12;color:#e9eef5;text-decoration:none;font:inherit;cursor:pointer}
  #g3bar a:active,#g3bar button:active{transform:scale(.97)}
  #g3bar .home{background:#ffce54;color:#131820;border-color:transparent}
  #g3bar .heart[data-on="1"]{background:#ff6b6b;border-color:transparent;color:#fff}
  body{padding-bottom:62px}
</style>
<div id="g3bar" role="navigation" aria-label="サイトのメニュー">
  <a class="home" href="./" rel="home">タイトルへ</a>
  <a href="../../games/">ゲーム一覧</a>
  <button class="heart" type="button" data-on="0" data-slug="${esc(g.slug)}" aria-pressed="false">ほめる</button>
  ${follow}
  <a target="_blank" rel="noopener" href="https://x.com/intent/post?text=${share}&url=${shareUrl}">Xでシェア</a>
</div>
<script>
(function(){
  // 「ほめる」を押した回数を、この端末にだけ数える（サーバーなしで、作者への応援を見える形にする）
  var btn=document.querySelector('#g3bar .heart'); if(!btn) return;
  var key='g3-praise:'+btn.dataset.slug, n=+(localStorage.getItem(key)||0);
  function paint(){ btn.dataset.on=n>0?'1':'0'; btn.setAttribute('aria-pressed',n>0?'true':'false');
    btn.textContent=n>0?(n+' ほめた'):'ほめる'; }
  paint();
  btn.addEventListener('click',function(){ n+=1; try{localStorage.setItem(key,n)}catch(e){} paint(); });
})();
</script>`;
}

// ゲームの index.html に、共通パーツを入れる（</body> の直前）
function injectExtras(html, g) {
  if (html.includes('id="g3bar"')) return html;
  // head の最後（</head> の直前）に meta を入れる。すでにある場合はそちらを優先。
  if (!/property="og:image"/.test(html) && html.includes('</head>')) {
    html = html.replace('</head>', gameMeta(g) + '\n</head>');
  }
  const extras = gameExtras(g);
  return html.includes('</body>') ? html.replace('</body>', extras + '\n</body>') : html + extras;
}

// ---------- ページ ----------
function indexPage() {
  // 一覧には「公開済み」だけを出す（下書きは説明ページも作らない）
  const list = games.filter((g) => g.status === 'published').slice(0, 12);
  return `${head({
    title: `${site.name || 'GAME3'}｜1日1本、すぐ遊べるブラウザゲーム`,
    desc: site.description || '',
    canonical: abs(''),
    image: abs('assets/ogp-fallback.jpg')
  })}
<body>
${header()}
<main class="wrap">
<h1 class="hero">${esc(site.tagline || '')}</h1>
<p class="lead">${esc(site.description || '')}</p>
<ul class="grid">${list.map((g) => card(g, 0)).join('\n')}</ul>
<p class="more"><a class="btn" href="${abs('games/')}">ゲーム一覧（全${games.length}本）</a></p>
</main>
${footer()}
`;
}

function gamesPage() {
  return `${head({
    title: `ゲーム一覧｜${site.name || 'GAME3'}`,
    desc: `${site.name || 'GAME3'} のブラウザゲーム一覧（全${games.length}本）。リンクを開けばすぐ遊べます。`,
    canonical: abs('games/'),
    image: abs('assets/ogp-fallback.jpg'),
    depth: 1
  })}
<body>
${header('games', 1)}
<main class="wrap">
<h1>ゲーム一覧</h1>
<p class="lead">全${games.filter((g) => g.status === 'published').length}本。新しい順です。スマホの縦持ちですぐ遊べます。</p>
<ul class="grid">${games.filter((g) => g.status === 'published').map((g) => card(g, 1)).join('\n')}</ul>
</main>
${footer(1)}
`;
}

function gameDetailPage(g) {
  const facts = g.facts || {};
  const sec = (title, arr) => Array.isArray(arr) && arr.length
    ? `<h2>${esc(title)}</h2><ul class="steps">${arr.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : '';
  const ld = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'VideoGame',
    name: g.title, description: g.summary || g.catch || '',
    url: pageUrl(g), image: ogImage(g), datePublished: g.date,
    gamePlatform: 'Web browser', applicationCategory: 'Game', inLanguage: 'ja',
    author: { '@type': 'Person', name: site.author || site.name },
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' }
  });
  return `${head({
    title: `${g.title}｜遊び方とコツ - ${site.name || 'GAME3'}`,
    desc: (g.summary || g.catch || '').slice(0, 120),
    canonical: pageUrl(g),
    image: ogImage(g),
    extra: `<script type="application/ld+json">${ld}</script>`,
    depth: 2
  })}
<body>
${header('games', 2)}
<main class="wrap">
<p class="crumb"><a href="../../">トップ</a> › <a href="../">ゲーム</a> › ${esc(g.title)}</p>
<h1>${esc(g.title)}</h1>
<p class="lead">${esc(g.catch || '')}</p>
<div class="hero-img"><img src="${esc(ogImage(g))}" alt="${esc(g.title)}の見出し画像" width="1200" height="630"></div>
<p class="more"><a class="btn" href="${esc(gameUrl(g))}">▶ ブラウザで遊ぶ（無料）</a></p>
<ul class="facts">
<li><b>1回の長さ</b><span>${esc(facts.playtime || '数分')}</span></li>
<li><b>人数</b><span>${esc(facts.players || '1人')}</span></li>
<li><b>遊べる所</b><span>${esc(facts.devices || 'スマホ・パソコン')}</span></li>
<li><b>公開日</b><span>${esc(dateJa(g.date))}</span></li>
</ul>
<h2>どんなゲーム？</h2>
<p>${esc(g.summary || '')}</p>
${sec('遊び方', g.howto)}
${sec('ルール', g.rules)}
${sec('うまくなるコツ', g.tips)}
${g.notes ? `<h2>作っていて変えたところ</h2><p>${esc(g.notes)}</p>` : ''}
<p class="more"><a class="btn" href="${esc(gameUrl(g))}">▶ ${esc(g.title)}を遊ぶ</a></p>
</main>
${footer(2)}
`;
}

function aboutPage() {
  return `${head({
    title: `運営者情報｜${site.name || 'GAME3'}`,
    desc: `${site.name || 'GAME3'} の運営者情報です。`,
    canonical: abs('about.html'),
    image: abs('assets/ogp-fallback.jpg')
  })}
<body>
${header('about')}
<main class="wrap narrow">
<h1>運営者情報</h1>
<h2>${esc(site.name || '')} について</h2>
<p>${esc(site.description || '')}</p>
<h2>作っているもの</h2>
<p>ブラウザですぐ遊べる無料のゲーム ${games.length} 本（${dateJa(games[games.length - 1] && games[games.length - 1].date)} から公開）。</p>
<h2>お問い合わせ</h2>
<p>ご感想・不具合のご報告は、X のリプライか DM までお願いします。${site.xHandle ? `<a href="https://x.com/${esc(site.xHandle.replace(/^@/, ''))}">@${esc(site.xHandle.replace(/^@/, ''))}</a>` : ''}</p>
<h2>広告について</h2>
<p>${site.adsenseClient ? '当サイトは Google AdSense による広告を掲載しています。' : '当サイトは広告を掲載していません。'}</p>
</main>
${footer()}
`;
}

function privacyPage() {
  return `${head({
    title: `プライバシーポリシー｜${site.name || 'GAME3'}`,
    desc: `${site.name || 'GAME3'} のプライバシーポリシーです。`,
    canonical: abs('privacy-policy.html'),
    image: abs('assets/ogp-fallback.jpg')
  })}
<body>
${header()}
<main class="wrap narrow">
<h1>プライバシーポリシー</h1>
<p>本サイトのゲームは、多くがブラウザの中だけで動きます。氏名やメールアドレスなどを入力する画面はありません。</p>
<h2>ブラウザに保存するもの</h2>
<p>ベスト記録や「ほめた」回数などは、くわしい設定をしなくても遊べるように、ブラウザの localStorage に保存しています。ブラウザの設定から消せます。</p>
<h2>アクセス解析</h2>
<p>${site.cfAnalyticsToken ? 'ページが開かれた回数を、Cloudflare Web Analytics で数えています（Cookie を使わない方式）。' : '現在、個人を追跡するアクセス解析は使っていません。'}</p>
<h2>広告</h2>
<p>${site.adsenseClient ? 'Google AdSense を利用しており、広告の配信のために Cookie が使われることがあります。' : '現在、広告は掲載していません。'}</p>
<h2>お問い合わせ</h2>
<p>${site.xHandle ? `X（<a href="https://x.com/${esc(site.xHandle.replace(/^@/, ''))}">@${esc(site.xHandle.replace(/^@/, ''))}</a>）までご連絡ください。` : 'X の DM までご連絡ください。'}</p>
</main>
${footer()}
`;
}

function sitemap() {
  const urls = [abs(''), abs('games/'), abs('about.html'), abs('privacy-policy.html')]
    .concat(games.filter((g) => g.status === 'published').map(pageUrl));
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${esc(u)}</loc></url>`).join('\n')}
</urlset>
`;
}

// ---------- 出力 ----------
function write(rel, content) {
  const out = P(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
}

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    const s = P(from, e.name), d = P(to, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); }
  }
}

function build() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // 1. 共有の素材（CSS・フォールバック画像・ロゴなど）
  copyDir(P(ROOT, 'assets'), P(DIST, 'assets'));

  // 1b. 元データ（ブラウザの見出し画像メーカー og/ が読む）
  write('games.json', JSON.stringify(data, null, 2));

  // 2. ゲーム本体（site/<slug>/）。共通の運営まわりを入れる。
  for (const g of games) {
    const srcFile = P(SRC, g.slug, 'index.html');
    if (!fs.existsSync(srcFile)) {
      console.warn(`  ! ${g.slug}: site/${g.slug}/index.html が無いので、説明ページだけ作ります`);
      continue;
    }
    // 先に丸ごとコピーしてから、index.html だけ差しかえる（順番が逆だと注入が消える）
    copyDir(P(SRC, g.slug), P(DIST, 'site', g.slug));
    const html = injectExtras(fs.readFileSync(srcFile, 'utf8'), g);
    write(`site/${g.slug}/index.html`, html);
  }

  // 3. 見出し画像のジェネレーター（og/）
  copyDir(P(ROOT, 'og'), P(DIST, 'og'));

  // 4. まとめのページ
  write('index.html', indexPage());
  write('games/index.html', gamesPage());
  for (const g of games.filter((x) => x.status === 'published')) write(`games/${g.slug}/index.html`, gameDetailPage(g));
  write('about.html', aboutPage());
  write('privacy-policy.html', privacyPage());
  write('sitemap.xml', sitemap());
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${abs('sitemap.xml')}\n`);
  write('.nojekyll', '');

  console.log(`built ${games.length} games -> dist/`);
}

build();
