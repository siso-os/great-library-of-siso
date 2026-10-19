#!/usr/bin/env node
// Make the Internet Archive books searchable, without touching gid semantics.
//
// WHY THIS IS SAFE WHERE A gid INSERT WAS NOT. On 2026-08-04 I refused to add
// these books to the `passage` table because `gid INTEGER` is documented as the
// Gutenberg Text# and 1,184,937 rows join on it. That objection is about a JOIN
// KEY. It does not apply to search: `passage_search` declares
//
//     CREATE VIRTUAL TABLE passage_search USING fts5(gid UNINDEXED, ...)
//
// UNINDEXED means FTS5 stores the column as an opaque passthrough — it is never
// compared, joined or ordered on. A TEXT identifier works exactly as well.
//
// So this builds a SEPARATE index, mirroring the live schema with `ext_id TEXT`
// where `gid INTEGER` sits. Separate file, so a bug here cannot disturb the
// 41.5M-row live index; identical column shape, so the two can be queried the
// same way and merged later if that ever becomes the right call.
//
// PARAGRAPH SEGMENTATION. DjVuTXT is OCR of scanned pages: hard-wrapped lines,
// running headers, page numbers. Splitting on blank lines yields thousands of
// one-line fragments. This joins wrapped lines within a paragraph and drops
// segments that are mostly non-alphabetic — scan artefacts, not prose.
//
//   build-external-passages.mjs           build the index
//   build-external-passages.mjs --check   report what is indexed
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { corpusDb, textDir, booksDb } from './lib/vault-paths.mjs';
import { isNotABook } from './lib/selection-rules.mjs';
import { join, basename } from 'node:path';

const TEXT = textDir();
const OUT = corpusDb();
// BOOKS_DB, so this can be pointed at a fixture. Measured 2026-08-06: the
// catalogue path was hardcoded here while seven other builders had already been
// moved to lib/vault-paths.mjs for exactly this reason — and it bit immediately.
// A fixture test of the new correspondence skip reported "0 skipped" because the
// fixture had no book_external rows to supply titles, and the builder read the
// real catalogue instead of the one under test.
const BOOKS = booksDb();
const check = process.argv.includes('--check');

// BUSY TIMEOUT. Measured 2026-08-06: no script in this pipeline waited for a
// lock, so any concurrent reader could end a long build with "database is
// locked (5)" — it killed a 45-minute modern-index build after 1.39M of 4.13M
// rows. Writers wait; the corpus stays readable while it rebuilds.
const sq = (db, sql) => execFileSync('sqlite3', ['-cmd', '.timeout 60000', db, sql], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 }).trim();

if (check) {
  if (!existsSync(OUT)) { console.error(`no index yet: ${OUT}`); process.exit(70); }
  console.log(sq(`file:${OUT}?mode=ro`, `select 'books', count(distinct ext_id) from passage_ext
    union all select 'passages', count(*) from passage_ext
    union all select 'words', sum(words) from passage_ext;`));
  process.exit(0);
}

if (!existsSync(TEXT)) { console.error(`text corpus missing (volume mounted?): ${TEXT}`); process.exit(70); }

// Titles come from the catalogue, so the index and the catalogue cannot drift.
const titles = new Map(sq(`file:${BOOKS}?mode=ro`, "select ext_id || char(31) || title from book_external;")
  .split('\n').filter(Boolean).map((l) => l.split('')));

// A paragraph is a run of non-blank lines. Wrapped OCR lines are rejoined.
// Segments that are mostly non-alphabetic are scan noise: page numbers, plate
// captions, the gutter garbage that opens most DjVuTXT files.
function paragraphs(text) {
  // MULTI-COLUMN OCR. Measured 2026-08-04: retention was bimodal — ~88% on
  // single-column scans, under 2% on others. The failures are multi-column
  // pages: ~35-char lines, a blank line at every column gutter, and words
  // hyphenated across line breaks ("admir- \nable"). Splitting on a single
  // blank line shredded those into sub-120-char fragments that the length
  // filter then discarded. On b21471824 the fix moved 3,679 -> 283,492 words.
  //
  // So: rejoin hyphenated breaks, and treat only a run of blank lines as a
  // real paragraph boundary.
  const joined = text
    .replace(/(\w)-\s*\n\s*(\w)/g, '$1$2')
    .replace(/[ \t]*\n[ \t]*\n[ \t]*\n+/g, '\n\n');
  // Split on blank-line RUNS, not on every blank line. The line-accumulating
  // version above produced 8,787 fragments on b21471824 where this produces
  // large blocks — and when I tested the hyphen fix in Python I used this form,
  // measured 77x, then applied the OTHER form to the script and reported the
  // improvement. The two segmenters were never the same algorithm.
  const out = [];
  let offset = 0;
  for (const block of joined.split(/\n[ \t]*\n/)) {
    const text = block.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
    const start = offset;
    offset += block.length + 2;
    if (text) out.push({ start, end: offset, text });
  }
  // Mark headings BEFORE filtering. Measured 2026-08-04: 0 of 122,553 passages
  // carried a heading, because isHeading only ever ran on blocks that survived
  // the >=120-char filter — and a heading is short BY DEFINITION. The two steps
  // were in the wrong order, so the heading test could never see a heading.
  // On one book, 39 blocks match isHeading and all 39 were discarded first.
  let pending = null;
  for (const p of out) {
    if (isHeading(p.text)) { pending = p.text; p.drop = true; }
    else if (pending) { p.heading = pending; pending = null; }
  }
  return out.filter((p) => {
    if (p.drop) return false;                                    // a heading, already attached below
    if (p.text.length < 120) return false;                       // headers, page numbers
    // Ratio over NON-SPACE characters. Measured 2026-08-04: this filter was
    // rejecting 3,208 of 3,334 long blocks in b21471824 — good prose whose only
    // sin is that the OCR puts DOUBLE SPACES between every word, dragging
    // letters/total to 0.65-0.68 against a 0.7 threshold. Whitespace is not
    // evidence of scan noise; counting it as such discarded 96% of a book.
    const dense = p.text.replace(/\s+/g, '');
    const letters = (dense.match(/[A-Za-z]/g) || []).length;
    return letters / Math.max(dense.length, 1) >= 0.7;
  });
}

// A heading is a short ALL-CAPS or Title Case line — chapter markers. Best
// effort only; the live index has the same caveat.
function isHeading(s) {
  // Salutations are not headings. Measured 2026-08-04: "SIR," and "SIR ," alone
  // were labelling 2,996 passages — these books are full of published letters,
  // and an all-caps salutation passes every structural test. Excluded by name
  // rather than by length: "Book  V." is 8 characters and IS a heading, so a
  // blunt length rule would discard real structure to remove noise.
  const c = s.replace(/\s+/g, ' ').trim();
  if (/^(sir|madam|my lord|gentlemen|dear sir)\s*[,.]?$/i.test(c)) return false;
  // Bare enumerators and stray months are not headings. Measured 2026-08-05
  // across 179 books: "II" labelled 496 passages, "IV" 412, "July" 408, plus
  // OCR fragments like "BEE" and "CHE" — 7.7% of heading coverage.
  //
  // Classified BY SHAPE, not length. My earlier length rule counted "PREFACE"
  // (663 passages) and "Book  V." (536) as noise, which overstated the problem
  // at 15-19.6% and would have discarded real structure to remove it. A bare
  // roman numeral carries no information; "Book V." carries the book number.
  if (/^[IVXLC]+\.?$/.test(c)) return false;
  if (/^(january|february|march|april|may|june|july|august|september|october|november|december)\.?$/i.test(c)) return false;
  if (c.replace(/[^A-Za-z]/g, '').length < 4) return false;
  return s.length < 80 && /^[A-Z][A-Za-z .,'-]*$/.test(s) && /[A-Z]{2,}|^(chapter|book|part|letter)\b/i.test(s);
}

const files = readdirSync(TEXT).filter((f) => f.endsWith('.txt')).sort();
console.error(`indexing ${files.length} books`);

execFileSync('rm', ['-f', OUT]);
sq(OUT, `
CREATE TABLE passage_ext (
  ext_id  TEXT NOT NULL,        -- source-native id; NOT a gid, deliberately
  seq     INTEGER NOT NULL,
  start   INTEGER NOT NULL,     -- byte offset into the raw text file
  end     INTEGER NOT NULL,
  chars   INTEGER NOT NULL,
  words   INTEGER NOT NULL,
  heading TEXT,
  preview TEXT,
  PRIMARY KEY (ext_id, seq)
);
CREATE TABLE book_ext (ext_id TEXT PRIMARY KEY, title TEXT, passages INTEGER, chars INTEGER, built_at TEXT);
CREATE VIRTUAL TABLE passage_ext_search USING fts5(
  ext_id UNINDEXED, seq UNINDEXED, heading, body,
  tokenize = 'unicode61 remove_diacritics 2'
);`);

const esc = (s) => `'${String(s).replace(/'/g, "''")}'`;
const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
let totalP = 0;
let totalH = 0;
const skippedIds = [];
let totalW = 0;

// ARCHIVAL CORRESPONDENCE, SKIPPED AT INDEX TIME TOO. build-want-list gained a
// filter for this on 2026-08-06, but that only stops FUTURE fetches: this builder
// reads the text DIRECTORY, so the 13 manuscript letters already on the vault
// would enter the index on the next rebuild regardless.
//
// They are OCR of handwriting — "Pivincelsne aerate", "Dhiledilthi" for
// Philadelphia — and they pass every existing guard, including the 0.45
// English-dictionary check, at 0.541 and 0.547, because printed letterhead
// carries them past it.
//
// The files stay on the vault; nothing is deleted. They are simply not indexed,
// and the count is recorded so the skip is visible rather than silent.
const correspondenceIds = [];

for (const f of files) {
  const id = basename(f, '.txt');
  const knownTitle = titles.get(id) || '';
  if (isNotABook(knownTitle)) {
    console.error(`  ${id}: ARCHIVAL CORRESPONDENCE — skipped (${knownTitle.slice(0, 48)})`);
    correspondenceIds.push(id);
    continue;
  }
  const raw = readFileSync(join(TEXT, f), 'utf8');
  const ps = paragraphs(raw);
  if (!ps.length) {
    console.error(`  ${id}: NO PARAGRAPHS — skipped`);
    skippedIds.push(id);
    continue;
  }

  let heading = null;
  const rows = [];
  const fts = [];
  ps.forEach((p, i) => {
    if (p.heading) heading = p.heading;   // attached during segmentation, before filtering
    const words = (p.text.match(/[A-Za-z']+/g) || []).length;
    rows.push(`(${esc(id)},${i},${p.start},${p.end},${p.text.length},${words},${heading ? esc(heading) : 'null'},${esc(p.text.slice(0, 160))})`);
    fts.push(`(${esc(id)},${i},${heading ? esc(heading) : 'null'},${esc(p.text)})`);
    totalW += words;
    if (heading) totalH += 1;
  });

  // Chunked inserts: one statement per book overflows the argv limit on the
  // larger volumes (the biggest text here is 3.5 MB).
  for (let i = 0; i < rows.length; i += 400) {
    sq(OUT, `insert into passage_ext values ${rows.slice(i, i + 400).join(',')};`);
    sq(OUT, `insert into passage_ext_search values ${fts.slice(i, i + 400).join(',')};`);
  }
  sq(OUT, `insert into book_ext values (${esc(id)},${esc(titles.get(id) || id)},${ps.length},${raw.length},${esc(now)});`);
  totalP += ps.length;
  console.error(`  ${id}: ${ps.length} passages`);
}

// Persist the aggregates. Measured 2026-08-05 over USB at 981,260 passages:
//   count(*)                          39,755ms
//   count(*) where heading not null  197,863ms
//   sum(words)                       195,793ms
//   max(rowid)                            19ms
// Three whole-table scans, ~430s, recomputed by every consumer on every run.
// This builder already holds all three numbers.
sq(OUT, `create table if not exists corpus_stats (k text primary key, v integer);
insert or replace into corpus_stats values
  ('skipped_no_paragraphs', ${skippedIds.length}),
  -- Correspondence skips are counted SEPARATELY from OCR-noise skips: they are
  -- different reasons and rebuild-corpus reconciles the catalogue against the
  -- index using these numbers. Folding them together would make one skip look
  -- like the other and hide which rule fired.
  ('skipped_correspondence', ${correspondenceIds.length}),
  -- files.length would count the correspondence files that were never indexed,
  -- so the catalogue/index reconciliation would report a mismatch that is not one.
  ('books', ${files.length - correspondenceIds.length}), ('passages', ${totalP}), ('words', ${totalW}),
  ('with_headings', ${totalH});`);
// files.length counts what was READ, not what was INDEXED. rebuild-corpus
// greps this line, and reporting 5 when 2 were indexed is the kind of number
// that reads as a corpus size in a worklog a week later.
console.error(`\n${totalP} passages, ${totalW.toLocaleString()} words, from ${files.length - correspondenceIds.length - skippedIds.length} books`
  + (correspondenceIds.length ? ` (${correspondenceIds.length} correspondence skipped)` : '')
  + (skippedIds.length ? ` (${skippedIds.length} no-paragraph skipped)` : ''));
console.error(`index: ${OUT} (${(statSync(OUT).size / 1048576).toFixed(1)} MB)`);
