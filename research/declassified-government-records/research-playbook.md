# Research Playbook

## Goal

Move from an intriguing claim or document lead to a reproducible, source-critical research dossier.

## 1. Frame the question

Write the narrow historical question, relevant period, agencies, jurisdictions, expected record types, and what would count as confirming, contradicting, or failing to establish the claim. Separate curiosity from a conclusion.

## 2. Select the source universe

Start with [`source-index.json`](source-index.json) and [`source-map.md`](source-map.md). Identify:

- originating agency;
- legal or archival custodian;
- official publication or oversight context;
- secondary discovery or preservation aids.

Record why each system is authoritative or merely helpful.

## 3. Freeze a source-snapshot contract

Before automation, record:

- start and end time;
- entry pages, queries, collection IDs, sitemaps, exports, or APIs;
- pagination and sorting;
- rate limits and robots/terms review;
- retries, timeouts, and failure classes;
- expected identifiers;
- exclusions;
- parser version;
- change-detection method.

A completeness claim is valid only against this pinned contract.

## 4. Discover metadata first

Capture identifiers, title, collection, originator, custodian, dates, page count, classification/release fields, attachment locators, archival coordinates, and source observation. Do not bulk-copy payloads by default.

Preserve raw field names and values before normalization.

## 5. Resolve document identity

Check whether the item is:

- one historical document;
- an attachment or enclosure;
- one part of a multi-part file;
- a duplicate metadata page;
- a rescanned or differently redacted release;
- an OCR or transcript derivative;
- a later correction or withdrawal.

Use external identifiers, markings, page structure, hashes, and archival context. Do not deduplicate by title alone.

## 6. Establish custody and release lineage

Find the originating body, current official holder, transfer or accession history, collection/series coordinates, review mechanism, raw release decision, redactions, and known release events.

FOIA release, formal declassification, MDR, statutory transfer, archival opening, and official publication are separate events.

## 7. Inspect the primary object

When rights and safety allow access:

1. verify file type and size;
2. scan for malformed or malicious content;
3. calculate SHA-256 of exact bytes;
4. inspect cover, markings, pagination, enclosures, and blank/missing pages;
5. compare portal metadata with the object;
6. treat OCR as unverified until checked;
7. record contradictions and quality warnings.

Do not commit the payload to this repository.

## 8. Build context and counter-evidence

Use official histories, FRUS, congressional records, GAO/CRS, finding aids, scholarly work, and records from other agencies. Search for contradictory documents, later corrections, oversight findings, and records showing that a dramatic lead was rejected or unsubstantiated.

Preserve null and negative findings.

## 9. Write claims with evidence classes

For each claim, label it as:

- record existence;
- literal document statement;
- source allegation;
- official judgment;
- corroborated fact;
- contested interpretation;
- not established;
- unknown.

Attach exact document/object/version locators and page references. State confidence and missing evidence.

## 10. Run rights and safety review

Apply [`rights-safety-and-ethics.md`](rights-safety-and-ethics.md). Default to metadata and an official link. Escalate living-person, medical, victim, informant, operational, vulnerability, graphic, or hazardous-technical material.

## 11. Produce a dossier

A reproducible dossier contains:

- question and scope;
- source-snapshot manifest;
- document inventory and identity decisions;
- custody and release timeline;
- primary evidence table;
- contradictions and limitations;
- rights/safety decisions;
- conclusions with confidence;
- failures, exclusions, and open questions;
- exact rerun instructions.

## FOIA or MDR lane

Before filing a request, search agency reading rooms, NARA, FOIA.gov, prior request archives, finding aids, release lists, and official documentary series.

A request should identify records by agency, office, date range, subject, known identifiers, custodial system, and desired format. Ask for a fee waiver or expedited processing only where the legal criteria genuinely apply. Preserve request text, tracking number, correspondence, search description, determinations, appeal history, release letter, and every released version.

Never imply that a no-records response proves the event did not occur; record the scope and adequacy of the search.

## Quality sampling

For large collections, sample across dates, collections, page counts, redaction states, document types, missing attachments, duplicates, OCR quality, and portal age. Independently reproduce the sample and publish error rates before scaling.

## Stop conditions

Stop or narrow work when:

- the source contract is unstable;
- automation would violate access rules;
- identity precision is poor;
- payload rights are unresolved;
- privacy or safety risks exceed the public-interest case;
- the collection becomes a highlight reel rather than a declared universe;
- conclusions outrun the evidence.
