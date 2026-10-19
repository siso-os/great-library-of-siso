# Declassified Government Records Department

> **Status:** authored Research department; not yet a registered Great Library Work, Release, Source Inventory, or Snapshot selection.  
> **Observed:** 2026-08-07.  
> **Purpose:** make historically significant declassified and public government records discoverable, sourceable, version-aware, and safe to research—starting with the CIA Reading Room and expanding across official archives.

## What this is

This department is the Great Library's dedicated home for **declassified government records and public government documents of historical interest**.

The motivating curiosity is simple: *what interesting things have governments actually put into the public record?* The implementation is deliberately rigorous. This is not a dump of mysterious PDFs, a leak board, or a collection of sensational screenshots. It is a research system for answering:

- what the record is;
- who created it;
- who holds the authoritative copy now;
- how and when it became public;
- whether another release version exists;
- what the record directly establishes;
- what remains redacted, disputed, missing, or unknown;
- whether the Library may safely and lawfully republish more than metadata and a link.

The long-term objective includes a reproducible catalog of **all discoverable public CIA Reading Room records**. “All” is defined by a pinned source snapshot and collection contract, not by an impossible claim that no undiscovered, onsite-only, removed, unprocessed, or future release exists.

## Why this is its own department

Government records touch almost every Library field—History, Politics, War, Science, Technology, Biography, Law, and Research—but they also have a distinct technical and evidentiary life cycle:

```text
creation
  → classification or ordinary recordkeeping
  → transfer / custody change
  → review
  → declassification, redaction, FOIA, MDR, statutory release, or publication
  → public locator
  → later correction, reprocessing, withdrawal, replacement, or migration
```

A History article may cite one document. This department preserves the **document identity, custody, release mechanism, version graph, and source receipt** that make the citation auditable.

It therefore belongs in **Research** as an evidence infrastructure department. History and subject modules should project and interpret its records through typed relationships rather than each building an incompatible private archive.

## Start here

| Goal | Read or inspect |
|---|---|
| Understand the mission, boundaries, and architecture | [`department-charter.md`](department-charter.md) |
| Understand authoritative sources and custody layers | [`source-map.md`](source-map.md) |
| See the machine-readable source-system ledger | [`source-index.json`](source-index.json) |
| Understand one document record and its version model | [`catalog-contract.md`](catalog-contract.md) |
| Inspect the module-local JSON Schema | [`document-record.schema.json`](document-record.schema.json) |
| Inspect a worked CIA metadata example | [`example-document-record.json`](example-document-record.json) |
| See the seed research collections | [`collections-roadmap.md`](collections-roadmap.md) and [`collections.json`](collections.json) |
| Run a document investigation or FOIA/MDR research lane | [`research-playbook.md`](research-playbook.md) |
| Apply rights, privacy, safety, and ethics gates | [`rights-safety-and-ethics.md`](rights-safety-and-ethics.md) |
| Review merge and promotion boundaries | [`HANDOFF.md`](HANDOFF.md) |
| Verify the whole authored module | `python3 research/declassified-government-records/verify_module.py` |

## The first-principles rule

A public document is not automatically:

- declassified;
- complete;
- authentic in every hosted copy;
- the latest release version;
- accurate in every assertion;
- safe to amplify;
- free of privacy or reputational harm;
- free of copyright or donor restrictions;
- proof of the interpretation someone places on it.

The department records these states separately.

For example, a CIA Reading Room page can expose a collection label, document number, release decision, original classification, page count, dates, OCR text, and an attachment. Those fields are valuable, but they still require interpretation. A repository “creation date” can reflect ingestion rather than the historical memorandum date. A release code should be preserved raw before it is normalized. OCR is a discovery aid, not the authoritative text. A 95-page attachment can contain several records, enclosures, blank pages, duplicates, or markings that conflict with the page metadata.

## Source authority order

The default evidence ladder is:

1. **Authoritative official record or legal custodian.** The originating agency, NARA, a presidential library, an official government publisher, or another body with documented custody.
2. **Official context or oversight source.** FRUS, GAO, CRS, GovInfo, congressional publications, declassification policy bodies, and official histories.
3. **Secondary research archive.** A curated university, nonprofit, newsroom, or scholarly collection that helps discover, contextualize, compare, or preserve records.
4. **Secondary preservation copy.** A mirror, web archive, or publisher-hosted copy used to recover link history or compare bytes.
5. **Unverified copy.** Useful only as a lead until matched to an authoritative identifier or release receipt.

A secondary copy may be more searchable or better preserved than an agency page. That does not make it the legal custodian. The catalog should retain both roles.

## What counts as “released”

The catalog does not collapse release states. A record may be:

- formally declassified in full;
- declassified in part;
- released under FOIA with redactions;
- released after Mandatory Declassification Review;
- released through systematic or automatic declassification review;
- opened as an archival record;
- published officially without ever being classified;
- transferred under a special statute;
- available only onsite or by request;
- described online while the payload remains restricted;
- withdrawn, corrected, replaced, or superseded;
- available from a non-official copy with unresolved custody.

Every record preserves the raw agency language and a conservative normalized status.

## Catalog, not warehouse

The Great Library repository remains a **catalog and reading surface**, not a bulk payload warehouse.

This module commits:

- source-system metadata;
- original synthesis;
- machine-readable collection plans;
- a document-record contract;
- exact public locators;
- source receipts and future checksum fields;
- research, rights, and safety rules.

It does **not** commit:

- copied CIA or agency PDF corpora;
- scraped databases;
- leaked classified material;
- personal dossiers;
- graphic victim media;
- hazardous technical archives;
- credentials, request accounts, or private correspondence.

A future governed data plane may hold rights-cleared public copies, OCR derivatives, or preservation objects. Those objects must remain content-addressed, auditable, deletable when legally required, and separate from the Library's canonical registry.

## Initial collection programme

The machine-readable roadmap currently defines 30 seed collections. The first wave prioritizes:

- CIA Reading Room catalog reconstruction;
- President's Daily Briefs;
- STARGATE and related remote-viewing programme records;
- MKULTRA and related behavioral-research records;
- the CIA “Family Jewels” and intelligence-oversight record;
- CIA UFO files and NARA's rolling UAP collection;
- assassination-record releases;
- covert-action and foreign-policy documentary sets;
- COINTELPRO and civil-liberties oversight;
- war-crimes records;
- human-radiation and nuclear-history records;
- 9/11 records;
- Iraq WMD intelligence reviews;
- classification, declassification, redaction, and access policy.

The roadmap is a set of research commitments, not a claim that these subjects are already completely collected or adjudicated.

## Relationship to existing Great Library work

### Remote Viewing Research & Practice

The separate `research/remote-viewing/` module owns the historical, methodological, experimental, and practice synthesis for remote viewing. This department should later provide a **document collection projection** for STARGATE records and stable source identities.

It must not duplicate or overwrite the remote-viewing module's stable identity, claims ledger, practice protocol, or experimental tools.

### UNSOLVEABLE Mathematics

The UNSOLVEABLE Mathematics programme is a separate frontier-research department. It may eventually cite government reports, prize documents, technical memoranda, or archival records, but this department does not own its research questions.

### History

History modules should use this department as a source spine. A historical narrative can select, explain, and contest records; the document department preserves where each record came from and how its public state changed.

### People Graph

Named persons should be linked only after identity resolution and privacy review. A name appearing in an intelligence or law-enforcement file is not proof that the person committed wrongdoing, worked for an agency, or endorsed the record's contents.

## Minimum viable document record

A defensible record needs, at minimum:

1. a local stable ID;
2. the exact official title as observed;
3. one or more external identifiers;
4. the originating body;
5. the current custodian or official copy holder;
6. collection, record-group, series, and archival coordinates where known;
7. distinct historical, release, ingest, and retrieval dates;
8. raw classification and release markings;
9. a normalized but conservative access/release state;
10. exact metadata and payload locators;
11. byte size and SHA-256 when a payload is lawfully captured;
12. OCR/transcription status and quality;
13. version and relationship edges;
14. source receipts;
15. rights and embedded-material status;
16. privacy, reputational, graphic, operational-security, and hazardous-technical review;
17. open questions and confidence.

The module-local draft is in [`document-record.schema.json`](document-record.schema.json).

## Core operating rules

1. **Custody before content.** Establish the authoritative source and collection context before extracting claims.
2. **Raw before normalized.** Preserve original identifiers, markings, redaction codes, and release decisions.
3. **One public copy is not one document.** Model attachments, enclosures, scans, OCR, transcripts, and release versions separately.
4. **Hash exact bytes.** A URL is not a preservation receipt. When a payload is approved for capture, record its exact bytes and SHA-256.
5. **Never erase uncertainty.** Unknown dates, custody, rights, and release mechanisms stay unknown until evidenced.
6. **OCR is not testimony.** Quote the scan or verified transcription, not unreviewed OCR.
7. **Files contain claims, not automatic truth.** Distinguish what a record says from what the historical evidence establishes.
8. **Preserve contradictory and null records.** A research collection must not be a highlight reel.
9. **Released does not mean harmless.** Run privacy, reputational, graphic, operational-security, and hazardous-technical checks.
10. **Link by default.** Republish payloads only after item-level rights and safety approval.
11. **No leak laundering.** A non-official copy is not “declassified” because it is online.
12. **Date every observation.** Portals, files, redactions, and access states change.

## A note on curiosity

This department is explicitly curiosity-driven. Curiosity is a feature, not a waiver of method.

The entertaining questions—strange programmes, secret histories, disputed events, declassified technology, internal investigations—become more interesting when the Library can show the exact document, the exact public source, the release history, what the page really says, and where interpretation begins.

## Verification

Run:

```bash
python3 research/declassified-government-records/verify_module.py
```

The offline verifier checks:

- required files and UTF-8 text;
- JSON parsing;
- unique and valid source, collection, document, and object IDs;
- minimum official-source coverage;
- source authority separation;
- collection-to-source references;
- document-schema shape;
- the worked example;
- source references in the human source map;
- relative Markdown links;
- absence of copied PDF, archive, database, and office-document payloads;
- common secret and machine-path patterns;
- Python compilation.

The repository-wide `npm run verify` remains authoritative for registry schemas, immutable history, generated pages, publication rules, and integration checks.

## Promotion gates

This authored department should become a formal Great Library Work only after:

- active registry and generated-site lanes close;
- the source-system ledger receives independent review;
- the CIA Reading Room identity and source-snapshot contract is demonstrated on a substantial sample;
- collection and document schemas stabilize;
- rights and safety reviewers approve the publication model;
- a payload data plane, if any, has deletion, provenance, checksum, and access controls;
- at least three collections produce reproducible research dossiers;
- one historian or archivist and one skeptical technical reviewer can reproduce the workflow;
- the complete repository verification suite passes from a clean checkout.

Until then, this branch is a serious department blueprint and executable metadata contract—not a claim that the Great Library already contains every declassified file.
