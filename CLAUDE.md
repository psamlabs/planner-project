# BUILD SPEC — "The Reading List" Carousel Builder

A web app that turns book picks into post-ready Instagram carousels in a
library-checkout-card style. Built for **@pranjalspace**, a book-recommendations
creator. This document is the single source of truth.

> **Goal for this session:** use **Canva** at its best to get the carousel ready.
> The spec below was written for a Next.js re-implementation, but the immediate
> deliverable is a finished, post-ready 10-slide carousel produced in Canva that
> matches the design system in section 5. Match the look, not the tech stack.

---

## 1. What we're building

A single-user creative tool (no login, runs locally or on Vercel). The creator
enters 5 book titles plus a few lines of their own copy. The app:

1. Fetches each book's real cover from the Open Library API.
2. Renders a 10-slide Instagram carousel (1080x1350) in a fixed "library checkout card" design system.
3. Lets the creator edit every text field live and see it update.
4. Exports all 10 slides as PNGs (individually and as a zip).

The slide structure is fixed (it follows a proven save-heavy formula). The
content is user-driven. The design system is non-negotiable (section 5).

### Non-goals (do not build)
- No user accounts, database, or backend persistence. State lives in the browser.
- No AI text generation inside the app. The creator writes their own copy.
- No scheduling or direct posting to Instagram.

## 2. Who it's for

One creator: warm, specific, personal voice; makes book + reading-culture
content. The app should feel like a well-made analog object, not a SaaS
dashboard. Handle shown on every slide footer: **@pranjalspace**.

## 3. Tech stack (for the web-app build)

- **Framework:** Next.js (App Router) + React + TypeScript.
- **Styling:** Tailwind CSS.
- **Slide rendering:** render each slide as real DOM/SVG (not canvas drawing), then export with `html-to-image` (`toPng`). Each slide is a 1080x1350 React component scaled down for preview.
- **Zip export:** `jszip` + `file-saver`.
- **Fonts:** self-host via `next/font/google` — **Lora** (400, 700, + italic) and **Courier Prime** (400, 700). Courier Prime is the free stand-in for the typewriter look.
- No paid APIs. Everything below is free. One route (`/`) is enough.

## 4. Content structure (the 10 slides)

Ordering is deliberate: names a problem, agitates it, pays it off with the
books, closes with a quotable line + CTA. **Do not reorder.**

| # | Slide | Type | Dynamic fields |
|---|-------|------|----------------|
| 1 | Hook | problem hook | `hookLine1`, `hookLine2`, `hookAccentLine` |
| 2 | The mistake | text + myth/truth | `mistakeTitle`, `mistakeBody`, `mythText`, `truthText` |
| 3 | Bad vs good | two-panel split | `badItems[]`, `goodItems[]`, `badGoodFooter` |
| 4 | Book 1 (the fix) | book card | book object |
| 5 | Book 2 | book card | book object |
| 6 | Book 3 | book card | book object |
| 7 | Book 4 | book card | book object |
| 8 | Book 5 | book card | book object |
| 9 | Takeaway | quotable | `takeawayLine1..3`, `takeawaySub` |
| 10 | CTA | return slip | `ctaTitle`, `ctaChecklist[]` |

### Book object (slides 4-8)
```ts
type Book = {
  title: string;        // e.g. "Before the Coffee Gets Cold"
  author: string;       // e.g. "Toshikazu Kawaguchi"
  premise: string;      // 2-3 line no-spoiler setup (typed style)
  verdict: string;      // 1 personal line in her voice (handwritten italic)
  coverUrl: string | null; // filled by Open Library fetch; null = show placeholder
  rating: number;       // 1-5, default 5, renders the star pill
  accent: string;       // hex, auto-assigned from the palette cycle (section 5)
};
```

### Default seed content (pre-fill so it renders on first load)
- **Slide 1 hook:** "Reading isn't" / "the problem." / "Your list is."
- **Slide 2 mistake:** "You keep restarting with the wrong book." Body about the 500-page "important" novel that's been on the shelf since 2019. Myth: "hard books are more worth it." Truth: "the book you finish wins."
- **Slide 3 bad vs good:** BAD = ["War and Peace, again.", "3 pages a night.", "quietly quit by page 40."], GOOD = ["200 pages.", "done in two sittings.", "already picking the next one."], footer: "momentum first. literature later."
- **Books 1-5:** Before the Coffee Gets Cold (Kawaguchi), The Midnight Library (Haig), The Housemaid (McFadden), Tuesdays with Morrie (Albom), Kim Jiyoung Born 1982 (Cho Nam-Joo). Premise + verdict can start blank or seeded with placeholders.
- **Slide 9 takeaway:** "The finished-book high is the strategy." Sub: "discipline was never the thing. the right book is."
- **Slide 10 CTA:** checklist = ["save this for your next bookstore trip", "comment BOOKS for the full list", "follow for the next stack"].

## 5. Design system (non-negotiable)

Every slide is a checkout card: a cream card floating on a solid color block,
with a thick ink border, a hand-annotated feel, and sticker elements.

### Canvas
- Slide size: **1080 x 1350 px** (Instagram 4:5 portrait).
- Card: cream, inset ~66px from slide edges, centered, rotated **1 to 1.5deg** (alternate sign per slide so the deck feels hand-placed).
- Card border: **6px solid ink**. Add a 2px hairline inner border ~20px inside.
- Card shadow: a **solid offset block** (not a soft blur) in a darkened shade of that slide's background color, offset ~16px down-right (risograph/zine look).

### Color palette (exact hex)
| Name | Hex | Use |
|------|-----|-----|
| INK | `#1E2440` | all text + borders; deep navy |
| CARD | `#FFF8EB` | card background; warm cream |
| RED | `#E23D28` | stamps, "mistake" accents |
| BLUE | `#2B50C8` | eyebrows, author names, links |
| GOOD/GRN | `#36A876` | truth line, GOOD panel |
| MARIGOLD | `#FFB627` | slide 1 bg + sticker fills |
| CORAL | `#FF6B4A` | slide 2 bg + accent text |
| SKY | `#62BEEA` | slide 3 bg |
| PINK | `#F982AF` | book slide bg / sticker |
| MINT | `#49BE89` | book slide bg |
| LILAC | `#B28CEB` | slide 9 bg |

**Background block per slide:** 1=Marigold, 2=Coral, 3=Sky, 4=Pink, 5=Mint,
6=Lilac, 7=Sky, 8=Coral, 9=Lilac, 10=Blue. Book accents cycle
Pink → Mint → Lilac → Sky → Coral.

### Typography
- **Titles / hooks / takeaway:** Lora Bold. Big (72-96px). Break across 2-3 lines. Put the punchline line in an accent color (Coral or Blue) and draw a hand-wavy squiggle underline beneath it.
- **Verdict lines (the personal take):** Lora Italic ~42px, prefixed with "→".
- **Premise + all "typed" copy + labels:** Courier Prime. Body ~30px. Labels and stamps use Courier Prime Bold, letter-spaced, in Blue or Red.
- **Footer (every slide):** thin ink rule, then `@pranjalspace · book recommendations` on the left (Courier ~25px) and `NN / 10` on the right (Courier Bold).

### Background texture
- Halftone dot clusters fading in from the top-left and bottom-right corners of the color block (dots in a slightly darker shade of the bg).
- A few cream sparkle shapes (4-point stars) scattered in the margins.

### Sticker elements (draw as SVG, place at card edges)
- **Starburst badge** (10-12 point star): small 2-line caption inside, e.g. "QUICK / READ!", "SAVE / THIS!", "NO / SHAME", "YOUR / TURN!". Rotated ~10deg, fill Marigold or Pink, ink outline.
- **Star-rating pill:** white rounded pill with 5 stars in the slide's accent color, hung off the lower-left card edge on book slides. Star count = rating.
- **Rubber stamp:** distressed rounded-rect outline + letter-spaced text, rotated ~-8deg. "OVERDUE" (red, slide 1), "SAVED" (blue, slide 10).
- **Washi tape:** a translucent rectangle in the accent color with an ink outline, taped across the top of the polaroid frame on book slides.
- **Squiggle underline:** hand-drawn sine-wave line under accent title lines.

### Book slide layout (slides 4-8)
- Top-left: red "No. 0X" stamp.
- Title (Lora Bold, up to 2 lines) + "by {author}" (Courier, Blue) with a short squiggle under the author.
- Left column: premise typed on faint ruled lines (~460px wide).
- Right: a polaroid frame — white rect, ink border, washi tape on top, and the fetched cover image inside. If `coverUrl` is null, show a dashed placeholder reading "your photo / of the book" + caption "exhibit A".
- Below both columns: the verdict line in Lora Italic.
- Stickers: "QUICK READ!" starburst top-right, star pill lower-left.

### Slide 3 (bad vs good) layout
- Centered italic header: "same goal. two very different books."
- Vertical ink divider down the middle.
- Left = BAD: red circle with a white ✗, then the bad items typed below.
- Right = GOOD: green circle with a white ✓, then the good items.
- Bottom center: "momentum first. literature later." in Lora Bold, Blue.

## 6. APIs (all free, all verified)

### 6.1 Book covers — Open Library (primary integration)
Two-step flow because users type titles, not ISBNs:

**Step 1 — search to get a cover id:**
```
GET https://openlibrary.org/search.json?title={TITLE}&author={AUTHOR}&limit=1&fields=title,author_name,cover_i,isbn
```
Take `cover_i` from the first doc.

**Step 2 — build the cover image URL:**
```
https://covers.openlibrary.org/b/id/{cover_i}-L.jpg
```
Fallback if you have an ISBN: `https://covers.openlibrary.org/b/isbn/{ISBN}-L.jpg`
Sizes are `S`, `M`, `L`. Use `L` for print-quality slides.

**Rules & etiquette:**
- Send a `User-Agent` header identifying the app + a contact email. Identified requests get a higher rate limit.
- For displaying covers on public-facing UIs, not bulk crawling. A 5-book carousel is well within bounds; do not batch-hammer it.
- Access by ids other than CoverID/OLID is rate-limited — prefer the `cover_i` route from search.
- Some covers return a blank/placeholder image. Detect tiny/blank responses and fall back to the dashed placeholder frame (which is actually the preferred aesthetic anyway).
- UX: each book row has a "fetch cover" button and a manual URL / file-upload override. Never block the UI on a fetch; show the placeholder immediately and swap the cover in when it resolves.

### 6.2 Color (optional, "shuffle palette" feature)
The section 5 palette is the default and ships hardcoded. Optionally add a
"shuffle accents" button backed by The Color API
(`https://www.thecolorapi.com/scheme?hex={HEX}&mode=triad&count=5`, no key) or
Colormind (`POST http://colormind.io/api/` with `{"model":"default"}`, free for
personal use). Keep INK and CARD fixed; only swap accent/bg colors, and always
check text contrast against the new background.

### 6.3 Stickers (optional, skip for MVP)
Sticker elements in section 5 are drawn in SVG and need no API. Do not build a
GIPHY/Tenor integration for v1 — drawn SVG stickers look more on-brand and have
zero dependencies.

## 7. Voice & copy rules (enforce in placeholder text and hints)
- **No em dashes anywhere.**
- No filler ("in today's fast-paced world", "unlock your potential", etc.).
- Short lines. One idea per line.
- Lowercase, conversational verdict lines are on-brand.
- Cover slide, slide 1's context, and export filenames should carry the phrase "book recommendations" (her SEO anchor).

### Suggested character limits (soft, show a counter)
- Hook lines: ~18 chars each.
- Book title: ~26 chars (wraps to 2 lines).
- Premise: ~120 chars.
- Verdict: ~60 chars.
- CTA checklist items: ~42 chars.

## 8. Export
- Each slide renders at exactly **1080x1350** (render offscreen at full size even though preview is scaled).
- "Export all" produces `slide-01-hook.png` … `slide-10-cta.png` and bundles them into `book-recommendations-carousel.zip`.
- Individual "download this slide" button on each preview.
- PNG, no compression artifacts. Confirm exported pixel dimensions are exactly 1080x1350.

## 9. Screen layout
Single page, two columns:
- **Left (control panel, scrollable):** collapsible sections — Hook, The Mistake, Bad vs Good, Books (5 rows, each with title/author/premise/verdict/rating/fetch-cover), Takeaway, CTA. Plus global actions: "Export all", "Shuffle accents" (if built).
- **Right (preview):** all 10 slides stacked vertically, scaled to fit, updating live as fields change. Each has a download button.
- **Mobile:** stack control panel above preview.

## 10. Build order (milestones)
1. Scaffold: Next.js + Tailwind + fonts loaded. One 1080x1350 slide component rendering the cream-card-on-color-block shell with border, shadow offset, and footer.
2. Design primitives: reusable SVG components for starburst, star pill, stamp, washi tape, squiggle, halftone corners, sparkles. Verify against the hex + layout specs in section 5.
3. All 10 slide components with the seed content hardcoded. Get the deck looking right before wiring any inputs.
4. State + control panel: lift all text into React state; bind the left-side form so edits update the preview live.
5. Open Library integration: search-by-title → cover_i → cover URL, with User-Agent header, placeholder fallback, and manual override.
6. Export: html-to-image PNG per slide at full res + jszip bundle. Verify dimensions.
7. Optional: shuffle-accents via a color API.

Ship after milestone 6. Everything past that is polish.

## 11. Acceptance criteria
- Opens with the seed carousel fully rendered, all 10 slides, no errors.
- Editing any field updates the matching slide instantly.
- A real book title fetches and displays its actual cover; a missing cover falls back to the dashed placeholder without breaking layout.
- Manual cover upload/URL override works per book.
- Exported PNGs are exactly 1080x1350 with crisp text and correct colors (spot-check INK `#1E2440` and CARD `#FFF8EB`).
- Zip export contains all 10 correctly named slides.
- No em dashes in any default copy. Footer reads `@pranjalspace · book recommendations` on every slide.
- Fonts render as Lora (titles/verdicts) and Courier Prime (typed copy).

## 12. Notes for the builder
- The reference look was prototyped in Python/PIL; re-implement it in the browser (or in Canva) as editable DOM/SVG. **Match the look, not the implementation.**
- Keep it dependency-light and offline-friendly except for the two Open Library calls.
- If a spec detail conflicts with legibility or reliable export, **legibility and reliable export win** — note the deviation in a comment.
