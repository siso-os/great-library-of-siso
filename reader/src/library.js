// The Library reader: ⌘K search over Pagefind, stars, recent, copy-path, filters and the phone drawer.
(() => {
  const base = document.body.dataset.base || "";
  const href = (u) => new URL(base + u, location.href).href;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const store = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

  // ---- recent and starred ----
  const me = { url: document.body.dataset.url, title: document.body.dataset.title };
  if (me.url) store.set("lib.recent", [me, ...store.get("lib.recent", []).filter((r) => r.url !== me.url)].slice(0, 30));
  const stars = () => store.get("lib.star", []);
  const starBtn = document.querySelector("[data-star]");
  const paintStar = () => starBtn?.classList.toggle("on", stars().some((s) => s.url === me.url));
  starBtn?.addEventListener("click", () => {
    const s = stars(); const on = s.some((x) => x.url === me.url);
    store.set("lib.star", on ? s.filter((x) => x.url !== me.url) : [me, ...s]); paintStar(); paintCount();
  });
  paintStar();
  const paintCount = () => { const n = stars().length; document.querySelectorAll("[data-star-count]").forEach((e) => (e.textContent = n || "")); };
  paintCount();
  const list = (sel, items) => {
    const box = document.querySelector(sel); if (!box || !items.length) return;
    box.innerHTML = items.map((r) => `<a class="row" href="${esc(href(r.url))}"><span class="t">${esc(r.title)}</span><span class="s">${esc(r.url.split("/").slice(1, 3).join(" · "))}</span></a>`).join("");
    box.parentElement.hidden = false;
  };
  list("[data-starred-list]", stars());
  list("[data-recent-list]", store.get("lib.recent", []).slice(0, 10));

  // ---- copy source path ----
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]"); if (!b) return;
    navigator.clipboard?.writeText(b.dataset.copy).then(() => { b.classList.add("copied"); const t = b.textContent; b.textContent = "Copied"; setTimeout(() => { b.textContent = t; b.classList.remove("copied"); }, 1100); });
  });

  // ---- show more (knowledge insights, foundry records) ----
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-more]"); if (!b) return;
    b.parentElement.querySelectorAll(".more").forEach((x) => x.classList.add("shown")); b.remove();
  });

  // ---- owner chips on Pages for you ----
  const chips = document.querySelector("[data-filter-chips]");
  chips?.addEventListener("click", (e) => {
    const b = e.target.closest("[data-chip]"); if (!b) return;
    chips.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
    const who = b.dataset.chip;
    document.querySelectorAll(".row[data-owner]").forEach((r) => (r.hidden = !!who && r.dataset.owner !== who));
    document.querySelectorAll(".page h2").forEach((h) => { const rows = h.nextElementSibling; if (rows?.classList.contains("rows")) h.hidden = rows.hidden = ![...rows.children].some((r) => !r.hidden); });
  });

  // ---- phone drawer ----
  document.querySelector("[data-open-side]")?.addEventListener("click", () => document.body.classList.add("side-open"));
  document.querySelector("[data-close-side]")?.addEventListener("click", () => document.body.classList.remove("side-open"));

  // ---- table of contents: mark the heading in view ----
  const tocLinks = [...document.querySelectorAll(".toc a")];
  if (tocLinks.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) tocLinks.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id)); }, { rootMargin: "0px 0px -75% 0px" });
    tocLinks.forEach((a) => { const h = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1))); if (h) io.observe(h); });
  }

  // ---- search ----
  const box = document.getElementById("search"), input = box.querySelector("input"), out = box.querySelector(".search-out");
  let pf = null, sel = 0, hits = [], seq = 0;
  const load = async () => { if (!pf) { pf = await import(href("pagefind/pagefind.js")); await pf.options?.({ excerptLength: 22 }); pf.init?.(); } return pf; };
  const open = () => { box.hidden = false; input.focus(); input.select(); load().catch(() => (out.innerHTML = '<div class="search-empty">Search index not built.</div>')); if (!input.value) out.innerHTML = '<div class="search-empty">Type to search every doc, page, pack, insight and Foundry record.</div>'; };
  const close = () => { box.hidden = true; };
  const paint = () => {
    out.innerHTML = hits.length ? hits.map((h, i) => `<a class="hit${i === sel ? " on" : ""}" href="${esc(h.url)}"><small>${esc(h.where)}</small><b>${esc(h.title)}</b><p>${h.excerpt}</p></a>`).join("") : `<div class="search-empty">Nothing found for “${esc(input.value)}”.</div>`;
    out.querySelector(".hit.on")?.scrollIntoView({ block: "nearest" });
  };
  const run = async () => {
    const q = input.value.trim(), my = ++seq;
    if (!q) { out.innerHTML = '<div class="search-empty">Type to search.</div>'; hits = []; return; }
    const p = await load(); const r = await p.debouncedSearch(q, {}, 140); if (!r || my !== seq) return;
    const data = await Promise.all(r.results.slice(0, 24).map((x) => x.data()));
    hits = data.flatMap((d) => {
      const page = { url: d.url, title: d.meta?.title || d.url, excerpt: d.excerpt, where: d.meta?.where || "" };
      const subs = (d.sub_results || []).filter((s) => s.url !== d.url && s.title && s.title !== page.title).slice(0, 2).map((s) => ({ url: s.url, title: s.title, excerpt: s.excerpt, where: `${page.where} · ${page.title}` }));
      return [page, ...subs];
    }).slice(0, 30).map((h) => ({ ...h, url: href(h.url.replace(/^\//, "")) }));
    sel = 0; paint();
  };
  input.addEventListener("input", run);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(0, Math.min(hits.length - 1, sel + (e.key === "ArrowDown" ? 1 : -1))); paint(); }
    else if (e.key === "Enter" && hits[sel]) location.href = hits[sel].url;
    else if (e.key === "Escape") close();
  });
  box.addEventListener("click", (e) => { if (e.target === box) close(); });
  document.querySelectorAll("[data-search]").forEach((b) => b.addEventListener("click", open));
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); box.hidden ? open() : close(); }
    else if (e.key === "/" && box.hidden && !/input|textarea/i.test(document.activeElement?.tagName || "")) { e.preventDefault(); open(); }
  });
  // Agent Base can open a doc or a search: postMessage({library:{open:"d/..."}}) or ({library:{search:"words"}}).
  addEventListener("message", (e) => { const m = e.data?.library; if (!m) return; if (m.open) location.href = href(m.open); if (m.search != null) { open(); input.value = m.search; run(); } });
})();
