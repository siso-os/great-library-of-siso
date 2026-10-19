#!/usr/bin/env node
// Make long-s text searchable in modern spelling, without altering a byte of it.
//
// THE PROBLEM. 18th-century printing uses the long s (ſ), and OCR reads it as
// "f". Measured 2026-08-04 across the ingested corpus: 5,846 passages contain
// "fuch" against 6,214 for "such"; 1,964 contain "himfelf" against 1,574 for
// "himself". 20 of 78 books are affected. A reader searching "such" silently
// misses roughly half the matches.
//
// WHY NOT JUST REPLACE f WITH s. I gave that reason without testing it, then
// tested it: the corpus has 35,738 passages containing "from", 5,569 "four",
// 2,599 "full". Blind substitution yields srom, sour, sull — corruption at
// scale. The caveat was right; stating it untested was not.
//
// THE RULE. Convert a word only when the f-form is NOT in the dictionary and
// some s-substitution IS. Multi-f words need a subset search: "firft" requires
// converting the second f only, "himfelf" the second only, "fatisfaction" the
// first only. /usr/share/dict/words (235,976 entries) is the authority, not my
// judgement about which words look archaic.
//
// WHAT IT WRITES. A `body_modern` column in a SEPARATE FTS table. The original
// text is untouched — this is a search aid, not a transliteration. A reader who
// wants the 1742 page gets the 1742 page.
//
//   add-longs-variants.mjs           build the modern-spelling index
//   add-longs-variants.mjs --check   report coverage
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { corpusDb } from './lib/vault-paths.mjs';

const DB = corpusDb();
const DICT = process.env.DICT_PATH || '/usr/share/dict/words';
const check = process.argv.includes('--check');
const resume = process.argv.includes('--resume');
// SQL goes on STDIN, not argv. Measured 2026-08-04: a 2,000-row insert of full
// passage bodies exceeded the argv limit and threw E2BIG. Piping has no such
// ceiling, so batch size becomes a memory choice rather than a hard limit.
// A READER MUST NOT BE ABLE TO KILL A 45-MINUTE BUILD. Measured 2026-08-06: this
// script had no busy timeout, so ANY concurrent reader taking a lock at a commit
// point ended the run instantly with "database is locked (5)" — 1,394,000 of
// 4,130,649 rows written, and the whole build discarded.
//
// I caused it myself by testing the search CLI against the live database during
// a rebuild. But the fragility is the point: a corpus that cannot be read while
// it is rebuilt is a corpus with an hour of downtime per ingest cycle, and the
// rebuild is the LONG-RUNNING side, so it is the side that must wait.
//
// 60s rather than the reader's 5s: a reader retries a query, a writer would have
// to redo forty-five minutes.
const sq = (sql, db = DB) => execFileSync('sqlite3', ['-cmd', '.timeout 60000', db], { input: sql, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }).trim();

if (!existsSync(DB)) { console.error(`index missing (vault mounted?): ${DB}`); process.exit(70); }

if (check) {
  const has = sq("select count(*) from sqlite_master where name='passage_modern';");
  if (has === '0') { console.error('no modern index yet'); process.exit(70); }
  console.log(sq(`select 'rows', count(*) from passage_modern
    union all select 'differs_from_original', count(*) from passage_modern where changed = 1;`));
  process.exit(0);
}

if (!existsSync(DICT)) { console.error(`no dictionary at ${DICT} — refusing to guess at word validity`); process.exit(70); }
const words = new Set(readFileSync(DICT, 'utf8').split('\n').map((w) => w.trim().toLowerCase()).filter(Boolean));
console.error(`dictionary: ${words.size.toLocaleString()} entries`);

// Try every subset of f-positions, largest first, and take the first that
// yields a real word. Capped at 3 f's: beyond that the combinatorics stop being
// worth it and the word is probably OCR noise rather than long-s.
function unlongs(w) {
  const lw = w.toLowerCase();
  if (words.has(lw) || !lw.includes('f')) return null;
  const pos = [];
  for (let i = 0; i < lw.length; i += 1) if (lw[i] === 'f') pos.push(i);
  if (!pos.length || pos.length > 3) return null;
  for (let r = pos.length; r >= 1; r -= 1) {
    for (const combo of combinations(pos, r)) {
      const cand = [...lw].map((c, i) => (combo.includes(i) ? 's' : c)).join('');
      if (words.has(cand)) return cand;
    }
  }
  return null;
}
function* combinations(arr, r) {
  if (r === 0) { yield []; return; }
  for (let i = 0; i <= arr.length - r; i += 1) {
    for (const rest of combinations(arr.slice(i + 1), r - 1)) yield [arr[i], ...rest];
  }
}

// BOUNDED. Measured 2026-08-05: this Map is keyed on every distinct
// f-containing word across 88.6M words — and OCR garbage supplies effectively
// unlimited variety, so it grew without limit. The build crashed twice near
// 940,000 of 981,260 rows.
//
// 200k entries covers the real vocabulary many times over; beyond that the
// entries are almost all one-off scan noise, which is exactly what should not
// be retained.
const CACHE_MAX = 200000;
const cache = new Map();
function modernise(text) {
  let changed = false;
  const out = text.replace(/\b[A-Za-z]*f[A-Za-z]*\b/g, (w) => {
    if (!cache.has(w)) {
      if (cache.size >= CACHE_MAX) cache.clear();
      cache.set(w, unlongs(w));
    }
    const m = cache.get(w);
    if (!m) return w;
    changed = true;
    // Preserve the original capitalisation shape.
    return w[0] === w[0].toUpperCase() ? m[0].toUpperCase() + m.slice(1) : m;
  });
  return { out, changed };
}

if (!resume) {
  sq(`drop table if exists passage_modern;
CREATE VIRTUAL TABLE passage_modern USING fts5(
  ext_id UNINDEXED, seq UNINDEXED, changed UNINDEXED, body_modern,
  tokenize = 'unicode61 remove_diacritics 2');`);
}

// max(rowid), NOT count(*). Measured 2026-08-05 on this table at ~1M rows:
// count(*) did not return in five minutes over USB; max(rowid) answers in
// 169ms. Same lesson as the passage index — descend the index rather than scan
// the table.
const total = Number(sq('select max(rowid) from passage_ext_search;')) || 0;
console.error(`modernising ${total.toLocaleString()} passages`);
const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;
let done = 0;
let changedCount = 0;

// ROWID RANGES, not limit/offset. Measured 2026-08-05 at 981,260 passages:
// offset 1,000 returns in 6ms and offset 900,000 takes 27,273ms — a 4,500x
// degradation, because sqlite must walk every skipped row. Across 490 batches
// the tail alone costs hours, and the build died partway leaving
// passage_modern at 944,000 of 981,260 rows.
//
// An FTS5 table has an implicit rowid, so a range scan is constant-cost per
// batch. Same lesson as the passage index: the fix for a slow query is usually
// an index-shaped query, not a smaller batch.
const maxRow = Number(sq('select max(rowid) from passage_ext_search;')) || 0;
// RESUME. A crash at 940,000 of 981,260 used to mean starting from zero — and
// the rebuild takes well over an hour, so a restart is expensive enough that it
// might simply not happen. Pick up from the highest row already written.
const startRow = resume ? Number(sq("select coalesce(max(rowid),0) from passage_modern;")) || 0 : 0;
if (startRow > 0) console.error(`resuming from row ${startRow.toLocaleString()}`);
for (let lo = startRow + 1; lo <= maxRow; lo += 2000) {
  // JSON, not a delimited line format. Passage bodies contain embedded newlines,
  // so splitting sqlite output on '\n' shreds one row into fragments and emits
  // malformed SQL — the same defect that broke 40 titles into 154 pieces earlier
  // today. json_group_array makes sqlite responsible for its own escaping.
  const rows = JSON.parse(sq(`select json_group_array(json_array(ext_id, seq, body))
    from (select ext_id, seq, body from passage_ext_search
          where rowid >= ${lo} and rowid < ${lo + 2000});`) || '[]');
  const vals = [];
  for (const [id, seq, body] of rows) {
    const { out, changed } = modernise(String(body ?? ''));
    if (changed) changedCount += 1;
    vals.push(`(${esc(id)},${seq},${changed ? 1 : 0},${esc(out)})`);
  }
  if (vals.length) sq(`insert into passage_modern values ${vals.join(',')};`);
  done += rows.length;
  if (lo % 100000 === 1) console.error(`  ${done.toLocaleString()}/${total.toLocaleString()}`);
}

// Persist the count. Measured 2026-08-05: "select count(*) from passage_modern
// where changed = 1" did not return in five minutes over USB at ~1M rows,
// because a filtered count on an FTS5 table must scan it. Two consumers ran
// that query on every invocation. The builder already has the number.
sq(`create table if not exists modern_stats (k text primary key, v integer);
insert or replace into modern_stats values ('rows', ${done}), ('changed', ${changedCount});`);
console.error(`\n${done.toLocaleString()} passages indexed, ${changedCount.toLocaleString()} contained long-s spellings`);
console.error(`distinct words converted: ${[...cache.values()].filter(Boolean).length.toLocaleString()}`);
