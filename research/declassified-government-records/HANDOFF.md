# Handoff

## Delivered

This branch adds an isolated Research department under `research/declassified-government-records/` and an append-only registry thread.

The module contains:

- mission and architecture;
- authority/custody source map;
- 37-system source ledger, 32 official;
- 30 bounded collection programmes;
- module-local 17-field document schema;
- worked CIA STARGATE metadata example;
- catalog and version contract;
- research and FOIA/MDR playbook;
- rights, privacy, ethics, operational-security, and hazardous-technical gates;
- offline verifier.

No government PDF corpus, scraped database, leaked material, credentials, or copied office/archive payload is committed.

## Integration boundaries

- `research/remote-viewing/` retains ownership of the Remote Viewing Research & Practice synthesis. This department can later project STARGATE document records through typed relationships.
- The UNSOLVEABLE Mathematics programme is independent and may cite records without moving its research questions here.
- History and subject modules can consume document IDs, custody, release, and provenance.
- People Graph links require identity resolution and living-person review.
- Generated site, canonical Work/Release/Source Inventory, and Snapshot integration are intentionally deferred.

## Validation

Run:

```bash
python3 research/declassified-government-records/verify_module.py
```

The module verifier checks required files, JSON shape, unique IDs, official/secondary accounting, collection source references, schema/example shape, Markdown links, prohibited payload extensions, common secret patterns, and Python compilation.

Repository-wide `npm run verify` remains the authoritative integration gate and should run in CI or a clean checkout.

## Promotion gates

Before registering a canonical Work and Release:

1. independently review the source ledger and rights/safety model;
2. freeze and reproduce a CIA Reading Room source-snapshot contract;
3. validate stable document/version identities on a substantial stratified sample;
4. complete at least three bounded collection dossiers;
5. demonstrate correction, deletion, link-rot, and source-change procedures;
6. decide where approved content-addressed payloads would live, if anywhere;
7. obtain archivist/historian and skeptical technical review;
8. pass the complete repository verification suite.

## Recommended first pilots

1. `DGR-COLL-001` — CIA Reading Room catalog metadata.
2. `DGR-COLL-003` — STARGATE projection into the remote-viewing module.
3. `DGR-COLL-002` — President’s Daily Brief release/version history.
4. `DGR-COLL-006` — CIA UFO files and NARA UAP Record Group 615.
5. One NARA NDC release-list sample to test custody versus online availability.

## Known limitations

- Source locators and portal behavior were observed on 2026-08-07 and require refresh.
- No portal-wide crawl or payload preservation run was performed.
- Source APIs, exports, rate limits, robots rules, and terms require source-specific review.
- The document schema is module-local and not a repository-wide accepted ontology.
- Rights and safety decisions remain item-specific.
- Full repository verification was not run from the connector-only authoring environment.

## Next owner actions

Review the draft PR, run repository CI, select a first pilot, assign collection/source/provenance/rights/safety reviewers, and only then begin metadata acquisition.
