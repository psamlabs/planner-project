# The Reading List — carousel

First carousel for **@pranjalspace** (book recommendations). Ten slides,
1080x1350, in the "library checkout card" design system from
[`../CLAUDE.md`](../CLAUDE.md) section 5. Tone: emotion over marketing.

The Canva route was blocked in this session (design saves were denied and the
Open Library / Canva preview hosts are blocked by network policy), so the deck
is built as pixel-exact HTML/SVG and rendered to PNG. Fonts are the real
**Lora** and **Courier Prime** (committed under `fonts/`, OFL). Match the look,
not the tooling (`../CLAUDE.md` section 12).

## Output (`out/`)

| # | File | Slide |
|---|------|-------|
| 1 | `slide-01-hook.png` | "Reading isn't the problem. Your list is." |
| 2 | `slide-02-mistake.png` | you keep starting the wrong book (myth/truth) |
| 3 | `slide-03-bad-vs-good.png` | same goal, two very different nights |
| 4 | `slide-04-book-1-before-the-coffee.png` | Before the Coffee Gets Cold |
| 5 | `slide-05-book-2-midnight-library.png` | The Midnight Library |
| 6 | `slide-06-book-3-housemaid.png` | The Housemaid |
| 7 | `slide-07-book-4-tuesdays-with-morrie.png` | Tuesdays with Morrie |
| 8 | `slide-08-book-5-kim-jiyoung.png` | Kim Jiyoung, Born 1982 |
| 9 | `slide-09-takeaway.png` | the finished-book high is the whole strategy |
| 10 | `slide-10-cta.png` | your next book is already waiting |

## Rebuild

```bash
npm install
npm run build     # writes index.html + out/slide-*.png, verifies each is 1080x1350
```

`index.html` is a self-contained preview of all 10 slides (fonts embedded as
base64) — open it in any browser.

## Editing content

All copy lives in `render.mjs` (the `s1`..`s10` / `books` definitions). The book
covers are intentionally the dashed "your photo / exhibit A" placeholders from
the spec; drop the real photos into the polaroid frames in Canva, or set a cover
URL and swap the placeholder for an `<img>`.

Notes: this environment ships Chromium at `/opt/pw-browsers`; `render.mjs`
auto-detects it, so `playwright install` is not needed here.
