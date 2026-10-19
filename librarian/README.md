# Selected Librarian toolchain

This is SISO-authored MIT tooling from the exact source pin in `IMPORT-RECEIPT.json`.
It is distinct from the Great Library registry. This import closes the offline
passage build → modern spelling index → search → integrity dependency chain,
plus the independent claim-packet reader. It does not import the standing agent,
observatory, claims, audit evidence, mailbox, ingestion services or corpus.

Requires Node.js 20+ and the existing `sqlite3` CLI with FTS5/JSON support; no npm
install or new dependency is needed. Run `sh check.sh` for synthetic offline checks.

Search requires `CORPUS_DB=/external/path/index.sqlite`, or `VAULT_ROOT=/external/vault`
(which resolves `ia-ingest/external-passages.sqlite`). The database must already
exist. There is no machine-specific default, bundled data or fallback corpus.
Relative overrides resolve against the current working directory. Narrow overrides
win: `CORPUS_DB`, `INGEST_DIR`, `TEXT_DIR`; builders also require `BOOKS_DB`.

The entrypoints are `node scripts/build-external-passages.mjs`,
`node scripts/add-longs-variants.mjs`, `node scripts/search-library.mjs "query"`
and `node scripts/corpus-integrity.mjs --strict`. Build scripts write their explicit
external output; search and integrity read it. This migration exercised only temp
fixtures and did not execute those tools against an actual corpus.

`DICT_PATH` redirects the spelling dictionary; otherwise the existing OS
`/usr/share/dict/words` is used. Modern-index construction refuses a missing
dictionary. Spelling conversion remains a conservative dictionary heuristic,
including the inherited limitation for words containing only uppercase `F`.
Search warns when the modern index is absent; `--modern` then exits 70.
Invalid limits exit 64, malformed FTS expressions exit 65, and unavailable indexes
exit 70. The integrity script retains the upstream explicit `skipped: true` output
and exit 0 for absent/locked indexes: that output is **not a passed integrity check**.

`IMPORT-RECEIPT.json` contains the exact allowlist, source blobs, source and target
SHA-256s, adaptation patches, dependency closure and every excluded source path.
`verify_imports.py` verifies both toolchain receipts offline, reconstructing original
bytes from adaptation hunks and checking Git blob IDs and SHA-256s. The sibling
Book Library also has its own synthetic test entrypoint. No source repo was changed.
