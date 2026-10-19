#!/usr/bin/env node
// Search the Internet Archive corpus. The reason the indexes exist.
//
// WHY THIS EXISTS. On 2026-08-04 I built a passage index (122,553 passages) and
// then a modern-spelling index that roughly doubles recall on 18th-century text
// — and nothing read either of them. Both were reachable only by someone who
// knew the vault path and wrote their own SQL. That is the same defect as the
// outbox holding three undelivered messages: the content existed, nothing
// surfaced it.
//
// SEARCHES BOTH INDEXES BY DEFAULT. The original preserves the page as printed;
// the modern index resolves long-s OCR ("fuch" -> "such"). A reader asking for
// "such" wants both, and gets a merged, deduplicated result telling them which
// index matched.
//
//   search-library.mjs "vegetarian"
//   search-library.mjs "parliament AND debate" --limit 5
//   search-library.mjs "cookery" --original     only the text as printed
//   search-library.mjs --stats                  what is searchable
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { corpusDb, readOnlyUri } from './lib/vault-paths.mjs';

let DB;
try { DB = corpusDb(); } catch (err) {
  console.error(`index not configured: ${err.message}`);
  process.exit(70);
}
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] ? args[i + 1] : d; };
const query = args.filter((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--limit').join(' ').trim();

if (!existsSync(DB)) { console.error(`index not available (is the vault mounted?): ${DB}`); process.exit(70); }
const sq = (sql) => {
  try {
    // WAIT FOR A LOCK, DO NOT DIE ON ONE. Measured 2026-08-06: while the modern
    // index was being built — a write transaction over 4.1M rows lasting the
    // better part of an hour — every query died at the startup schema check, so
    // the new /search endpoint returned HTTP 500 for the whole rebuild.
    //
    // A reader hitting the page during an ingest cycle would conclude search is
    // broken. -cmd '.timeout' makes sqlite retry for 5s instead of failing at
    // once, which covers the brief windows between the writer's commits.
    return execFileSync('sqlite3', ['-cmd', '.timeout 5000', readOnlyUri(DB)], { input: sql, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch (err) {
    // A MALFORMED QUERY IS THE READER'S TYPO, NOT A CRASH. Measured 2026-08-06:
    // searching `'; drop table book_ext;--` produced a Node stack trace. The
    // database was never at risk — this connection is mode=ro and FTS5 rejected
    // the string as invalid grammar — but a search tool that dies on a stray
    // quote tells the reader nothing about what to fix.
    const msg = String(err?.stderr || err?.message || '');
    const m = msg.match(/fts5: (.+)/) || msg.match(/(unterminated string)/i);
    if (m) {
      console.error(`not a valid search expression: ${m[1].trim()}`);
      console.error('FTS5 syntax: bare words, "quoted phrases", AND / OR / NOT, NEAR(a b).');
      process.exit(65); // EX_DATAERR — bad input, not a failure of the tool
    }
    throw err;
  }
};

// passage_modern is OPTIONAL: build-external-passages drops and recreates the
// database, so it is absent between an index rebuild and add-longs-variants.
// Measured 2026-08-05 against a fixture: --stats threw instead of reporting the
// tables that DO exist. A stats command that dies on a missing optional table
// tells the reader nothing about what is present.
const hasModern = sq("select count(*) from sqlite_master where name='passage_modern';") === '1';

if (flag('--stats')) {
  // Stored aggregates. Measured 2026-08-05: the three scans below cost ~430s
  // over USB at 981,260 passages. The builders record them; --stats reads them.
  console.log(sq(`select 'books', coalesce((select v from corpus_stats where k='books'),-1)
    union all select 'passages', coalesce((select v from corpus_stats where k='passages'),-1)
    union all select 'words', coalesce((select v from corpus_stats where k='words'),-1)
    union all select 'with_headings', coalesce((select v from corpus_stats where k='with_headings'),-1)
    ${hasModern ? "union all select 'long_s_passages', coalesce((select v from modern_stats where k='changed'),-1)" : ''};`));
  if (!hasModern) console.error('note: passage_modern absent — run node scripts/add-longs-variants.mjs. long-s counts omitted, NOT zero.');
  process.exit(0);
}

if (!query) {
  console.error('usage: search-library.mjs "<fts5 query>" [--limit N] [--original] [--modern] [--stats]');
  process.exit(64);
}

const limit = Number(val('--limit', '8'));
if (!Number.isSafeInteger(limit) || limit < 1) {
  console.error('--limit must be a positive integer');
  process.exit(64);
}
const useOriginal = !flag('--modern');
let useModern = !flag('--original');
if (useModern && !hasModern) {
  if (flag('--modern')) {
    console.error('modern index unavailable; build it with node scripts/add-longs-variants.mjs');
    process.exit(70);
  }
  console.error('note: modern index unavailable; searching printed text only');
  useModern = false;
}
// Escape single quotes for SQL. FTS5 operators (AND/OR/NEAR/quotes) pass
// through deliberately — this is a search tool, not a sanitised form field.
const q = query.replace(/'/g, "''");

// json_group_array so sqlite escapes its own output. Passage bodies contain
// embedded newlines and quotes; a delimited line format shreds them, which is
// how 40 titles became 154 fragments earlier today.
const rows = [];
if (useOriginal) {
  // snippet() is an FTS5 auxiliary function and only works in the query that
  // owns the MATCH — wrapping it directly in json_group_array throws "unable to
  // use function snippet in the requested context". Compute it in a subquery,
  // aggregate outside.
  const out = sq(`select json_group_array(json_array('printed', title, ext_id, seq, snip)) from (
      select b.title, t.ext_id, t.seq, t.snip, t.r
      from (
        select s.ext_id, s.seq, snippet(passage_ext_search, 3, '[', ']', '…', 14) snip,
               bm25(passage_ext_search) r
        from passage_ext_search s
        where passage_ext_search match 'body:${q}'
        -- CAP INSIDE THE MATCH, THEN RANK. Measured 2026-08-06: this query had NO
        -- ordering at all, so a reader got whatever rows FTS5 yielded first —
        -- rowid order, which is the alphabetically-first book by identifier.
        --
        -- Mean occurrences of the term across the top 5 results:
        --
        --   quinine      1.0 unranked -> 5.2 ranked
        --   telescope    1.2          -> 3.6
        --   botany       1.2          -> 4.0
        --   vaccination  1.4          -> 3.8
        --
        -- Every unranked top hit mentioned the term ONCE. For "quinine" the best
        -- passage in the corpus mentions it NINE times and no reader ever saw it.
        --
        -- The cap must sit INSIDE this subquery, not outside as a rowid filter:
        -- measured, a rowid restriction still let ORDER BY bm25 score every match
        -- and "such" took 208 SECONDS. Bounding the MATCH first costs 62ms and
        -- returns the IDENTICAL top 5 as full ranking (5.2 / 3.6 / 4.0).
        limit 40000
      ) t join book_ext b on b.ext_id = t.ext_id
      order by t.r limit ${limit});`);
  rows.push(...JSON.parse(out || '[]'));
}
// EXCLUDE BY ROWID, NOT BY POSTING LIST. The overlap exclusion used to be an
// unlimited NOT IN over a MATCH subquery and cost 434 SECONDS on "the": SQLite
// materialises all 2,723,718 printed matches, then scans the modern index
// against them.
//
// A budget on term frequency was the first fix, and it was bad: measured
// 2026-08-06, SEVENTEEN of twenty classic long-s words — such, those, first,
// present, cause, himself, house, sense, disease, surface — exceeded it. The
// modern index was being disabled for 85% of the queries it exists to serve,
// which is not a tradeoff, it is switching the feature off.
//
// THE KEY FACT: passage_modern and passage_ext_search assign the SAME ROWID to
// the same passage (verified at rowid 500 — antislaverydisun00unse:40 in both).
// So the exclusion needs no cross-index set operation at all: for each modern
// hit, look up that rowid in the printed index's CONTENT TABLE — an ordinary
// B-tree — and ask whether the printed text contains the terms.
//
// PER TERM, NOT AS A PHRASE. FTS matching "electromagnetic induction" means both
// words appear anywhere; a literal LIKE '%electromagnetic induction%' finds only
// the adjacent phrase. Measured: FTS 10 rows, phrase-LIKE 2, per-term-LIKE 10.
// The phrase form would have admitted 8 duplicates.
const terms = query
  .replace(/["'()]/g, ' ')
  .split(/\s+/)
  .filter((t) => t && !/^(and|or|not|near)$/i.test(t))
  .map((t) => t.toLowerCase().replace(/'/g, "''"));
const printedHasAll = terms.length
  ? terms.map((t) => `lower(c.c3) like '%${t}%'`).join(' and ')
  : '1';

if (useModern) {
  const out = sq(`select json_group_array(json_array('modernised', b.title, u.ext_id, u.seq, u.snip)) from (
      select t.ext_id, t.seq, t.snip, t.r
      from (
        select m.ext_id, m.seq, m.rowid rid,
               snippet(passage_modern, 3, '[', ']', '…', 14) snip,
               bm25(passage_modern) r
        from passage_modern m
        where passage_modern match 'body_modern:${q}'
        -- Same shape as the printed query: bound the MATCH, THEN rank. A rowid
        -- restriction outside the subquery does not bound the work — measured
        -- 2026-08-06, "himfelf" took 23.5s that way and 417ms this way.
        limit 40000
      ) t
      -- EXCLUDE BEFORE JOINING. Measured 2026-08-06: joining book_ext first made
      -- "himself" take 87 SECONDS, because the join resolved a title for all
      -- 40,000 capped candidates before the exclusion threw nearly all of them
      -- away. Cap+rank alone is 65ms and the exclusion adds 68ms; the join was
      -- the whole cost.
      --
      -- ONLY passages the printed index cannot find — the "witneffed",
      -- "creaturcs" text a reader searching modern spelling would never reach.
      where not exists (
        select 1 from passage_ext_search_content c
        where c.rowid = t.rid and ${printedHasAll})
      order by t.r limit ${limit}
    ) u join book_ext b on b.ext_id = u.ext_id;`);
  rows.push(...JSON.parse(out || '[]'));
}

// Dedup on (ext_id, seq): a passage matching in both indexes is ONE result. The
// printed form wins, because it is what the book actually says.
//
// INTERLEAVED, not concatenated. Measured 2026-08-04: 1,963 passages containing
// "himfelf" are findable ONLY through the modern index — and a naive
// printed-then-modern order fills the whole result page from the printed index,
// so the modern-only hits never appear. The recall gain would exist in the
// table and never reach a reader, which is the exact defect this tool was
// written to fix.
// EXACT EXCLUSION, CHEAPLY. The SQL above bounds its NOT IN window for speed
// (434s -> 395ms on "the"), and a bounded window can admit a false positive: a
// passage that IS in the printed index but sorts outside the window. Measured
// 2026-08-06 on "himfelf" — 3 of 3 modern results were duplicates the unbounded
// form correctly excluded.
//
// So the bound buys speed and this buys back correctness: ask the printed index
// about the handful of survivors directly. That is `limit` lookups on an indexed
// column, not a 2.7-million-row list.
// NO SECOND QUERY. My first attempt at exact exclusion re-ran
// `match 'body:${q}'` to test the survivors, which re-materialised the same
// posting list the bound existed to avoid — "the" went 395ms -> 231 SECONDS.
// The same trap as the original defect, one layer down, and I walked into it
// while fixing it.
//
// The dedup below already removes any (ext_id, seq) appearing in BOTH result
// sets, and it costs nothing because both are already in memory. That is the
// exclusion the reader actually experiences: no duplicate reaches the page.
//
// What the bounded SQL window still buys is that modern-only hits are not
// crowded out by shared ones — which is why it stays.

const printed = rows.filter((r) => r[0] === 'printed');
const modernised = rows.filter((r) => r[0] === 'modernised');
const seen = new Set();
const merged = [];
for (let i = 0; i < Math.max(printed.length, modernised.length); i += 1) {
  for (const r of [printed[i], modernised[i]]) {
    if (!r) continue;
    const [via, title, id, seq, snip] = r;
    const key = `${id}:${seq}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({ via, title, id, seq, snip });
  }
}

if (!merged.length) {
  console.log(`no matches for ${JSON.stringify(query)}`);
  // A zero here is a real answer, not a failure — but say which indexes were
  // consulted, so "not found" cannot be mistaken for "not searched".
  console.log(`(searched: ${[useOriginal && 'printed', useModern && 'modernised'].filter(Boolean).join(' + ')})`);
  process.exit(0);
}

for (const m of merged.slice(0, limit)) {
  console.log(`\n${m.title.slice(0, 78)}`);
  console.log(`  ${m.id}:${m.seq}  (${m.via})`);
  console.log(`  ${m.snip.replace(/\s+/g, ' ').trim()}`);
}
console.log(`\n${merged.length} passage(s); showing ${Math.min(merged.length, limit)}`);
