// The Reading List — carousel renderer
// Builds a self-contained preview (index.html) of all 10 slides at 1080x1350
// and screenshots each slide to an exact-size PNG. Match the look (CLAUDE.md §5).
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'out');
mkdirSync(OUT, { recursive: true });

// ---------- palette (CLAUDE.md §5, exact hex) ----------
const C = {
  INK: '#1E2440', CARD: '#FFF8EB', RED: '#E23D28', BLUE: '#2B50C8',
  GRN: '#36A876', MARIGOLD: '#FFB627', CORAL: '#FF6B4A', SKY: '#62BEEA',
  PINK: '#F982AF', MINT: '#49BE89', LILAC: '#B28CEB', WHITE: '#FFFFFF',
};
const darken = (hex, f = 0.76) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f);
  const g = Math.round(((n >> 8) & 255) * f);
  const b = Math.round((n & 255) * f);
  return `rgb(${r},${g},${b})`;
};

// ---------- fonts: base64-embed the committed woff2 so the HTML is fully portable ----------
const FDIR = path.join(__dirname, 'fonts');
const b64 = (p) => readFileSync(p).toString('base64');
const fontFace = (family, file, weight, style) =>
  `@font-face{font-family:'${family}';font-weight:${weight};font-style:${style};font-display:block;` +
  `src:url(data:font/woff2;base64,${b64(path.join(FDIR, file))}) format('woff2');}`;
const FONTS = [
  fontFace('Lora', 'lora-latin-400-normal.woff2', 400, 'normal'),
  fontFace('Lora', 'lora-latin-700-normal.woff2', 700, 'normal'),
  fontFace('Lora', 'lora-latin-400-italic.woff2', 400, 'italic'),
  fontFace('Lora', 'lora-latin-700-italic.woff2', 700, 'italic'),
  fontFace('Courier Prime', 'courier-prime-latin-400-normal.woff2', 400, 'normal'),
  fontFace('Courier Prime', 'courier-prime-latin-700-normal.woff2', 700, 'normal'),
].join('\n');

// ---------- SVG sticker primitives ----------
function squiggle(w, h = 22, color = C.INK, sw = 6) {
  const seg = 34, n = Math.max(2, Math.round(w / seg));
  let d = `M 4 ${h / 2}`;
  for (let i = 0; i < n; i++) {
    const x0 = 4 + (i * (w - 8)) / n, x1 = 4 + ((i + 1) * (w - 8)) / n;
    const cx = (x0 + x1) / 2, cy = i % 2 === 0 ? 4 : h - 4;
    d += ` Q ${cx} ${cy} ${x1} ${h / 2}`;
  }
  return `<svg class="squiggle" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none">` +
    `<path d="${d}" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/></svg>`;
}
function starburstPts(cx, cy, points, outer, inner) {
  let p = '';
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    p += `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)} `;
  }
  return p.trim();
}
function starburst(l1, l2, fill = C.MARIGOLD, rot = 10, size = 150) {
  const c = size / 2;
  const pts = starburstPts(c, c, 11, c - 4, c * 0.7);
  return `<div class="sticker starburst" style="width:${size}px;height:${size}px;transform:rotate(${rot}deg)">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <polygon points="${pts}" fill="${fill}" stroke="${C.INK}" stroke-width="4" stroke-linejoin="round"/>
      <text x="${c}" y="${c - 8}" text-anchor="middle" class="sb-t">${l1}</text>
      <text x="${c}" y="${c + 24}" text-anchor="middle" class="sb-t">${l2}</text>
    </svg></div>`;
}
function fivePoint(cx, cy, r) { return starburstPts(cx, cy, 5, r, r * 0.42); }
function starPill(rating, accent) {
  const w = 300, h = 78, gap = 52, x0 = 46;
  let stars = '';
  for (let i = 0; i < 5; i++) {
    const cx = x0 + i * gap, on = i < rating;
    stars += `<polygon points="${fivePoint(cx, h / 2, 22)}" fill="${on ? accent : 'none'}" stroke="${C.INK}" stroke-width="3" stroke-linejoin="round"/>`;
  }
  return `<div class="sticker starpill">
    <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="${(h - 6) / 2}" fill="${C.WHITE}" stroke="${C.INK}" stroke-width="4"/>
      ${stars}</svg></div>`;
}
function stamp(text, color = C.RED, rot = -8) {
  return `<div class="sticker stamp" style="transform:rotate(${rot}deg);border-color:${color};color:${color}">${text}</div>`;
}
function sparkle(x, y, s = 26, color = C.CARD, rot = 0) {
  return `<svg class="spark" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg)" width="${s}" height="${s}" viewBox="0 0 40 40">
    <path d="M20 0 C22 15 25 18 40 20 C25 22 22 25 20 40 C18 25 15 22 0 20 C15 18 18 15 20 0 Z" fill="${color}" stroke="${C.INK}" stroke-width="1.5"/></svg>`;
}

// ---------- shared chrome ----------
function halftone(bg) {
  const d = darken(bg, 0.72);
  return `<div class="ht tl" style="--dot:${d}"></div><div class="ht br" style="--dot:${d}"></div>`;
}
function footer(n) {
  return `<div class="footer">
    <div class="frule"></div>
    <div class="frow"><span class="fhandle">@pranjalspace · book recommendations</span>
    <span class="fnum">${String(n).padStart(2, '0')} / 10</span></div></div>`;
}

// ---------- slides ----------
const BG = [C.MARIGOLD, C.CORAL, C.SKY, C.PINK, C.MINT, C.LILAC, C.SKY, C.CORAL, C.LILAC, C.BLUE];
const books = [
  { no: '01', title: 'Before the Coffee<br>Gets Cold', author: 'Toshikazu Kawaguchi', accent: C.PINK, bg: C.PINK, rating: 5,
    premise: 'a tiny tokyo cafe lets you sit back in time, but only until the coffee goes cold. one seat. a few rules. so much longing.',
    verdict: 'i cried on the train. worth every stop.', badge: ['QUICK', 'READ!'] },
  { no: '02', title: 'The Midnight<br>Library', author: 'Matt Haig', accent: C.MINT, bg: C.MINT, rating: 4,
    premise: 'between life and death sits a library, and every book is a life you could have lived. nora opens as many as she can.',
    verdict: 'the one i hand to anyone who feels stuck.', badge: ['ONE', 'SITTING'] },
  { no: '03', title: 'The Housemaid', author: 'Freida McFadden', accent: C.LILAC, bg: C.LILAC, rating: 4,
    premise: 'a new job, a locked attic room, a family that is not what it seems. you will not sit still for this one.',
    verdict: 'read it in a day. forgot to eat lunch.', badge: ['CANT', 'STOP'] },
  { no: '04', title: 'Tuesdays with<br>Morrie', author: 'Mitch Albom', accent: C.SKY, bg: C.SKY, rating: 5,
    premise: 'an old professor, now dying, teaches one last class on how to live. every tuesday, one lesson, no exam.',
    verdict: 'call the person you keep meaning to call.', badge: ['SOFT', 'CRY'] },
  { no: '05', title: 'Kim Jiyoung,<br>Born 1982', author: 'Cho Nam-Joo', accent: C.CORAL, bg: C.CORAL, rating: 5,
    premise: "one ordinary woman's life, told plainly, until the plainness is the whole point. quiet, and then it lands.",
    verdict: 'short. then it sits on your chest for weeks.', badge: ['STAYS', 'WITH U'] },
];

function slideShell(i, inner, stickers = '', centered = false) {
  const n = i + 1, bg = BG[i];
  const rot = (i % 2 === 0 ? -1 : 1) * (i % 3 === 0 ? 1.5 : 1.1);
  return `<section class="slide" style="background:${bg}">
    ${halftone(bg)}
    ${sparkle(30, 120, 30, C.CARD, 8)}${sparkle(1010, 250, 22, C.CARD, -6)}
    ${sparkle(40, 1180, 24, C.CARD, 12)}${sparkle(1000, 1090, 30, C.CARD, -10)}
    <div class="cardshadow" style="background:${darken(bg, 0.7)};transform:rotate(${rot}deg)"></div>
    <div class="card" style="transform:rotate(${rot}deg)">
      <div class="inner${centered ? ' center' : ''}">${inner}</div>
      ${footer(n)}
    </div>
    ${stickers}
  </section>`;
}

// 1 — Hook
function s1() {
  const inner = `
    <div class="eyebrow" style="color:${C.BLUE}">a book recommendations reset</div>
    <div class="hook">
      <div>Reading isn't</div>
      <div>the problem.</div>
      <div class="accent" style="color:${C.CORAL}">Your list is.${squiggle(360, 22, C.CORAL)}</div>
    </div>
    <p class="typed lead">five short books. five finished nights.<br>no shame, no 500-page guilt.</p>`;
  return slideShell(0, inner, stamp('OVERDUE', C.RED, -8) + starburst('NO', 'SHAME', C.MARIGOLD, 11), true);
}
// 2 — The mistake
function s2() {
  const inner = `
    <div class="eyebrow" style="color:${C.BLUE}">the quiet mistake</div>
    <div class="title2">You keep starting<br><span class="accent" style="color:${C.RED}">the wrong book.${squiggle(300, 20, C.RED)}</span></div>
    <p class="typed">that 500-page "important" novel has watched you fall asleep since 2019. it doesn't make you a bad reader. it just isn't the one.</p>
    <div class="mt-row"><div class="tag myth">MYTH</div><div class="mt-text">hard books are more worth it.</div></div>
    <div class="mt-row"><div class="tag truth">TRUTH</div><div class="mt-text" style="color:${C.GRN}">the book you finish wins.</div></div>`;
  return slideShell(1, inner, starburst('BE', 'KIND', C.PINK, 10), true);
}
// 3 — Bad vs good
function s3() {
  const inner = `
    <div class="bg-head">same goal.<br>two very different nights.</div>
    <div class="split">
      <div class="col">
        <div class="mark bad">✗</div>
        <ul class="typed list">
          <li>War and Peace, again.</li><li>three pages a night.</li><li>quietly quit by page 40.</li></ul>
      </div>
      <div class="vdiv"></div>
      <div class="col">
        <div class="mark good">✓</div>
        <ul class="typed list">
          <li>two hundred pages.</li><li>done in two sittings.</li><li>already reaching for the next.</li></ul>
      </div>
    </div>
    <div class="bg-foot" style="color:${C.BLUE}">momentum first. literature later.</div>`;
  return slideShell(2, inner, starburst('THIS', 'ONE!', C.MARIGOLD, 11));
}
// 4-8 — book cards
function bookSlide(i) {
  const b = books[i];
  const inner = `
    <div class="bk-head">
      <div class="no-stamp">No. ${b.no}</div>
      <div class="bk-title">${b.title}</div>
      <div class="bk-author" style="color:${C.BLUE}">by ${b.author}${squiggle(200, 16, C.BLUE, 4)}</div>
    </div>
    <div class="bk-body">
      <div class="premise typed">${b.premise}</div>
      <div class="polaroid">
        <div class="washi" style="background:${b.accent}"></div>
        <div class="ph"><span>your photo</span><span>of the book</span></div>
        <div class="ph-cap">exhibit A</div>
      </div>
    </div>
    <div class="verdict">&rarr; <em>${b.verdict}</em></div>`;
  return slideShell(3 + i, inner,
    starburst(b.badge[0], b.badge[1], i % 2 ? C.PINK : C.MARIGOLD, 12) + starPill(b.rating, b.accent));
}
// 9 — Takeaway
function s9() {
  const inner = `
    <div class="eyebrow" style="color:${C.BLUE}">the takeaway</div>
    <div class="takeaway">
      <div>The finished-book</div>
      <div>high is the</div>
      <div class="accent" style="color:${C.CORAL}">whole strategy.${squiggle(420, 24, C.CORAL)}</div>
    </div>
    <p class="typed lead">discipline was never the thing.<br>the right book is.</p>`;
  return slideShell(8, inner, starburst('YOUR', 'TURN!', C.PINK, 11), true);
}
// 10 — CTA (emotion over marketing)
function s10() {
  const inner = `
    <div class="eyebrow" style="color:${C.MARIGOLD}">before you close the app</div>
    <div class="title2 cta">your next book<br><span class="accent" style="color:${C.CORAL}">is already waiting.${squiggle(420, 22, C.CORAL)}</span></div>
    <ul class="slip">
      <li><span class="box"></span>save this for a slow evening.</li>
      <li><span class="box"></span>start the one that scared you least.</li>
      <li><span class="box"></span>come back and tell me you finished.</li>
    </ul>`;
  return slideShell(9, inner, stamp('SAVED', C.BLUE, -7) + starburst('SEE', 'YOU!', C.MARIGOLD, 10), true);
}

const SLIDES = [s1(), s2(), s3(), bookSlide(0), bookSlide(1), bookSlide(2), bookSlide(3), bookSlide(4), s9(), s10()];
const NAMES = ['hook', 'mistake', 'bad-vs-good', 'book-1-before-the-coffee', 'book-2-midnight-library',
  'book-3-housemaid', 'book-4-tuesdays-with-morrie', 'book-5-kim-jiyoung', 'takeaway', 'cta'];

// ---------- CSS ----------
const CSS = `
${FONTS}
*{margin:0;padding:0;box-sizing:border-box;}
:root{--ink:${C.INK};--card:${C.CARD};}
body{background:#d8d2c4;}
.deck{display:flex;flex-direction:column;align-items:center;gap:40px;padding:40px;}
.slide{position:relative;width:1080px;height:1350px;overflow:hidden;font-family:'Lora',serif;color:var(--ink);}
/* halftone */
.ht{position:absolute;width:560px;height:560px;background-image:radial-gradient(circle,var(--dot) 0 5px,transparent 6px);background-size:34px 34px;pointer-events:none;}
.ht.tl{top:-40px;left:-40px;-webkit-mask-image:radial-gradient(circle at top left,#000,transparent 68%);mask-image:radial-gradient(circle at top left,#000,transparent 68%);}
.ht.br{bottom:-40px;right:-40px;-webkit-mask-image:radial-gradient(circle at bottom right,#000,transparent 68%);mask-image:radial-gradient(circle at bottom right,#000,transparent 68%);}
.spark{position:absolute;pointer-events:none;}
/* card */
.cardshadow{position:absolute;left:82px;top:82px;width:948px;height:1218px;}
.card{position:absolute;left:66px;top:66px;width:948px;height:1218px;background:var(--card);
  border:6px solid var(--ink);padding:64px 60px 0;display:flex;flex-direction:column;}
.card::before{content:"";position:absolute;left:14px;top:14px;right:14px;bottom:14px;border:2px solid var(--ink);pointer-events:none;}
.inner{flex:1;display:flex;flex-direction:column;position:relative;}
.inner.center{justify-content:center;gap:8px;}
.inner.center .lead{margin-top:34px;}
/* footer */
.footer{position:relative;padding:18px 0 30px;}
.frule{height:2px;background:var(--ink);opacity:.85;margin-bottom:12px;}
.frow{display:flex;justify-content:space-between;align-items:center;font-family:'Courier Prime',monospace;}
.fhandle{font-size:25px;letter-spacing:.3px;}
.fnum{font-size:25px;font-weight:700;letter-spacing:1px;}
/* type */
.eyebrow{font-family:'Courier Prime',monospace;font-weight:700;font-size:26px;letter-spacing:4px;text-transform:uppercase;margin-bottom:26px;}
.hook{font-weight:700;font-size:104px;line-height:1.04;letter-spacing:-1px;}
.hook .accent,.takeaway .accent,.accent{position:relative;display:inline-block;}
.squiggle{position:absolute;left:0;bottom:-20px;}
.typed{font-family:'Courier Prime',monospace;font-size:30px;line-height:1.5;}
.lead{margin-top:auto;padding-top:30px;}
.title2{font-weight:700;font-size:76px;line-height:1.08;margin-bottom:30px;}
.title2 .accent{margin-top:6px;}
.takeaway{font-weight:700;font-size:92px;line-height:1.06;letter-spacing:-1px;}
/* slide 2 myth/truth */
.mt-row{display:flex;align-items:center;gap:22px;margin-top:30px;}
.tag{font-family:'Courier Prime',monospace;font-weight:700;font-size:24px;letter-spacing:3px;padding:8px 16px;border:3px solid var(--ink);color:var(--card);}
.tag.myth{background:${C.RED};border-color:${C.RED};}
.tag.truth{background:${C.GRN};border-color:${C.GRN};}
.mt-text{font-family:'Lora',serif;font-style:italic;font-size:38px;}
/* slide 3 */
.bg-head{font-style:italic;font-size:44px;line-height:1.2;text-align:center;margin-bottom:36px;}
.split{flex:1;display:flex;align-items:center;}
.split .col{flex:1;padding:0 26px;}
.vdiv{width:4px;background:var(--ink);align-self:stretch;margin:0 6px;}
.mark{width:96px;height:96px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:60px;font-weight:700;margin:0 auto 28px;}
.mark.bad{background:${C.RED};}
.mark.good{background:${C.GRN};}
.list{list-style:none;}
.list li{margin:18px 0;padding-left:6px;text-align:center;}
.bg-foot{font-weight:700;font-size:46px;text-align:center;padding-top:10px;}
/* book slides */
.bk-head{position:relative;}
.no-stamp{display:inline-block;font-family:'Courier Prime',monospace;font-weight:700;font-size:26px;letter-spacing:3px;
  color:${C.RED};border:3px solid ${C.RED};padding:6px 14px;margin-bottom:18px;transform:rotate(-3deg);}
.bk-title{font-weight:700;font-size:64px;line-height:1.05;}
.bk-author{position:relative;font-family:'Courier Prime',monospace;font-size:30px;margin-top:14px;padding-bottom:14px;display:inline-block;}
.bk-author .squiggle{bottom:-2px;}
.bk-body{display:flex;gap:34px;margin-top:34px;}
.premise{flex:1;align-self:stretch;background-image:repeating-linear-gradient(transparent 0 44px,rgba(30,36,64,.16) 44px 46px);padding-top:6px;line-height:46px;}
.polaroid{position:relative;width:330px;background:#fff;border:5px solid var(--ink);padding:20px 20px 60px;align-self:flex-start;}
.washi{position:absolute;top:-16px;left:50%;transform:translateX(-50%) rotate(-4deg);width:180px;height:44px;opacity:.72;border:2px solid var(--ink);}
.ph{height:340px;border:3px dashed var(--ink);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  font-family:'Courier Prime',monospace;font-size:26px;color:rgba(30,36,64,.7);}
.ph-cap{font-family:'Courier Prime',monospace;font-size:24px;text-align:center;margin-top:12px;font-style:italic;color:rgba(30,36,64,.7);}
.verdict{font-style:italic;font-size:42px;line-height:1.25;padding-top:26px;}
.verdict em{font-style:italic;}
/* slide 10 slip */
.slip{list-style:none;margin-top:20px;}
.slip li{display:flex;align-items:center;gap:22px;font-family:'Courier Prime',monospace;font-size:34px;margin:26px 0;}
.slip .box{width:34px;height:34px;border:3px solid var(--ink);flex:none;}
/* stickers */
.sticker{position:absolute;z-index:5;}
.starburst .sb-t{font-family:'Courier Prime',monospace;font-weight:700;font-size:24px;letter-spacing:1px;fill:${C.INK};}
.starburst{top:80px;right:34px;}
.starpill{left:30px;bottom:150px;z-index:6;}
.stamp{position:absolute;left:56px;bottom:230px;z-index:6;font-family:'Courier Prime',monospace;font-weight:700;
  font-size:44px;letter-spacing:7px;border:5px solid;border-radius:14px;padding:12px 26px;opacity:.88;}
`;

// book slides: move starburst to top-right outside, star pill lower-left
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
<body><div class="deck">${SLIDES.join('\n')}</div></body></html>`;

writeFileSync(path.join(__dirname, 'index.html'), HTML);

// ---------- render PNGs ----------
function pngSize(file) {
  const buf = readFileSync(file);
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
const CHROME = readdirSync('/opt/pw-browsers')
  .filter((d) => d.startsWith('chromium-'))
  .map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`)
  .find((p) => { try { readFileSync(p); return true; } catch { return false; } });
const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1160, height: 1440 }, deviceScaleFactor: 1 });
await page.setContent(HTML, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const els = await page.$$('.slide');
let bad = 0;
for (let i = 0; i < els.length; i++) {
  const file = path.join(OUT, `slide-${String(i + 1).padStart(2, '0')}-${NAMES[i]}.png`);
  await els[i].screenshot({ path: file });
  const { w, h } = pngSize(file);
  const ok = w === 1080 && h === 1350;
  if (!ok) bad++;
  console.log(`${ok ? 'OK ' : 'BAD'} ${path.basename(file)}  ${w}x${h}`);
}
await browser.close();
console.log(bad === 0 ? 'ALL 10 SLIDES @ 1080x1350' : `${bad} slides wrong size`);
