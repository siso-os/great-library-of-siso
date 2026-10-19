// One place that knows where the vault is — and lets a test point elsewhere.
//
// WHY THIS EXISTS. Measured 2026-08-05: eight scripts hardcoded the vault path
// and exactly one could be redirected. That is not a stylistic problem. Three
// separate times this session a probe pointed a copy at a script, the script
// ignored it and read the real database, and the test reported PASS having
// measured nothing:
//
//   - corpus-integrity: a duplicate-detection probe that tested the query,
//     not the script
//   - build-library-page: a "does it fail without passage_modern" probe that
//     returned exit 0 because it had checked the real, healthy database
//   - rebuild-selftest: 4 of 7 cases passed with the pipeline deleted
//
// A script that cannot be pointed at a fixture cannot be tested. The defect is
// the hardcoding, not the three probes.
//
// PRECEDENT. lib/snapshot-paths.mjs was written after four snapshot mis-keys and
// that class stopped recurring; lib/claim-paths.mjs after five claim mis-keys.
// Same mechanism, third application.
//
// USE
//   import { vaultRoot, corpusDb, ingestDir, booksDb } from './lib/vault-paths.mjs';
//
// TEST
//   VAULT_ROOT=/tmp/fixture node scripts/whatever.mjs
//   CORPUS_DB=/tmp/copy.db  node scripts/whatever.mjs   (overrides just the index)

import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

function configured(name) {
  const value = process.env[name]?.trim();
  return value ? resolve(value) : null;
}

// VAULT_ROOT redirects everything below it; the narrower vars override one path
// each. Narrow beats broad, so a test can move the corpus index without moving
// the ingest directory.
export function vaultRoot() {
  const root = configured('VAULT_ROOT');
  if (!root) throw new Error('set VAULT_ROOT to an external vault or CORPUS_DB to an existing index; no bundled corpus is provided');
  return root;
}

export function ingestDir() {
  return configured('INGEST_DIR') || `${vaultRoot()}/ia-ingest`;
}

export function corpusDb() {
  return configured('CORPUS_DB') || `${ingestDir()}/external-passages.sqlite`;
}

export function textDir() {
  return configured('TEXT_DIR') || `${ingestDir()}/text`;
}

// The catalogue is NOT on the vault — it is the Library's own database on the
// internal disk. Included here because the same tests need to redirect it, and
// having two modules for "where things are" is how they drift apart.
export function booksDb() {
  const db = configured('BOOKS_DB');
  if (!db) throw new Error('set BOOKS_DB to the external catalogue; no bundled catalogue is provided');
  return db;
}

// A read-only URI. immutable=1 for archives specifically: they are snapshots
// nothing writes to, and a WAL-header copy cannot open read-only without
// creating a -shm sidecar beside it. NOT applied to live databases, where it
// would let a reader see a stale page and agree with a number that has moved.
export function readOnlyUri(path, { archived = false } = {}) {
  return archived ? `${pathToFileURL(resolve(path)).href}?mode=ro&immutable=1` : `${pathToFileURL(resolve(path)).href}?mode=ro`;
}
