# Catalog Contract

## Purpose

The catalog describes one historical government record without confusing the record, a public release, a scan, OCR, or an interpretation. The module-local JSON Schema is [`document-record.schema.json`](document-record.schema.json); [`example-document-record.json`](example-document-record.json) shows a CIA STARGATE metadata record without copying the external PDF.

## Identity layers

A document record separates:

1. **Historical document identity** — the memorandum, report, cable, hearing, image, dataset, or other record as created.
2. **Document family** — attachments, enclosures, related memoranda, and later versions.
3. **Public release version** — one declassification, FOIA, MDR, statutory, archival, or discretionary release state.
4. **Digital object** — a particular metadata page, scan, PDF, image set, transcript, OCR derivative, or finding aid.
5. **Observation** — what the Library saw at one locator on one date.

One URL is not necessarily one document, and one document may have several URLs and release versions.

## Required top-level sections

The draft contract requires 17 top-level fields:

- `schema_version`, `record_type`, `id`, `title`, `record_kind`;
- `identity`, `origin`, `custody`, `dates`, `release`;
- `digital_objects`, `description`, `relationships`, `provenance`;
- `rights`, `safety_review`, `research_state`.

IDs use the module-local prefixes `DGR-DOC-`, `DGR-OBJ-`, `DGR-SRC-`, and `DGR-COLL-`.

## Origin and custody

`origin` records who created and received the record. `custody` records who currently holds or officially publishes the observed copy, plus record group, series, collection, box, folder, item, and other archival coordinates.

Origin and custody must not be collapsed. A CIA-hosted copy can originate with the Army; a NARA item can originate with an agency that no longer holds it; a nonprofit copy can aid discovery while having no legal custody.

## Dates

Keep these dates separate:

- historical document date;
- publication date;
- classification date;
- declassification date;
- public release date;
- repository ingest or migration date;
- Library retrieval date.

Every date carries precision and basis. A portal “creation date” must not be silently presented as the date the historical document was written.

## Release state

Preserve the source’s raw release decision and markings before normalization. Normalized statuses distinguish formal declassification, partial declassification, FOIA release, MDR release, systematic or automatic review, statutory release, archival opening, official publication, withdrawal, and unknown state.

`public_online` is an access state, not proof of full declassification, completeness, rights clearance, or safety.

## Digital objects and hashes

Each digital object records role, locator, availability, authority, file name, media type, size, checksum, observation time, and hash scope.

When a payload is lawfully approved for capture, hash the exact downloaded bytes with SHA-256. Hashes reported by a source and hashes calculated by the Library are different evidence. OCR, thumbnails, and transcripts are derivatives and receive their own object records.

This repository remains metadata-and-link first. Bulk payloads, if ever approved, belong in a governed content-addressed data plane.

## Provenance receipts

A source receipt records:

- source ID and exact locator;
- observation time;
- evidence kind;
- content hash where available;
- processing notes.

Processing history records every transformation, parser, human review, correction, and result. Previous observations are retained when a portal changes.

## Relationships

Supported edges include:

- `part_of`, `attachment_of`, `version_of`, `supersedes`, `corrects`, `duplicates`;
- `references`, `responds_to`, `released_with`, `transferred_to`;
- `contextualized_by`, `related_to`.

Every relationship includes evidence and confidence. Names and organizations remain literal unresolved mentions until identity resolution is complete.

## Claims discipline

A document record proves that a public record with particular content and provenance was observed. It does not automatically prove every assertion inside that record.

Research outputs distinguish:

- literal record content;
- an author or source allegation;
- an official analytic judgment;
- corroborated historical fact;
- contested interpretation;
- unknown or unavailable evidence.

OCR is used for discovery only until checked against the scan or a verified transcription.

## Rights and safety

`rights` records item-level status, basis, embedded-material review, and reuse decision. `safety_review` covers privacy, reputational harm, graphic/traumatic material, operational security, and hazardous technical content.

The default publication decision is `metadata_and_link`. Public access is not a universal reuse license, and declassification is not a safety review.

## Version-change procedure

When a locator or file changes:

1. add a new observation rather than overwriting the old one;
2. compare identifiers, page count, markings, file size, and bytes;
3. create a new object or release version when substantive;
4. classify redirects, corrections, reprocessing, withdrawal, or migration;
5. preserve the official explanation where one exists;
6. do not republish a withdrawn payload merely because a mirror still has it.

## Minimum evidence for publication

A public catalog record needs an authoritative or clearly labeled secondary source, stable local ID, external identifier where available, custody statement, distinct dates, release state, exact locator, source receipt, rights decision, safety decision, and open questions.

Unknown values remain explicit. The contract rewards traceability, not false completeness.
