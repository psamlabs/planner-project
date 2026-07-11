# Idea Drop 🗺️ — your content tool, outside Notion

A tiny website (one Cloudflare Worker — same platform as Stacked) connected to your Notion:

- **💡 Drop** — type an idea from your phone → it lands in the Notion **💡 Idea Bank** instantly
- **🌱 Ideas** — live board: `🕐 New (waiting for Claude) → 🌱 Fresh → 📅 Slotted → ✅ Used`, each card links to its Notion page (where Claude's draft script appears after the morning sweep)
- **📅 Posts** — the Content Tracker: what **✍️ needs you**, and what's upcoming on the calendar

The daily Claude routine (9:00 IST) stays the brain: it picks up anything you drop here, classifies it, and writes the script inside the idea's page. This site is the front door + dashboard.

---

## Setup — ~10 minutes, once

### 1. Create a Notion integration (2 min)
1. Go to https://www.notion.so/profile/integrations → **New integration**
2. Name: `Idea Drop` · Workspace: yours · Type: **Internal**
3. Capabilities: **Read content** + **Insert content** (Update not needed)
4. Copy the **Internal Integration Secret** (starts `ntn_…`)

### 2. Connect it to your pages (1 min)
Open **Content HQ — your shelf, mapped 🗺️** in Notion → `•••` menu → **Connections** → add **Idea Drop**.
(That grants access to both databases underneath it. Nothing else in your workspace is shared.)

### 3. Deploy (3 min — same flow as Stacked)
```bash
cd content-strategist/idea-drop-tool
npx wrangler login                      # if not already
npx wrangler secret put NOTION_TOKEN    # paste the ntn_… secret
npx wrangler secret put PASSCODE        # invent a short passcode — it locks the site to you
npx wrangler deploy
```

Done → `https://idea-drop.<your-subdomain>.workers.dev`
Open it on your phone → enter your passcode once → **Add to Home Screen**. It's now an app.

---

## Notes
- **The passcode matters** — the site can write to your Notion, so don't share the URL+passcode. (It's stored in your browser after the first entry.)
- **The Notion token lives only in Cloudflare secrets** — never in this repo, never in the page.
- **Nothing breaks if you skip this** — the Notion form + daily sweep work without the website. This is the nicer front door, not a dependency.
- If a Notion property is ever renamed (e.g. `Seed`, `Status`, `Post date`), update the matching names in `worker.js`.

## Want changes?
The whole tool is one file (`worker.js`). Ask Claude to add anything — e.g. an "instant script" button (needs an Anthropic API key as a secret), a resonance-notes quick-entry, or a weekly stats view.
