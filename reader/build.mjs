#!/usr/bin/env node
// The Library reader: one static build over the shelves (spec: LIBRARY, 7 Oct 2026).
// Reads the estate in place, writes a Notion-style site with full-text search (Pagefind), and copies no private
// payload into git: the output goes outside the repository. `--cloud` builds the copy for the private Cloudflare
// Worker, which leaves out Life, WhatsApp, Fahmy, the Rolodex, personal/ and anything that looks like a key.
//
//   node build.mjs [--cloud] [--out DIR] [--ws WORKSPACE]
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const CLOUD = process.argv.includes("--cloud");
const WS = path.resolve(arg("--ws", process.env.SISO_WORKSPACE || path.join(os.homedir(), "SISO_Workspace")));
const OUT = path.resolve(arg("--out", path.join(WS, "_data/great-library", CLOUD ? "reader-dist-cloud" : "reader-dist")));
const GL = path.join(WS, "Great_Library_of_SISO");
const CONSOLE_EVENTS = path.join(os.homedir(), ".claude/console/state/events.jsonl");
const CONSOLE_URL = "http://127.0.0.1:8891";
const PUBLIC_SITE = "https://great-library-of-siso.pages.dev";
const NOW = Date.now();
const DAY = 86_400_000;

// ---------- privacy ----------
const SECRET = /(sk-(?:ant-|proj-)?[A-Za-z0-9_-]{24,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY|xox[baprs]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{35}|eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})/;
const PRIVATE_WORDS = /whatsapp|life ?log|lifelock|calorie|fahmy|rolodex|people-graph|people graph/i;
const PRIVATE_AGENTS = /^(LIFE|WHATSAPP|ROLODEX|FAHMY)/i;
const NEVER_PATH = /(^|\/)(personal|\.credentials|\.env[^/]*)(\/|$)/;

// ---------- small helpers ----------
const read = (p) => { try { return fs.readFileSync(p, "utf8"); } catch { return null; } };
const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };
const sha = (s) => crypto.createHash("sha1").update(s).digest("hex");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const slug = (s) => String(s).toLowerCase().replace(/\.(md|html?)$/i, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "doc";
const relWs = (p) => path.relative(WS, p);
const SKIP_DIR = /^(node_modules|\.git|dist|build|\.next|target|venv|\.venv|__pycache__|coverage|evidence|receipts?|runs?|logs?|shots?|screenshots|snapshots|fixtures|test-results|generated|vendor|_archive|archive|tmp|cache|\.cache|out|\.playwright-cli|\.wrangler|\.vercel|\.serena|\.omc)$/i;
function walk(dir, { depth = 4, max = 400, ext = /\.(md|html?)$/i } = {}) {
  const out = [];
  const go = (d, n) => {
    if (n > depth || out.length >= max) return;
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es.sort((a, b) => a.name.localeCompare(b.name))) {
      if (e.isSymbolicLink()) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!SKIP_DIR.test(e.name) && !e.name.startsWith(".")) go(p, n + 1); }
      else if (ext.test(e.name) && out.length < max) out.push(p);
    }
  };
  go(dir, 0);
  return out;
}
const fmtDay = (t) => new Date(t).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Bangkok" });
const isoDay = (t) => new Date(t + 7 * 3600_000).toISOString().slice(0, 10);
const ago = (t) => { const d = Math.floor((NOW - t) / DAY); return d <= 0 ? "today" : d === 1 ? "yesterday" : d < 7 ? `${d} days ago` : d < 60 ? `${Math.round(d / 7)} wk ago` : fmtDay(t); };
function stripFront(src) { return src.startsWith("---\n") ? src.replace(/^---\n[\s\S]*?\n---\n/, "") : src; }
function frontMatter(src) {
  const m = /^---\n([\s\S]*?)\n---\n/.exec(src); if (!m) return {};
  const o = {}; for (const line of m[1].split("\n")) { const k = /^([a-z_]+):\s*(.*)$/i.exec(line); if (k) o[k[1]] = k[2].replace(/^['"]|['"]$/g, ""); } return o;
}
function htmlText(h) {
  return h.replace(/<(script|style|svg|noscript)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/\s+/g, " ").trim();
}
const htmlTitle = (h) => { const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(h) || /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(h); return m ? htmlText(m[1]).slice(0, 140) : null; };
function mdTitle(src, fallback) { const m = /^#\s+(.+)$/m.exec(stripFront(src)); return m ? m[1].replace(/[*_`]/g, "").trim().slice(0, 140) : fallback; }
function mdSummary(src) {
  const body = stripFront(src).split("\n").filter((l) => l.trim() && !/^(#|\||<!--|```|---|>|\s*[-*] \[|!\[)/.test(l.trim()));
  return body.slice(0, 3).join(" ").replace(/[*_`#>]/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\s+/g, " ").trim().slice(0, 220);
}

// ---------- the catalogue ----------
/** A doc: one readable page. A group: a folder of docs (a project, a day, an industry). A shelf: a top-level collection. */
const SHELVES = [
  { id: "pages", name: "Pages for you", icon: "sparkles", line: "Every page an agent has shown you, newest first" },
  { id: "projects", name: "Projects", icon: "folder", line: "Each live project's front door, specs, decisions and where the work stands" },
  { id: "research", name: "Research", icon: "flask", line: "God Questions, Foundry findings and the research records" },
  { id: "foundry", name: "Foundry", icon: "radar", line: "What the world has built that we can use: repos, components, award sites, models, people, ranked" },
  { id: "industries", name: "Industries", icon: "factory", line: "Industry packs: the operator, their day, the tools, the open-source replacements" },
  { id: "knowledge", name: "Knowledge", icon: "brain", line: "Ranked insights from talks and papers, by topic" },
  { id: "banks", name: "Banks", icon: "boxes", line: "Components, repos and templates to build from" },
  { id: "works", name: "Works", icon: "library", line: "The 51 registered Works and their dossiers" },
];
const docs = [];
const groups = new Map(); // key shelf/group -> {shelf, id, name, section, line, facts, docs:[], url, private}
const byHash = new Map();
const byPath = new Map();
const usedUrls = new Set();
function group(shelf, id, name, extra = {}) {
  const key = `${shelf}/${id}`;
  if (!groups.has(key)) groups.set(key, { shelf, id, name, docs: [], url: `s/${shelf}/${slug(id)}/`, ...extra });
  return groups.get(key);
}
function addDoc(g, d) {
  // Fold duplicates: identical content anywhere is one page, listed wherever it belongs.
  if (d.hash && byHash.has(d.hash)) { const first = byHash.get(d.hash); first.also = [...(first.also || []), d.rel].slice(0, 8); g.docs.push(first); return first; }
  let url = `d/${g.shelf}/${slug(g.id)}/${slug(d.slugHint || d.title)}/`;
  for (let i = 2; usedUrls.has(url); i++) url = `d/${g.shelf}/${slug(g.id)}/${slug(d.slugHint || d.title)}-${i}/`;
  usedUrls.add(url);
  const doc = { ...d, shelf: g.shelf, group: g, url };
  if (d.hash) byHash.set(d.hash, doc);
  if (d.src) byPath.set(d.src, doc);
  docs.push(doc); g.docs.push(doc);
  return doc;
}
function fileDoc(g, p, extra = {}) {
  if (NEVER_PATH.test(relWs(p))) return null;
  let size = 0; try { size = fs.statSync(p).size; } catch { return null; }
  if (size > 1_500_000 || size < 40) return null;
  const src = read(p); if (src == null) return null;
  const html = /\.html?$/i.test(p);
  const title = extra.title || (html ? htmlTitle(src) : mdTitle(src, null)) || path.basename(p).replace(/\.(md|html?)$/i, "");
  const priv = SECRET.test(src) || PRIVATE_WORDS.test(relWs(p)) || !!extra.private;
  return addDoc(g, { kind: html ? "html" : "md", src: p, rel: relWs(p), title, summary: html ? htmlText(src).slice(0, 220) : mdSummary(src), mtime: mtime(p), hash: sha(src), private: priv, ...extra, title });
}

// 1. Pages for you: every HTML page posted to Shaan in the console. Versions of one title fold into one page.
function sessionTitles(ids) {
  const want = new Set(ids.filter((a) => /^[0-9a-f]{8}-[0-9a-f]{3}$/.test(a))); const out = {};
  if (!want.size) return out;
  const roots = [path.join(os.homedir(), ".claude/projects"), ...fs.readdirSync(path.join(os.homedir(), ".config")).filter((n) => n.startsWith("claude")).map((n) => path.join(os.homedir(), ".config", n, "projects"))];
  for (const r of roots) {
    let dirs; try { dirs = fs.readdirSync(r); } catch { continue; }
    for (const d of dirs) {
      let names; try { names = fs.readdirSync(path.join(r, d)); } catch { continue; }
      for (const n of names) {
        const id = n.slice(0, 12); if (!want.has(id) || out[id] || !n.endsWith(".jsonl")) continue;
        try {
          const f = path.join(r, d, n), size = fs.statSync(f).size, len = Math.min(size, 400_000), buf = Buffer.alloc(len), fd = fs.openSync(f, "r");
          fs.readSync(fd, buf, 0, len, size - len); fs.closeSync(fd);
          const m = [...buf.toString("utf8").matchAll(/"aiTitle":"((?:[^"\\]|\\.){1,120})"/g)].pop();
          if (m) out[id] = JSON.parse(`"${m[1]}"`);
        } catch {}
      }
    }
  }
  return out;
}
function collectPages() {
  const raw = read(CONSOLE_EVENTS); if (!raw) return;
  const posts = new Map();
  for (const line of raw.split("\n")) {
    if (!line.includes('"kind":"html"')) continue;
    try { const e = JSON.parse(line); if (e.type === "post" && e.kind === "html" && e.body) posts.set(e.id, e); } catch {}
  }
  const byTitle = new Map();
  for (const c of posts.values()) {
    const k = `${c.agent}|${(c.title || htmlTitle(c.body) || c.id).toLowerCase().trim()}`;
    (byTitle.get(k) || byTitle.set(k, []).get(k)).push(c);
  }
  const names = sessionTitles([...new Set([...posts.values()].map((c) => c.agent))]);
  for (const versions of byTitle.values()) {
    versions.sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
    const c = versions[0], t = Date.parse(c.ts) || NOW;
    const text = htmlText(c.body);
    const owner = names[c.agent] ? `${names[c.agent]}` : c.agent;
    const priv = PRIVATE_AGENTS.test(c.agent) || PRIVATE_WORDS.test(`${c.title} ${text.slice(0, 20000)}`) || SECRET.test(c.body);
    const g = group("pages", isoDay(t), fmtDay(t), { sort: -t, section: t > NOW - 7 * DAY ? "This week" : t > NOW - 31 * DAY ? "This month" : "Earlier" });
    addDoc(g, { kind: "console", card: c.id, title: c.title || htmlTitle(c.body) || "Untitled page", owner, agent: c.agent, rel: `console card ${c.id}`, mtime: t, summary: text.slice(0, 220), text, body: c.body, versions: versions.slice(1).map((v) => ({ id: v.id, ts: v.ts })), private: priv, slugHint: `${c.title || "page"}-${c.id.slice(-6)}` });
  }
}

// 2. Projects: every active, ours, estate building's door, status, specs and decisions.
const DISTRICT = (b) => b.island === "engine" ? "Agent stack" : b.island === "library" ? "Library" : b.island === "home" ? "Home" : /^HALO/i.test(b.postcode) || /partners\/halo/.test(b.path) ? "HALO" : "Agency";
const DISTRICT_ORDER = ["Agent stack", "Agency", "HALO", "Library", "Home"];
function collectProjects() {
  const reg = JSON.parse(read(path.join(WS, "SISO_Agents/siso-estate/machines/register.json")) || "{}");
  for (const b of reg.buildings || []) {
    if (!["agency", "engine", "library", "home"].includes(b.island) || !["active", "warm"].includes(b.lifecycle) || b.provenance !== "ours") continue;
    if (NEVER_PATH.test(b.path) || /partners\/halo\/crm\/repo/.test(b.path)) continue;
    const root = path.join(WS, b.path); if (!fs.existsSync(root)) continue;
    const door = read(path.join(root, "AGENTS.md")) || "";
    const one = (/\*\*In one line:\*\*\s*(.+)/.exec(door) || [])[1]?.replace(/District:.*$/, "").trim() || b.description || "";
    const name = b.postcode.split("/").pop();
    const district = DISTRICT(b);
    const priv = district === "Home" || PRIVATE_WORDS.test(b.path + " " + b.postcode);
    const g = group("projects", b.postcode, name, { section: district, line: one, private: priv, building: b, mtime: 0 });
    const files = [];
    for (const f of ["AGENTS.md", "README.md", "SPEC.md", "PRINCIPLES.md", "ARCHITECTURE.md", "ROADMAP.md", "CURRENT_STATE.md", ".agents/HANDOFF.md"]) if (fs.existsSync(path.join(root, f))) files.push(path.join(root, f));
    for (const d of ["docs", "domain-base", "specs", "adr"]) files.push(...walk(path.join(root, d), { depth: 4, max: 80 }));
    for (const p of files) {
      const base = path.relative(root, p);
      const role = base === "AGENTS.md" ? "Start here" : base === ".agents/HANDOFF.md" || base === "CURRENT_STATE.md" ? "Where it stands" : /adr|decision/i.test(base) ? "Decisions" : /spec|plan|design|roadmap|principles|architecture/i.test(base) ? "Specs and plans" : base === "README.md" ? "Start here" : "Docs";
      const title = base === "AGENTS.md" ? "Front door (AGENTS.md)" : base === ".agents/HANDOFF.md" ? "Where the work stands (HANDOFF)" : undefined;
      const d = fileDoc(g, p, { role, owner: b.seat || null, private: priv, ...(title ? { title } : {}) });
      if (d) g.mtime = Math.max(g.mtime, d.mtime);
    }
  }
}

// 3. Research
function collectResearch() {
  const sets = [
    ["god-questions", "God Questions and frontier research", [...["god-questions-infrastructure.html", "question-driven-research.html", "research-question-model.html", "frontier-question-template.html", "100-million-token-program.html", "100-million-token-operating-plan.html"].map((f) => path.join(GL, "docs", f))]],
    ["foundry", "Foundry intelligence", [...walk(path.join(GL, "foundry/intelligence"), { depth: 4 }), ...walk(path.join(GL, "foundry/docs"), { depth: 3 }), path.join(GL, "foundry/README.md"), path.join(GL, "foundry/ARCHITECTURE.md")]],
    ["ecosystem", "Ecosystem and knowledge models", ["ecosystem-intelligence.html", "foundry-agency-intelligence.html", "siso-knowledge-model.html", "siso-mission.html", "agent-stack-model.html", "skills-repository-map.html"].map((f) => path.join(GL, "docs", f))],
    ["people-graph", "People graph research", [...walk(path.join(GL, "research"), { depth: 3 }), ...walk(path.join(GL, "people-graph"), { depth: 1 })]],
    ["evidence-engines", "Evidence engines and Erdős", [...walk(path.join(GL, "works/siso-evidence-engines"), { depth: 2 }), ...walk(path.join(GL, "works/erdos"), { depth: 1, max: 30 }), ...walk(path.join(GL, "works/unfuck-the-project"), { depth: 2 })]],
  ];
  for (const [id, name, files] of sets) {
    const g = group("research", id, name, { private: id === "people-graph" });
    for (const p of files) if (fs.existsSync(p)) fileDoc(g, p, { private: id === "people-graph" });
  }
}

// 4. Industries
function collectIndustries() {
  const root = path.join(GL, "works/siso-industry-packs/packs");
  let packs = []; try { packs = fs.readdirSync(root).filter((n) => fs.statSync(path.join(root, n)).isDirectory()); } catch {}
  const names = { "00-SUMMARY": "Summary", "01-person": "The operator", "02-workflow": "Their working day", "03-companies": "The tools they pay for", "04-oss-candidates": "Open-source replacements", "05-superapp": "The super-app", "06-value": "The value", README: "About this pack" };
  for (const p of packs) {
    const pretty = p.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const sum = read(path.join(root, p, "00-SUMMARY.md")) || "";
    const g = group("industries", p, pretty, { line: mdSummary(sum) });
    for (const f of fs.readdirSync(path.join(root, p)).filter((f) => /\.md$/.test(f)).sort()) {
      const k = f.replace(/\.md$/, "");
      fileDoc(g, path.join(root, p, f), { title: `${pretty} · ${names[k] || k}`, slugHint: k });
    }
  }
}

// 5. Knowledge: one page per topic shelf, its insights ranked by score.
function collectKnowledge() {
  const root = path.join(GL, "knowledge/sections");
  let sections = []; try { sections = fs.readdirSync(root).filter((n) => fs.existsSync(path.join(root, n, "bookcases"))); } catch {}
  for (const s of sections) {
    const g = group("knowledge", s, s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()));
    for (const bc of fs.readdirSync(path.join(root, s, "bookcases")).sort()) {
      const shelvesDir = path.join(root, s, "bookcases", bc, "shelves"); if (!fs.existsSync(shelvesDir)) continue;
      for (const sh of fs.readdirSync(shelvesDir).sort()) {
        const pagesDir = path.join(shelvesDir, sh, "pages"); if (!fs.existsSync(pagesDir)) continue;
        const items = [];
        for (const f of fs.readdirSync(pagesDir).filter((f) => f.endsWith(".md"))) {
          const src = read(path.join(pagesDir, f)); if (!src) continue;
          const fm = frontMatter(src); const body = stripFront(src);
          const claim = (/\*\*Claim\*\*:\s*(.+)/.exec(body) || [])[1] || "";
          const title = mdTitle(src, fm.title || f);
          items.push({ title, creator: fm.creator || "", score: parseFloat(fm.score) || 0, tier: fm.tier || "", claim, body: body.replace(/^#\s+.+$/m, "").trim(), video: fm.source_video || "" });
        }
        if (!items.length) continue;
        items.sort((a, b) => b.score - a.score);
        const label = `${bc.replace(/_/g, " ")} · ${sh.replace(/_/g, " ")}`;
        addDoc(g, { kind: "knowledge", title: label.replace(/\b\w/g, (c) => c.toUpperCase()), rel: relWs(path.join(shelvesDir, sh)), mtime: mtime(pagesDir), items, summary: `${items.length} insights. Top: ${items.slice(0, 3).map((i) => i.title).join("; ")}`.slice(0, 220), slugHint: `${bc}-${sh}` });
      }
    }
  }
}

// 6. Banks
function collectBanks() {
  const root = path.join(GL, "banks");
  let banks = []; try { banks = fs.readdirSync(root).filter((n) => fs.statSync(path.join(root, n)).isDirectory()); } catch {}
  for (const b of banks) {
    const r = path.join(root, b);
    const door = read(path.join(r, "AGENTS.md")) || read(path.join(r, "README.md")) || "";
    const g = group("banks", b, b, { line: (/\*\*In one line:\*\*\s*(.+)/.exec(door) || [])[1]?.replace(/District:.*$/, "").trim() || mdSummary(door) });
    for (const f of ["README.md", "AGENTS.md"]) if (fs.existsSync(path.join(r, f))) fileDoc(g, path.join(r, f), f === "AGENTS.md" ? { title: `${b} · front door` } : {});
    for (const p of walk(path.join(r, "docs"), { depth: 2, max: 40 })) fileDoc(g, p);
  }
}

// 7. Works: the registered catalogue, linking to the public dossiers.
function collectWorks() {
  let cat; try { cat = JSON.parse(read(path.join(GL, "site/catalog.json"))); } catch { return; }
  for (const w of cat.works || []) {
    const g = group("works", w.section || "Unassigned", w.section || "Unassigned");
    addDoc(g, { kind: "work", title: w.name, summary: w.summary, work: w, rel: `registry ${w.id}`, mtime: Date.parse(cat.generated_at) || 0, slugHint: w.slug });
  }
}

// 8. Foundry: RESEARCH's records (the mini's research/domains branch, read from git so nothing touches the mini).
const AREA_NAMES = { "3d-motion": "3D and motion", assets: "Assets", awards: "Award-winning sites", components: "Components", "image-gen": "Image generation", people: "People", shells: "App shells", videos: "Videos", frameworks: "Frameworks", harnesses: "Harnesses", mcp: "MCP servers", memory: "Memory", "skill-hubs": "Skill hubs", "dictation-apps": "Dictation apps", "speech-models": "Speech models", stt: "Speech to text", tts: "Text to speech", "voice-agents": "Voice agents", "voice-ui": "Voice UI" };
const DOMAIN_NAMES = { ui: "UI", "agent-bases": "Agent bases", voice: "Voice" };
function collectFoundry() {
  const repo = path.join(GL, "foundry"), ref = "refs/remotes/origin/research/domains";
  try { execFileSync("git", ["-C", repo, "fetch", "-q", "origin", `research/domains:${ref}`], { timeout: 90_000, stdio: "ignore" }); } catch {}
  let doms = []; try { doms = execFileSync("git", ["-C", repo, "ls-tree", "--name-only", `${ref}:research`], { encoding: "utf8" }).split("\n").filter((d) => d && !/\./.test(d) && d !== "tools"); } catch { return; }
  for (const dom of doms) {
    let raw; try { raw = execFileSync("git", ["-C", repo, "show", `${ref}:research/${dom}/records.jsonl`], { encoding: "utf8", maxBuffer: 300e6 }); } catch { continue; }
    const recs = raw.trim().split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    const dn = DOMAIN_NAMES[dom] || dom;
    const g = group("foundry", dom, dn, { line: `${recs.length.toLocaleString()} records, each probed live and kept with its sources. Ranked 5 to 1 by RESEARCH's curators.` });
    const areas = new Map(); for (const r of recs) (areas.get(r.area) || areas.set(r.area, []).get(r.area)).push(r);
    for (const [area, items] of [...areas].sort((a, b) => b[1].length - a[1].length)) {
      items.sort((a, b) => (b.rank || 0) - (a.rank || 0) || (b.stars || 0) - (a.stars || 0) || String(b.date || b.pushed || "").localeCompare(String(a.date || a.pushed || "")));
      const an = AREA_NAMES[area] || area;
      const latest = Math.max(...items.map((r) => Date.parse(r.first_seen || "") || 0));
      addDoc(g, { kind: "foundry", title: `${dn} · ${an}`, items, rel: `foundry research/${dom}/records.jsonl · ${area}`, owner: "RESEARCH", mtime: latest, summary: `${items.length} records. Top: ${items.slice(0, 3).map((r) => r.title).join("; ")}`.slice(0, 220), slugHint: area });
    }
  }
}

// Live pages: Agent Base's probed list (its seed until the estate keeps one), when this machine runs Agent Base.
let LIVE = [];
async function collectLive() {
  try { const r = await fetch("http://127.0.0.1:5401/api/library", { signal: AbortSignal.timeout(15_000) }); const d = await r.json(); LIVE = (d.live?.rows || []).filter((x) => x.url); } catch { LIVE = []; }
}

// ---------- rendering ----------
function mdRenderer() {
  const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
  md.use(anchor, { level: [2, 3], slugify: (s) => slug(s), callback: (token, info) => { md.__toc?.push({ level: Number(token.tag.slice(1)), slug: info.slug, title: info.title }); } });
  const linkOpen = md.renderer.rules.link_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
  md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
    const t = tokens[idx]; const href = t.attrGet("href") || "";
    if (/^https?:/i.test(href)) { t.attrSet("target", "_blank"); t.attrSet("rel", "noopener"); }
    else if (href.startsWith("#")) { /* in-page */ }
    else if (env.src) {
      const target = path.resolve(path.dirname(env.src), decodeURIComponent(href.split("#")[0]));
      const d = byPath.get(target) || byPath.get(path.join(target, "README.md"));
      if (d && (!CLOUD || !d.private)) t.attrSet("href", env.R(d.url)); else { t.attrSet("href", "#"); t.attrSet("data-dead", relWs(target)); t.attrSet("title", `Not in the Library: ${relWs(target)}`); }
    }
    return linkOpen(tokens, idx, opts, env, self);
  };
  md.renderer.rules.image = (tokens, idx) => {
    const t = tokens[idx], src = t.attrGet("src") || "", alt = t.content || "image";
    return /^https:/i.test(src) ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy">` : `<span class="img-missing">[image: ${esc(alt)}]</span>`;
  };
  return md;
}
const md = mdRenderer();
function renderMd(src, env) { md.__toc = []; const html = md.render(stripFront(src), env); const toc = md.__toc; md.__toc = null; return { html, toc }; }

const ICON = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  sparkles: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>', folder: '<path d="M3 6h6l2 2h10v11H3z"/>', flask: '<path d="M9 3h6M10 3v6L4 20h16L14 9V3"/>',
  factory: '<path d="M3 21V10l6 4V10l6 4V6h6v15z"/>', brain: '<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3h0V4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3V4z"/>',
  boxes: '<path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4V11M21 7v10l-9 4"/>', library: '<path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-1 3 15.5-3.5 1z"/>', radar: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 19 5"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>', menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
};
const icon = (n, s = 16) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON[n] || ""}</svg>`;

const visible = (d) => !CLOUD || !d.private;
const visibleGroup = (g) => (!CLOUD || !g.private) && g.docs.some(visible);
function shelfGroups(shelf) {
  const gs = [...groups.values()].filter((g) => g.shelf === shelf && visibleGroup(g));
  if (shelf === "pages") return gs.sort((a, b) => a.sort - b.sort);
  if (shelf === "projects") return gs.sort((a, b) => DISTRICT_ORDER.indexOf(a.section) - DISTRICT_ORDER.indexOf(b.section) || b.mtime - a.mtime);
  return gs.sort((a, b) => a.name.localeCompare(b.name));
}
const shelfCount = (s) => shelfGroups(s).reduce((n, g) => n + new Set(g.docs.filter(visible)).size, 0);

function sidebar(R, cur = {}) {
  const shelves = SHELVES.map((s) => {
    const on = cur.shelf === s.id;
    let inner = "";
    if (on) {
      const gs = shelfGroups(s.id); let lastSec = null; const cap = s.id === "pages" ? 21 : 80;
      inner = '<div class="tree">' + gs.slice(0, cap).map((g) => {
        const sec = g.section && g.section !== lastSec ? `<div class="sec">${esc(g.section)}</div>` : ""; lastSec = g.section || lastSec;
        const gOn = cur.group === g;
        const kids = gOn && g.docs.length > 1 ? '<div class="kids">' + [...new Set(g.docs.filter(visible))].slice(0, 60).map((d) => `<a class="leaf${cur.doc === d ? " on" : ""}" href="${R(d.url)}">${esc(d.title)}</a>`).join("") + "</div>" : "";
        return `${sec}<a class="node${gOn && !cur.doc ? " on" : ""}" href="${R(g.url)}"><span>${esc(g.name)}</span><small>${new Set(g.docs.filter(visible)).size}</small></a>${kids}`;
      }).join("") + (gs.length > cap ? `<a class="node more" href="${R(`s/${s.id}/`)}">All ${gs.length} →</a>` : "") + "</div>";
    }
    return `<a class="shelf-link${on && !cur.group ? " on" : on ? " open" : ""}" href="${R(`s/${s.id}/`)}">${icon(s.icon)}<span>${esc(s.name)}</span><small>${shelfCount(s.id)}</small></a>${inner}`;
  }).join("");
  return `<aside class="side" id="side">
  <a class="brand" href="${R("")}"><span class="mark">${icon("library", 18)}</span><span><b>Great Library</b><small>of SISO</small></span></a>
  <button class="q" type="button" data-search>${icon("search", 15)}<span>Search everything</span><kbd>⌘K</kbd></button>
  <nav>
    <a class="shelf-link${cur.home ? " on" : ""}" href="${R("")}">${icon("home")}<span>Home</span></a>
    <a class="shelf-link" href="${R("")}#starred">${icon("star")}<span>Starred</span><small data-star-count></small></a>
    <a class="shelf-link" href="${R("")}#recent">${icon("clock")}<span>Recent</span></a>
    <div class="h">Shelves</div>
    ${shelves}
  </nav>
  <div class="foot">${CLOUD ? "Private copy · laptop holds the rest" : "Laptop copy"} · built ${new Date(NOW).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" })}</div>
</aside>`;
}

function layout({ depth, title, cur, main, toc = "", wide = false, page = {} }) {
  const R = (u) => "../".repeat(depth) + u;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)} · Great Library</title><meta name="robots" content="noindex"><link rel="stylesheet" href="${R("assets/library.css")}">
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f5a524" stroke-width="2"><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l3.5-1 3 15.5-3.5 1z"/></svg>')}">
</head><body data-base="${R("")}" data-url="${esc(page.url || "")}" data-title="${esc(page.title || "")}" data-kind="${esc(page.kind || "")}">
<div class="shell${wide ? " wide" : ""}">
${sidebar(R, cur)}
<div class="scrim" data-close-side></div>
<main class="main"><button class="menu" type="button" data-open-side aria-label="Shelves">${icon("menu", 18)}</button>${main}</main>
${toc ? `<nav class="toc"><b>On this page</b>${toc}</nav>` : ""}
</div>
<div class="search" id="search" hidden><div class="search-box"><div class="search-in">${icon("search", 18)}<input type="search" placeholder="Search every doc, page and insight" autocomplete="off" spellcheck="false"><kbd>esc</kbd></div><div class="search-out" role="listbox"></div></div></div>
<script src="${R("assets/library.js")}" defer></script>
</body></html>`;
}

const crumb = (R, parts) => `<div class="crumb">${parts.map(([t, u]) => (u != null ? `<a href="${R(u)}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join("<i>/</i>")}</div>`;
const docRow = (R, d, opts = {}) => `<a class="row" href="${R(d.url)}"><span class="t">${esc(d.title)}</span>${opts.group ? `<span class="g">${esc(d.group.name)}</span>` : ""}<span class="s">${esc(d.summary || "")}</span><span class="m">${d.owner ? esc(d.owner) + " · " : ""}${d.mtime ? ago(d.mtime) : ""}</span></a>`;

function docMain(d, R) {
  const g = d.group, shelf = SHELVES.find((s) => s.id === d.shelf);
  const meta = [];
  if (d.owner) meta.push(`<span class="pill">${esc(d.owner)}</span>`);
  if (d.mtime) meta.push(`<span>${esc(fmtDay(d.mtime))} · ${esc(ago(d.mtime))}</span>`);
  if (d.rel && d.kind !== "work") meta.push(`<button class="src" type="button" data-copy="${esc(d.kind === "console" ? `${CONSOLE_URL}/card/${d.card}/html` : `~/SISO_Workspace/${d.rel}`)}" title="Copy the source path">${esc(d.kind === "console" ? "console page" : d.rel)}</button>`);
  if (d.also?.length) meta.push(`<span title="${esc(d.also.join("\n"))}">+${d.also.length} identical cop${d.also.length > 1 ? "ies" : "y"} folded</span>`);
  meta.push(`<button class="star" type="button" data-star aria-label="Star">${icon("star", 15)}</button>`);
  let body = "", toc = "", wide = false;
  if (d.kind === "md") {
    const r = renderMd(read(d.src) || "", { src: d.src, R });
    body = `<article class="prose" data-pagefind-body>${r.html.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>/, "")}</article>`;
    if (r.toc.length > 2) toc = r.toc.map((t) => `<a class="l${t.level}" href="#${esc(t.slug)}">${esc(t.title)}</a>`).join("");
  } else if (d.kind === "html" || d.kind === "console") {
    wide = true;
    const frame = d.kind === "console" && !CLOUD ? `${CONSOLE_URL}/card/${d.card}/html` : R(`raw/${d.url.replace(/\/$/, "").replace(/\//g, "_")}.html`);
    const versions = d.versions?.length ? `<details class="versions"><summary>${d.versions.length} earlier version${d.versions.length > 1 ? "s" : ""}</summary>${d.versions.map((v) => (CLOUD ? `<span>${esc(fmtDay(Date.parse(v.ts)))}</span>` : `<a href="${CONSOLE_URL}/card/${esc(v.id)}/html" target="_blank" rel="noopener">${esc(new Date(v.ts).toLocaleString("en-GB", { timeZone: "Asia/Bangkok" }))}</a>`)).join("")}</details>` : "";
    body = `<div class="frame-bar"><a href="${esc(frame)}" target="_blank" rel="noopener">${icon("ext", 14)} Open on its own</a>${versions}</div><iframe class="frame" src="${esc(frame)}" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms" loading="lazy" title="${esc(d.title)}"></iframe><div class="sr" data-pagefind-body>${esc((d.text || htmlText(read(d.src) || "")).slice(0, 60000))}</div>`;
  } else if (d.kind === "knowledge") {
    body = `<article class="prose" data-pagefind-body><p class="lede">${d.items.length} insights from talks and papers, best first. Tier A are the strongest.</p>${d.items.map((it, i) => `<section class="insight${i >= 40 ? " more" : ""}"><h3 id="i${i}"><span class="tier t${esc(it.tier)}">${esc(it.tier || "–")}</span>${esc(it.title)}</h3><div class="by">${esc(it.creator)}${it.score ? ` · score ${it.score.toFixed(1)}` : ""}${it.video ? ` · <a href="https://youtu.be/${esc(it.video)}" target="_blank" rel="noopener">watch</a>` : ""}</div>${md.render(it.body.replace(/\*\*Claim\*\*:[^\n]*\n?/, "").slice(0, 2400))}</section>`).join("")}${d.items.length > 40 ? `<button class="show-more" type="button" data-more>Show all ${d.items.length}</button>` : ""}</article>`;
  } else if (d.kind === "foundry") {
    const host = (u) => { try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; } };
    const card = (r, i) => {
      const link = r.url || (r.github ? `https://github.com/${r.github}` : "");
      const tags = [r.kind, r.stars ? `★ ${Number(r.stars).toLocaleString()}` : "", r.licence && !/reference only/.test(r.licence) ? r.licence : "", r.award, r.by, r.date || r.pushed].filter(Boolean).slice(0, 5);
      return `<div class="rec${i >= 120 ? " more" : ""}">${r.preview ? `<div class="pv"><img src="${esc(r.preview)}" alt="" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover" onerror="this.parentElement.remove()"></div>` : ""}<div class="bd"><h3 id="r-${esc(r.id)}">${r.rank ? `<span class="rank">${"●".repeat(r.rank)}</span>` : ""}<a href="${esc(link)}" target="_blank" rel="noopener">${esc(r.title || host(link))}</a></h3>${r.why ? `<p class="why">${esc(r.why)}</p>` : ""}${r.desc ? `<p>${esc(String(r.desc).slice(0, 260))}</p>` : ""}<div class="tg"><span>${esc(host(link))}</span>${tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div></div></div>`;
    };
    const ranked = d.items.filter((r) => r.rank).length;
    body = `<article data-pagefind-body><p class="lede">${d.items.length.toLocaleString()} records${ranked ? `, ${ranked} ranked by RESEARCH (● to ●●●●●, best first)` : ""}. Each was probed live; ask any agent <code>foundry find &lt;words&gt;</code> for the same list.</p><div class="recs">${d.items.map(card).join("")}</div>${d.items.length > 120 ? `<button class="show-more" type="button" data-more>Show all ${d.items.length.toLocaleString()}</button>` : ""}</article>`;
  } else if (d.kind === "work") {
    const w = d.work;
    body = `<article class="prose" data-pagefind-body><p class="lede">${esc(w.summary)}</p><dl class="facts"><dt>Kind</dt><dd>${esc(w.type || "")}</dd><dt>Maturity</dt><dd>${esc(w.maturity || "")}</dd><dt>Section</dt><dd>${esc(w.section || "")}</dd><dt>Work ID</dt><dd><code>${esc(w.id)}</code></dd></dl><h2>Open it</h2><ul><li><a href="${PUBLIC_SITE}${esc(w.library_url)}" target="_blank" rel="noopener">The dossier on the public Library</a></li>${(w.source_links || []).map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.kind)}</a>${l.visibility ? ` <small>(${esc(l.visibility)})</small>` : ""}</li>`).join("")}</ul></article>`;
  }
  const main = `<div class="page${wide ? " wide" : ""}">${crumb(R, [["Library", ""], [shelf.name, `s/${shelf.id}/`], [g.name, g.url]])}<h1 data-pagefind-meta="title">${esc(d.title)}</h1><span hidden data-pagefind-meta="where">${esc(shelf.name)} · ${esc(g.name)}</span><div class="meta">${meta.join("")}</div>${body}</div>`;
  return { main, toc, wide };
}

function groupMain(g, R) {
  const shelf = SHELVES.find((s) => s.id === g.shelf);
  const list = [...new Set(g.docs.filter(visible))];
  let head = g.line ? `<p class="lede">${esc(g.line)}</p>` : "";
  if (g.building) {
    const b = g.building;
    const live = LIVE.filter((x) => x.path && (x.path === b.path || b.path.startsWith(x.path + "/") || x.path.startsWith(b.path + "/"))).map((x) => x.url);
    head += `<dl class="facts"><dt>District</dt><dd>${esc(g.section)}</dd><dt>State</dt><dd>${esc(b.lifecycle)}</dd>${b.seat ? `<dt>Keeper</dt><dd>${esc(b.seat)}</dd>` : ""}<dt>Where</dt><dd><button class="src" type="button" data-copy="~/SISO_Workspace/${esc(b.path)}">${esc(b.path)}</button></dd>${live.length ? `<dt>Live</dt><dd>${live.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(u.replace(/^https?:\/\//, ""))}</a>`).join(" · ")}</dd>` : ""}${g.mtime ? `<dt>Last doc change</dt><dd>${esc(ago(g.mtime))}</dd>` : ""}</dl>`;
  }
  let body;
  if (g.shelf === "projects") {
    const roles = ["Start here", "Where it stands", "Specs and plans", "Decisions", "Docs"];
    body = roles.map((r) => { const ds = list.filter((d) => (d.role || "Docs") === r); return ds.length ? `<h2>${r}</h2><div class="rows">${ds.map((d) => docRow(R, d)).join("")}</div>` : ""; }).join("");
  } else body = `<div class="rows">${list.map((d) => docRow(R, d)).join("")}</div>`;
  return `<div class="page">${crumb(R, [["Library", ""], [shelf.name, `s/${shelf.id}/`]])}<h1 data-pagefind-meta="title">${esc(g.name)}</h1><span hidden data-pagefind-meta="where">${esc(shelf.name)}</span><div class="meta"><span>${list.length} doc${list.length === 1 ? "" : "s"}</span></div>${head}<div data-pagefind-body class="sr">${esc(g.name)} ${esc(g.line || "")}</div>${body}</div>`;
}

function shelfMain(s, R) {
  const gs = shelfGroups(s.id);
  let body;
  if (s.id === "pages") {
    const all = gs.flatMap((g) => [...new Set(g.docs.filter(visible))]);
    const owners = [...all.reduce((m, d) => m.set(d.owner, (m.get(d.owner) || 0) + 1), new Map())].sort((a, b) => b[1] - a[1]).slice(0, 14);
    body = `<div class="chips" data-filter-chips><button type="button" class="on" data-chip="">All ${all.length}</button>${owners.map(([o, n]) => `<button type="button" data-chip="${esc(o)}">${esc(o)} ${n}</button>`).join("")}</div>` +
      gs.slice(0, 60).map((g) => `<h2>${esc(g.name)}</h2><div class="rows">${[...new Set(g.docs.filter(visible))].map((d) => docRow(R, d).replace('class="row"', `class="row" data-owner="${esc(d.owner)}"`)).join("")}</div>`).join("") + (gs.length > 60 ? `<p class="lede">Older days are in search.</p>` : "");
  } else if (s.id === "projects") {
    const live = LIVE.filter((x) => !CLOUD || x.auth !== "local");
    body = (live.length ? `<h2>Live now</h2><div class="rows">${live.map((x) => `<a class="row" href="${esc(x.url)}" target="_blank" rel="noopener"><span class="t">${esc(x.name)}</span><span class="m">${esc(x.status === "up" ? "up" : x.status || "")}${x.code ? " · " + x.code : ""}</span><span class="s">${esc(x.url.replace(/^https?:\/\//, ""))}${x.deploy ? " · deploy: " + esc(x.deploy) : ""}</span></a>`).join("")}</div>` : "") + DISTRICT_ORDER.map((sec) => { const xs = gs.filter((g) => g.section === sec); return xs.length ? `<h2>${sec}</h2><div class="cards">${xs.map((g) => `<a class="card" href="${R(g.url)}"><b>${esc(g.name)}</b><p>${esc(g.line || "")}</p><small>${new Set(g.docs.filter(visible)).size} docs${g.mtime ? " · " + ago(g.mtime) : ""}</small></a>`).join("")}</div>` : ""; }).join("");
  } else {
    body = `<div class="cards">${gs.map((g) => `<a class="card" href="${R(g.url)}"><b>${esc(g.name)}</b><p>${esc(g.line || [...new Set(g.docs.filter(visible))].slice(0, 3).map((d) => d.title).join(" · "))}</p><small>${new Set(g.docs.filter(visible)).size} docs</small></a>`).join("")}</div>`;
  }
  return `<div class="page">${crumb(R, [["Library", ""]])}<h1>${icon(s.icon, 26)} ${esc(s.name)}</h1><p class="lede">${esc(s.line)}</p>${body}</div>`;
}

function homeMain(R) {
  const fresh = docs.filter((d) => visible(d) && (!d.group.private || !CLOUD) && ["pages", "projects", "research"].includes(d.shelf) && d.mtime > NOW - 7 * DAY && d.kind !== "knowledge").sort((a, b) => b.mtime - a.mtime).slice(0, 14);
  const total = new Set(docs.filter(visible)).size;
  return `<div class="page home">
  <div class="hero"><h1>The Great Library</h1><p class="lede">Everything written for you, everything we know, and everything you can build from: ${total.toLocaleString()} docs on ${SHELVES.length} shelves. The Estate is the land; this is the building.</p>
  <button class="bigq" type="button" data-search>${icon("search", 18)}<span>Search every word: specs, pages, packs, insights…</span><kbd>⌘K</kbd></button></div>
  <div class="stats"><div><b>${shelfCount("pages")}</b><span>pages agents made you</span></div><div><b>${shelfGroups("projects").length}</b><span>live projects, ${shelfCount("projects")} docs</span></div><div><b>${shelfGroups("foundry").reduce((n, g) => n + g.docs.reduce((m, d) => m + (d.items?.length || 0), 0), 0).toLocaleString()}</b><span>Foundry records</span></div><div><b>${shelfGroups("knowledge").reduce((n, g) => n + g.docs.reduce((m, d) => m + (d.items?.length || 0), 0), 0).toLocaleString()}</b><span>ranked insights</span></div></div>
  <div id="starred" class="block" data-starred hidden><h2>${icon("star", 16)} Starred</h2><div class="rows" data-starred-list></div></div>
  <div class="block"><h2>New this week</h2><div class="rows">${fresh.map((d) => docRow(R, d, { group: true })).join("") || '<p class="lede">Nothing new this week.</p>'}</div></div>
  <div class="block"><h2>Shelves</h2><div class="cards">${SHELVES.map((s) => `<a class="card shelf" href="${R(`s/${s.id}/`)}"><b>${icon(s.icon, 18)} ${esc(s.name)}<span>${shelfCount(s.id).toLocaleString()}</span></b><p>${esc(s.line)}</p></a>`).join("")}</div></div>
  <div id="recent" class="block" data-recent hidden><h2>${icon("clock", 16)} Recently opened</h2><div class="rows" data-recent-list></div></div>
</div>`;
}

// ---------- write ----------
function write(rel, html) { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); }
function stripBigData(h) { return h.replace(/(["'(])data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]{300000,}/g, '$1data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22320%22 height=%2290%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%23222%22/%3E%3Ctext x=%2216%22 y=%2250%22 fill=%22%23999%22 font-family=%22sans-serif%22 font-size=%2214%22%3EImage kept on the laptop%3C/text%3E%3C/svg%3E'); }

async function main() {
  const t0 = Date.now();
  await collectLive();
  collectPages(); collectResearch(); collectFoundry(); collectProjects(); collectIndustries(); collectKnowledge(); collectBanks(); collectWorks();
  fs.rmSync(OUT, { recursive: true, force: true }); // OUT is this build's own output folder, regenerated every run
  fs.mkdirSync(path.join(OUT, "assets"), { recursive: true });
  for (const f of ["library.css", "library.js"]) fs.copyFileSync(path.join(HERE, "src", f), path.join(OUT, "assets", f));
  const depthOf = (u) => u.split("/").filter(Boolean).length;
  let n = 0;
  write("index.html", layout({ depth: 0, title: "Home", cur: { home: true }, main: homeMain((u) => u) })); n++;
  for (const s of SHELVES) { const depth = 2; const R = (u) => "../".repeat(depth) + u; write(`s/${s.id}/index.html`, layout({ depth, title: s.name, cur: { shelf: s.id }, main: shelfMain(s, R) })); n++; }
  for (const g of groups.values()) {
    if (!visibleGroup(g)) continue;
    const depth = depthOf(g.url), R = (u) => "../".repeat(depth) + u;
    write(`${g.url}index.html`, layout({ depth, title: g.name, cur: { shelf: g.shelf, group: g }, main: groupMain(g, R), page: { url: g.url, title: g.name, kind: "group" } })); n++;
  }
  for (const d of docs) {
    if (!visible(d) || (CLOUD && d.group.private)) continue;
    const depth = depthOf(d.url), R = (u) => "../".repeat(depth) + u;
    const r = docMain(d, R);
    write(`${d.url}index.html`, layout({ depth, title: d.title, cur: { shelf: d.shelf, group: d.group, doc: d }, main: r.main, toc: r.toc, wide: r.wide, page: { url: d.url, title: d.title, kind: d.kind } })); n++;
    if (d.kind === "html") write(`raw/${d.url.replace(/\/$/, "").replace(/\//g, "_")}.html`, read(d.src) || "");
    if (d.kind === "console" && CLOUD) write(`raw/${d.url.replace(/\/$/, "").replace(/\//g, "_")}.html`, stripBigData(d.body));
  }
  // For agents: the whole catalogue as JSON, and a short llms.txt.
  const index = docs.filter((d) => visible(d) && !(CLOUD && d.group.private)).map((d) => ({ title: d.title, shelf: d.shelf, group: d.group.name, url: d.url, source: d.kind === "console" ? `console:${d.card}` : d.rel, owner: d.owner || null, updated: d.mtime ? new Date(d.mtime).toISOString() : null, summary: d.summary || "" }));
  write("catalogue.json", JSON.stringify({ built: new Date(NOW).toISOString(), cloud: CLOUD, shelves: SHELVES.map((s) => ({ ...s, count: shelfCount(s.id) })), docs: index }));
  write("llms.txt", `# The Great Library of SISO (private reader)\n\nShelves: ${SHELVES.map((s) => `${s.name} (${shelfCount(s.id)})`).join(", ")}.\nEvery doc with its source path: ./catalogue.json\nFull-text search: ./pagefind/ (Pagefind index)\n`);
  const pf = path.join(HERE, "node_modules/.bin/pagefind");
  const out = execFileSync(pf, ["--site", OUT, "--output-subdir", "pagefind", "--quiet"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  console.log(JSON.stringify({ out: OUT, cloud: CLOUD, pages: n, docs: index.length, shelves: Object.fromEntries(SHELVES.map((s) => [s.id, shelfCount(s.id)])), seconds: Math.round((Date.now() - t0) / 100) / 10, pagefind: out.trim().split("\n").slice(-2).join(" ") }));
}
main();
