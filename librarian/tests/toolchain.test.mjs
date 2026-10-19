import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { readClaims, groundedMetrics, checkability } from '../scripts/lib/claim-paths.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const clean = { ...process.env };
for (const key of ['VAULT_ROOT', 'CORPUS_DB', 'BOOKS_DB', 'INGEST_DIR', 'TEXT_DIR', 'DICT_PATH']) delete clean[key];
function cli(script, args = [], env = clean) {
  return spawnSync(process.execPath, [join(root, 'scripts', script), ...args], { env, encoding: 'utf8' });
}
function ok(result) { assert.equal(result.status, 0, result.stderr); return result.stdout; }
function sql(db, statement) {
  const result = spawnSync('sqlite3', [db], { input: statement, encoding: 'utf8' });
  return ok(result);
}

test('search requires external configuration and never creates an absent database', () => {
  const r = cli('search-library.mjs', ['needle']);
  assert.equal(r.status, 70); assert.match(r.stderr, /set VAULT_ROOT/); assert.doesNotMatch(r.stderr, /at file:/);
  const dir = mkdtempSync(join(tmpdir(), 'librarian-missing-'));
  try {
    const db = join(dir, 'absent.sqlite');
    const r = cli('search-library.mjs', ['needle'], { ...clean, CORPUS_DB: db });
    assert.equal(r.status, 70); assert.match(r.stderr, /index not available/);
    assert.throws(() => readFileSync(db));
  } finally { rmSync(dir, { recursive: true }); }
});

test('real build, printed/modern search, read-only integrity and duplicate rejection', () => {
  const dir = mkdtempSync(join(tmpdir(), 'librarian-fixture-'));
  try {
    const ingest = join(dir, 'ia-ingest'); const text = join(ingest, 'text'); mkdirSync(text, { recursive: true });
    const catalog = join(dir, 'catalog.sqlite'); const db = join(ingest, 'external-passages.sqlite');
    const dict = join(dir, 'words'); writeFileSync(dict, 'such\nfirst\nhimself\nfrom\nfull\nfour\n');
    sql(catalog, "create table book_external(ext_id text, title text); insert into book_external values ('fixture','Synthetic Search Manual');");
    const printed = 'A telescope reveals distant stars and helps a careful observer record clear details in a notebook. This synthetic paragraph tests ordinary printed search and headings without using any published book. ';
    const archaic = 'fuch firft observations help himfelf learn from four full notebooks. This synthetic paragraph uses invented sentences to exercise spelling variants while preserving the original characters in the printed index. ';
    writeFileSync(join(text, 'fixture.txt'), `CHAPTER ONE\n\n${printed}\n\n${archaic}`);
    const env = { ...clean, VAULT_ROOT: dir, BOOKS_DB: catalog, DICT_PATH: dict };
    ok(cli('build-external-passages.mjs', [], env));
    assert.match(ok(cli('search-library.mjs', ['telescope'], env)), /fixture:0.*printed/);
    const stats = cli('search-library.mjs', ['--stats'], env);
    assert.match(ok(stats), /passages\|2/); assert.match(stats.stderr, /passage_modern absent/);
    assert.equal(cli('search-library.mjs', ['such', '--modern'], env).status, 70);
    assert.equal(cli('search-library.mjs', ['telescope', '--limit', 'NaN'], env).status, 64);
    ok(cli('add-longs-variants.mjs', [], env));
    assert.match(sql(db, 'select body_modern from passage_modern;'), /such first/);
    const modern = ok(cli('search-library.mjs', ['such'], env)); assert.match(modern, /fixture:1.*modernised/);
    assert.match(ok(cli('search-library.mjs', ['such', '--original'], env)), /no matches/);
    assert.match(ok(cli('search-library.mjs', ['such', '--modern', '--limit', '1'], env)), /showing 1/);
    assert.match(ok(cli('search-library.mjs', ['telescope', '--limit', '1'], env)), /1 passage\(s\)/);
    const before = readFileSync(db);
    assert.equal(JSON.parse(ok(cli('corpus-integrity.mjs', ['--strict'], env))).exact_title_duplicates, 0);
    assert.deepEqual(readFileSync(db), before);
    assert.match(sql(db, "select body from passage_ext_search where seq=1;"), /fuch firft/);
    sql(db, "insert into book_ext values ('duplicate','Synthetic Search Manual',2,1,'2026-10-18T00:00:00Z');");
    assert.equal(cli('corpus-integrity.mjs', ['--strict'], env).status, 5);
    assert.equal(cli('search-library.mjs', ['"unclosed'], env).status, 65);
    // A narrower explicit index wins over a deliberately unavailable vault.
    assert.match(ok(cli('search-library.mjs', ['telescope'], { ...env, VAULT_ROOT: join(dir, 'missing'), CORPUS_DB: db })), /telescope/);
  } finally { rmSync(dir, { recursive: true }); }
});

test('claim helpers retain malformed claims and use grounding.source.id', () => {
  const dir = mkdtempSync(join(tmpdir(), 'librarian-claims-'));
  try {
    mkdirSync(join(dir, 'claims')); mkdirSync(join(dir, 'metrics'));
    writeFileSync(join(dir, 'claims', 'synthetic.claim.json'), JSON.stringify({ grounding: [{ source: { id: 'metrics/fixture.json' } }] }));
    writeFileSync(join(dir, 'claims', 'malformed.claim.json'), '{');
    writeFileSync(join(dir, 'metrics', 'fixture.json'), '{"derivations":{"count":{}}}');
    assert.equal(readClaims(dir).length, 2); assert.ok(readClaims(dir).some(c => c.error));
    assert.equal(groundedMetrics(dir).size, 1); assert.equal(checkability('metrics/fixture.json', dir).checkable, true);
  } finally { rmSync(dir, { recursive: true }); }
});
