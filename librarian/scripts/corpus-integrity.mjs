#!/usr/bin/env node
// Check the ingested corpus for duplication — by title AND by content.
//
// WHY BOTH. The ingest dedups CANDIDATES by normalised title before fetching.
// Nothing had ever verified that worked, and title matching is blind to the
// same text arriving under two different titles — a reprint, a re-issue, a
// volume split across editions.
//
// WHAT A SHARED PASSAGE MEANS. Measured 2026-08-05 across 179 books: 3 shared
// fingerprints, each a single passage, and all three are QUOTATION —
//
//   b21471745 / b21471848_0001    a childcare passage quoted in two Victorian
//                                 domestic-economy manuals
//   johndonnehisflig00molo /      a Donne criticism passage quoted in two works
//   metaphysicallyri00unse        on metaphysical poetry
//
// That is what a library of related works SHOULD contain. This reports shared
// passages; it does not treat them as defects, because deciding that requires
// reading them.
//
//   corpus-integrity.mjs           report
//   corpus-integrity.mjs --strict  exit non-zero on EXACT title duplicates
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { corpusDb } from './lib/vault-paths.mjs';

// Overridable so this can be tested against a fixture. A check that can only
// run against the real corpus cannot be proven to detect anything — the same
// defect as a self-test that exercises sqlite instead of the script.
const DB = corpusDb();
if (!existsSync(DB)) {
  // The corpus lives on external storage that is legitimately absent sometimes.
  // This gate is in the verify chain, so exiting non-zero here would block EVERY
  // push whenever the vault is unplugged — a failure that is not a defect.
  //
  // Reported, not silent: a skipped check that says nothing is indistinguishable
  // from a check that passed, which is the defect this repo keeps finding.
  console.log(JSON.stringify({
    skipped: true,
    reason: 'corpus index unavailable — vault not mounted',
    path: DB,
    note: 'NOT a pass. Nothing was checked. Run npm run corpus:integrity with the vault mounted.',
  }, null, 2));
  process.exit(0);
}
// BUSY TIMEOUT. Measured 2026-08-06: no script in this pipeline waited for a
// lock, so any concurrent reader could end a long build with "database is
// locked (5)" — it killed a 45-minute modern-index build after 1.39M of 4.13M
// rows. Writers wait; the corpus stays readable while it rebuilds.
const sq = (sql) => execFileSync('sqlite3', ['-cmd', '.timeout 60000', `file:${DB}?mode=ro`], { input: sql, encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 }).trim();

const SEP = String.fromCharCode(31);
// A rebuild in flight holds a write lock, and sqlite returns "database is
// locked (5)". Measured 2026-08-05: npm run verify exited 1 mid-rebuild — a
// gate reporting a defect that does not exist, which is the fastest way to
// train a reader to ignore it.
//
// Skipped, not failed, and it says which: a locked database is a timing
// condition, not a corpus problem.
let books;
try {
  books = Number(sq('select count(*) from book_ext;'));
} catch (err) {
  if (/database is locked/i.test(String(err.stderr || err.message || ''))) {
    console.log(JSON.stringify({
      skipped: true,
      reason: 'corpus index is locked — a rebuild is in flight',
      note: 'NOT a pass. Re-run when the rebuild finishes.',
    }, null, 2));
    process.exit(0);
  }
  throw err;
}
// Exact title duplicates. Measured 2026-08-05 at 927 books, the first one ever
// found is NOT duplicated content: two years of "Annual report of the progress
// of chemistry..." collide because IA TRUNCATES long titles and the volume
// distinction falls off the end. They hold 2,201 and 2,483 passages with
// different opening text.
//
// So this reports the passage counts alongside the title: identical counts mean
// a real duplicate, differing counts mean a truncated serial. A reader should
// not have to query the database to tell those apart.
const exactDupes = JSON.parse(sq(`select json_group_array(json_array(title, n, sizes)) from (
  select title, count(*) n, group_concat(passages) sizes
  from book_ext group by title having n > 1);`) || '[]');

// Fingerprint LONG passages only. Short ones collide on boilerplate — page
// headers, "CHAPTER I" — and would report duplication that is really typography.
const rows = sq("select ext_id || char(31) || replace(replace(preview, char(10), ' '), char(13), ' ') from passage_ext where words > 80;")
  .split('\n').filter((l) => l.includes(SEP));
const byHash = new Map();
for (const line of rows) {
  const [id, ...rest] = line.split(SEP);
  const norm = rest.join(' ').split(/\s+/).join(' ').toLowerCase();
  const h = createHash('md5').update(norm).digest('hex').slice(0, 12);
  if (!byHash.has(h)) byHash.set(h, new Set());
  byHash.get(h).add(id);
}
const shared = [...byHash.entries()]
  .filter(([, s]) => s.size > 1)
  .map(([h, s]) => ({ fingerprint: h, books: [...s] }));

// Language check. The want-list filters IA on language:eng, and IA's metadata is
// wrong sometimes: measured 2026-08-05, six books in the corpus are German or
// Latin — Janus (a German medical-history journal) and Freind's Historia
// medicinae among them — all admitted as English.
//
// Detected by English-dictionary hit rate, which separates cleanly: every
// English book scores above 45%, the six non-English ones score 18-21%. This is
// NOT an OCR-quality measure; long-s books score fine because the dictionary
// still matches most of their words.
//
// Reported, not fatal. A German medical-history journal is a legitimate book
// that the SELECTION let in; deciding whether the Library wants non-English
// material is not a decision this gate should make.
const dictPath = process.env.DICT_PATH || '/usr/share/dict/words';
let language = { checked: false, reason: 'no dictionary at /usr/share/dict/words' };
if (existsSync(dictPath)) {
  const dict = new Set(readFileSync(dictPath, 'utf8').split('\n').map((w) => w.trim().toLowerCase()).filter(Boolean));
  const perBook = new Map();
  for (const line of rows) {
    const [id, ...rest] = line.split(SEP);
    const ws = rest.join(' ').match(/[A-Za-z']{3,}/g) || [];
    if (!perBook.has(id)) perBook.set(id, [0, 0]);
    const e = perBook.get(id);
    e[1] += ws.length;
    for (const w of ws) if (dict.has(w.toLowerCase())) e[0] += 1;
  }
  const suspect = [];
  for (const [id, [hit, total]] of perBook) {
    if (total < 200) continue;
    const rate = hit / total;
    if (rate < 0.45) suspect.push({ ext_id: id, english_word_rate: Number(rate.toFixed(3)) });
  }
  language = { checked: true, books_scored: perBook.size, likely_not_english: suspect.length, suspect };
}

console.log(JSON.stringify({
  books,
  language,
  passages_fingerprinted: rows.length,
  exact_title_duplicates: exactDupes.length,
  exact_title_duplicate_detail: exactDupes,
  passages_shared_across_books: shared.length,
  // A pair sharing MANY passages is a duplicate edition, not quotation.
  // Measured 2026-08-05 at 610 books: 6 pairs share more than 50 passages, and
  // reading them shows why title dedup cannot catch these —
  //
  //   876  "The world of wonders" / "The wonders of the universe"
  //          the same Victorian compilation reissued under a different title,
  //          identical prefaces
  //   319  two editions of Gilbert White's Natural History of Selborne with
  //          different subtitles
  //
  // Reported with the count so the scale is visible. NOT deleted: which edition
  // a library keeps is a curation decision, and both are legitimately public
  // domain.
  duplicate_edition_candidates: (() => {
    const pairs = new Map();
    for (const s of shared) {
      const b = [...s.books].sort();
      for (let i = 0; i < b.length; i += 1) {
        for (let j = i + 1; j < b.length; j += 1) {
          const k = `${b[i]}|${b[j]}`;
          pairs.set(k, (pairs.get(k) || 0) + 1);
        }
      }
    }
    // Say which volume to prefer, and how confident that is. Measured
    // 2026-08-05 across 11 pairs: where one edition shares MOST of its passages
    // with the other, the larger scan is the fuller text and the smaller is a
    // partial or worse-OCR'd copy —
    //
    //   873 shared, 2,792 vs 2,551 passages   the same Victorian compilation
    //   319 shared, 1,746 vs 1,739            two editions of Selborne
    //
    // But a pair can share passages WITHOUT being the same book: 206 shared
    // between a 746-passage journal and a 1,238-passage voyage narrative is one
    // QUOTING the other. The overlap ratio separates them, so it is reported
    // rather than hidden behind a verdict.
    const size = new Map(
      JSON.parse(sq("select json_group_array(json_array(ext_id, passages)) from book_ext;") || '[]'));
    return [...pairs.entries()]
      .filter(([, n]) => n > 50)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => {
        const [x, y] = k.split('|');
        const sx = Number(size.get(x) || 0);
        const sy = Number(size.get(y) || 0);
        const overlap = sx && sy ? n / Math.min(sx, sy) : 0;
        const ratio = sx && sy ? Math.min(sx, sy) / Math.max(sx, sy) : 0;
        return {
          books: [x, y],
          shared_passages: n,
          passages: [sx, sy],
          overlap_of_smaller: Number(overlap.toFixed(2)),
          size_ratio: Number(ratio.toFixed(2)),
          // SIZE RATIO, not overlap. Measured 2026-08-05 across all 11 pairs:
          // overlap does NOT separate them — two scans of the same book share
          // only 0.18-0.34 of their passages, because OCR differences break
          // exact matching. Selborne is unmistakably one book at overlap 0.18.
          //
          // Size ratio does separate them. Every known duplicate sits at
          // 0.91-1.00 (1746/1739, 1151/1143, 1052/1033) and the one pair that
          // is quotation rather than duplication sits at 0.60 (746 vs 1238 —
          // a journal quoted inside a voyage narrative).
          //
          // My first attempt used overlap >= 0.5 and called every known
          // duplicate "quotation". The threshold was a guess; this one is
          // derived from the pairs themselves.
          reading: ratio >= 0.85
            ? `likely the same work; the larger scan (${sx >= sy ? x : y}) is the fuller text`
            : 'shares text but the volumes differ markedly in size — likely quotation, not a duplicate edition',
        };
      });
  })(),
  shared_detail: shared.slice(0, 10),
  note: 'Shared passages are reported, not condemned. Most are quotation between related works. A pair sharing HUNDREDS of passages is a duplicate book, not quotation — measured 2026-08-05, Medical logic and Medical logic [electronic resource] shared 339.',
}, null, 2));

// Only EXACT title duplicates are a failure: those mean the dedup let the same
// book through twice, which is a defect in the ingest rather than a property of
// the corpus.
// Fail on identical CONTENT, not identical strings. Measured 2026-08-05: the
// first exact-title duplicate in 927 books is two years of an annual serial
// whose distinguishing volume text IA truncated away — 2,201 and 2,483
// passages, different opening text, both legitimately held.
//
// A gate that fails on that teaches me to bypass it. Same-title entries whose
// passage counts DIFFER are a metadata artefact; entries whose counts MATCH are
// a real duplicate and still fail.
const contentDupes = exactDupes.filter(([, , sizes]) => {
  const parts = String(sizes || '').split(',');
  return new Set(parts).size === 1;
});
if (process.argv.includes('--strict') && contentDupes.length) process.exit(5);
