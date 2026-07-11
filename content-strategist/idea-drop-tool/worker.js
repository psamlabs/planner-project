/**
 * Idea Drop — a tiny web tool connected to Pranjal's Notion content system.
 *
 * One Cloudflare Worker, no build step, no framework.
 *  - 💡 Drop tab: capture an idea → lands in the Notion 💡 Idea Bank (Status empty,
 *    so the daily Claude routine classifies it and writes a draft script inside it).
 *  - 🌱 Ideas tab: live board of every idea and where it is in the flow.
 *  - 📅 Posts tab: the Content Tracker pipeline — what's scheduled, what needs you.
 *
 * Secrets (wrangler secret put ...): NOTION_TOKEN, PASSCODE
 * Vars (wrangler.toml): IDEA_DB, TRACKER_DB
 */

const NOTION = "https://api.notion.com/v1";
const NV = "2022-06-28";

async function notion(env, path, method = "GET", body) {
  const res = await fetch(`${NOTION}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.NOTION_TOKEN}`,
      "Notion-Version": NV,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`);
  return res.json();
}

const title = (p) => (p?.title || []).map((t) => t.plain_text).join("");
const rich = (p) => (p?.rich_text || []).map((t) => t.plain_text).join("");
const sel = (p) => p?.select?.name || "";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/") {
      return new Response(HTML, { headers: { "Content-Type": "text/html;charset=utf-8" } });
    }

    // --- API (passcode-protected) ---
    if (path.startsWith("/api/")) {
      if (request.headers.get("x-pass") !== env.PASSCODE) {
        return json({ error: "wrong passcode" }, 401);
      }
      try {
        if (path === "/api/idea" && request.method === "POST") {
          const { seed, notes } = await request.json();
          if (!seed?.trim()) return json({ error: "empty idea" }, 400);
          const props = { Seed: { title: [{ text: { content: seed.trim().slice(0, 1900) } }] } };
          if (notes?.trim()) props.Notes = { rich_text: [{ text: { content: notes.trim().slice(0, 1900) } }] };
          const page = await notion(env, "/pages", "POST", {
            parent: { database_id: env.IDEA_DB },
            properties: props,
          });
          return json({ ok: true, url: page.url });
        }

        if (path === "/api/ideas") {
          const r = await notion(env, `/databases/${env.IDEA_DB}/query`, "POST", {
            sorts: [{ timestamp: "created_time", direction: "descending" }],
            page_size: 60,
          });
          return json(
            r.results.map((pg) => ({
              seed: title(pg.properties.Seed),
              status: sel(pg.properties.Status) || "🕐 New — waiting for Claude",
              series: sel(pg.properties["Series fit"]),
              platform: sel(pg.properties["Platform lean"]),
              notes: rich(pg.properties.Notes),
              url: pg.url,
              created: pg.created_time,
            }))
          );
        }

        if (path === "/api/posts") {
          const r = await notion(env, `/databases/${env.TRACKER_DB}/query`, "POST", {
            sorts: [{ property: "Post date", direction: "ascending" }],
            page_size: 100,
          });
          return json(
            r.results.map((pg) => ({
              post: title(pg.properties.Post),
              status: sel(pg.properties.Status),
              platform: sel(pg.properties.Platform),
              series: sel(pg.properties.Series),
              date: pg.properties["Post date"]?.date?.start || "",
              reframe: rich(pg.properties.Reframe),
              url: pg.url,
            }))
          );
        }
      } catch (e) {
        return json({ error: String(e.message || e) }, 502);
      }
    }

    return new Response("Not found", { status: 404 });
  },
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

const HTML = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Idea Drop 🗺️</title>
<style>
  :root{--bg:#faf6f0;--card:#fff;--ink:#2d2a26;--soft:#8a8377;--line:#e9e2d6;--accent:#5a7d6a;--accent2:#b0603f}
  @media(prefers-color-scheme:dark){:root{--bg:#191713;--card:#241f1a;--ink:#ece5d8;--soft:#9c9384;--line:#3a332b;--accent:#8fb7a1;--accent2:#d98a63}}
  *{box-sizing:border-box;margin:0}
  body{font:16px/1.55 ui-serif,Georgia,serif;background:var(--bg);color:var(--ink);max-width:640px;margin:0 auto;padding:20px 16px 60px}
  h1{font-size:1.35rem;margin-bottom:2px} .sub{color:var(--soft);font-size:.85rem;margin-bottom:18px}
  nav{display:flex;gap:8px;margin-bottom:18px}
  nav button{flex:1;padding:9px 4px;border:1px solid var(--line);background:var(--card);color:var(--soft);border-radius:10px;font:inherit;font-size:.9rem;cursor:pointer}
  nav button.on{color:var(--ink);border-color:var(--accent);box-shadow:0 1px 0 var(--accent)}
  .card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:12px}
  textarea,input{width:100%;padding:12px;border:1px solid var(--line);border-radius:10px;font:inherit;background:var(--bg);color:var(--ink)}
  textarea{min-height:110px;resize:vertical} label{font-size:.8rem;color:var(--soft);display:block;margin:10px 0 4px}
  .btn{width:100%;margin-top:14px;padding:13px;border:0;border-radius:10px;background:var(--accent);color:#fff;font:inherit;font-size:1rem;cursor:pointer}
  .btn:disabled{opacity:.5} .msg{margin-top:10px;font-size:.9rem;color:var(--accent);text-align:center;min-height:1.3em}
  .item{display:block;text-decoration:none;color:inherit;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);margin-bottom:8px}
  .item b{font-weight:600;font-size:.95rem;display:block;margin-bottom:3px}
  .meta{font-size:.75rem;color:var(--soft)} .chip{display:inline-block;padding:1px 8px;border:1px solid var(--line);border-radius:99px;margin-right:5px;font-size:.72rem}
  .grp{font-size:.8rem;color:var(--soft);letter-spacing:.04em;margin:18px 0 8px;text-transform:uppercase}
  .quiet{color:var(--soft);text-align:center;padding:30px 0;font-size:.9rem}
</style></head><body>
<h1>Idea Drop 🗺️</h1><div class="sub">notice → drop it here → Claude scripts it → it's on the board</div>
<nav>
  <button id="t-drop" class="on" onclick="tab('drop')">💡 Drop</button>
  <button id="t-ideas" onclick="tab('ideas')">🌱 Ideas</button>
  <button id="t-posts" onclick="tab('posts')">📅 Posts</button>
</nav>

<div id="p-drop">
  <div class="card">
    <label>What did you notice? (one messy sentence is enough)</label>
    <textarea id="seed" placeholder="the flower seller wraps the stems before you've paid…"></textarea>
    <label>Notes — optional context</label>
    <input id="notes" placeholder="felt like it's about trust? maybe LinkedIn">
    <button class="btn" id="go" onclick="drop()">Drop it 🌱</button>
    <div class="msg" id="msg"></div>
  </div>
</div>
<div id="p-ideas" hidden><div id="ideas" class="quiet">loading…</div></div>
<div id="p-posts" hidden><div id="posts" class="quiet">loading…</div></div>

<script>
const $=id=>document.getElementById(id);
function pass(){let p=localStorage.pass;if(!p){p=prompt("Passcode?")||"";localStorage.pass=p}return p}
async function api(path,opts={}){const r=await fetch(path,{...opts,headers:{"Content-Type":"application/json","x-pass":pass(),...(opts.headers||{})}});if(r.status===401){localStorage.removeItem("pass");throw new Error("Wrong passcode — reload and try again")}const d=await r.json();if(!r.ok)throw new Error(d.error||"error");return d}
function tab(t){for(const x of["drop","ideas","posts"]){$("p-"+x).hidden=x!==t;$("t-"+x).classList.toggle("on",x===t)}if(t==="ideas")loadIdeas();if(t==="posts")loadPosts()}
async function drop(){const s=$("seed").value.trim();if(!s){$("msg").textContent="write the noticing first 🙂";return}$("go").disabled=true;$("msg").textContent="dropping…";try{await api("/api/idea",{method:"POST",body:JSON.stringify({seed:s,notes:$("notes").value})});$("seed").value="";$("notes").value="";$("msg").textContent="🌱 dropped — Claude scripts it in the morning sweep"}catch(e){$("msg").textContent="⚠️ "+e.message}$("go").disabled=false}
function chip(v){return v?'<span class="chip">'+v+'</span>':""}
async function loadIdeas(){const el=$("ideas");try{const d=await api("/api/ideas");if(!d.length){el.innerHTML='<div class="quiet">no ideas yet — go notice something 👀</div>';return}
const order=["🕐 New — waiting for Claude","🌱 Fresh","📅 Slotted","✅ Used"];let h="";
for(const g of order){const rows=d.filter(i=>i.status===g);if(!rows.length)continue;h+='<div class="grp">'+g+' · '+rows.length+'</div>';
for(const i of rows)h+='<a class="item" target="_blank" href="'+i.url+'"><b>'+esc(i.seed)+'</b><span class="meta">'+chip(i.series)+chip(i.platform)+(i.notes?esc(i.notes):"")+'</span></a>'}
el.innerHTML=h}catch(e){el.innerHTML='<div class="quiet">⚠️ '+e.message+'</div>'}}
async function loadPosts(){const el=$("posts");try{const d=await api("/api/posts");if(!d.length){el.innerHTML='<div class="quiet">tracker is empty</div>';return}
const today=new Date().toISOString().slice(0,10);let h="";const need=d.filter(p=>p.status==="✍️ Needs my specifics");
if(need.length){h+='<div class="grp">✍️ needs you · '+need.length+'</div>';for(const p of need)h+=row(p)}
h+='<div class="grp">📆 upcoming</div>';for(const p of d.filter(p=>p.date>=today&&p.status!=="📤 Posted"&&p.status!=="📊 Reviewed").slice(0,15))h+=row(p);
el.innerHTML=h}catch(e){el.innerHTML='<div class="quiet">⚠️ '+e.message+'</div>'}}
function row(p){return '<a class="item" target="_blank" href="'+p.url+'"><b>'+esc(p.post)+'</b><span class="meta">'+chip(p.date)+chip(p.platform)+chip(p.status)+(p.reframe?esc(p.reframe):"")+'</span></a>'}
function esc(s){return s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}
</script></body></html>`;
