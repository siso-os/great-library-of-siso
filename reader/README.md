# The Library reader

What Shaan reads: every doc, page and record SISO has written, on shelves, with full-text search. The Estate is the land;
this is the building on it (Shaan, 7 Oct). Spec: [SPEC.html](SPEC.html).

- **Build:** `heavy -- node build.mjs` writes `~/SISO_Workspace/_data/great-library/reader-dist` (about 40 s).
  Agent Base serves that folder at `/library-site/` under the Estate icon (World | Library | Register).
- **Cloud:** `node build.mjs --cloud` leaves out private docs (secrets, chat ids, Life, WhatsApp, Fahmy, the people
  graph, the Home district) and inlines console pages. `npm run deploy` uploads it to the private Worker
  https://siso-library.dtc-storefront.workers.dev (Basic Auth, user `shaan`, the estate world's `WORLD_PASSWORD`).
- **Hourly:** `bin/rebuild.sh` (launchd `com.siso.library-reader`) does both; log `~/.local/state/library/rebuild.log`.
- **Shelves:** Pages for you (console html posts), Projects (the estate register's live buildings and their docs),
  Research, Foundry (RESEARCH's `research/domains` branch), Industries, Knowledge, Banks, Works (`site/catalog.json`).
- **Open from outside:** `postMessage({ library: { open: "d/..." } })` or `({ library: { search: "words" } })`.
