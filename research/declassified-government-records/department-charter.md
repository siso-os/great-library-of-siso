# Department Charter

## Name

**Declassified Government Records Department**

The shorter internal name is **DGR**.

## Mission

Build the Great Library's evidence spine for historically significant government records that are declassified, released, archival, or officially public.

The department exists to make records:

- discoverable across fragmented government portals;
- identifiable through stable local and external IDs;
- traceable to their originating body and current custodian;
- explicit about classification, review, redaction, and release state;
- versioned when scans, redactions, metadata, or locators change;
- linkable to people, events, institutions, places, and subject modules;
- interpretable without turning an agency record into an unquestioned truth claim;
- publishable only within rights, privacy, ethics, and safety boundaries.

## Founding intent

The department begins with a curiosity-driven request for a place to explore CIA declassified files and other interesting government documents.

The durable implementation is broader than “CIA secrets” and narrower than “everything on a government website.”

It includes records with historical and research value from:

- intelligence and defense agencies;
- NARA and presidential libraries;
- diplomatic and foreign-policy publications;
- congressional investigations and oversight;
- inspectors general and GAO;
- scientific and technical repositories;
- classification and declassification policy bodies;
- official special collections;
- carefully labeled secondary discovery and preservation systems.

It does not treat sensationalism as a selection criterion. A mundane release manifest, finding aid, FOIA letter, or version receipt can be more important than a dramatic page because it establishes provenance.

## Placement in the Great Library

The department is authored under:

```text
research/declassified-government-records/**
```

It belongs in **Research** because its core output is evidence infrastructure:

- a source-system map;
- record and collection schemas;
- custody and release lineage;
- reproducible acquisition and verification methods;
- claim-to-document discipline;
- rights and safety review;
- research dossiers that can be tested and corrected.

It should later be represented by an independently addressable Great Library Work and immutable Release. History, Politics, Science, War, Biography, and other departments can select or project its records through relationships.

### What it owns

DGR owns:

- the public government-record source map;
- source identities and authority classes;
- document identity and version conventions;
- release-state normalization;
- collection-level coverage definitions;
- source receipts and preservation metadata;
- research workflows for locating and validating records;
- rights, privacy, and safety gates specific to government records;
- cross-collection deduplication and custody lineage.

### What it does not own

DGR does not own:

- the historical interpretation of every event;
- biographies of people appearing in records;
- a scientific field merely because a government funded it;
- the remote-viewing practice and evidence module;
- the UNSOLVEABLE Mathematics research programme;
- a universal legal conclusion about classification or copyright;
- leaked or unlawfully obtained material;
- current intelligence collection or operational targeting;
- the generated public site or canonical registry lanes reserved by other work.

## Truth model

The department separates four kinds of truth.

### 1. Record truth

What the physical or digital record literally contains:

- text;
- markings;
- dates;
- signatures;
- enclosures;
- redactions;
- stamps;
- handwritten notes;
- images;
- metadata.

Record truth is established by the authoritative object or a verified copy.

### 2. Custody and release truth

How the record came to the public:

- who created it;
- who transferred or retained it;
- who reviewed it;
- what legal or administrative mechanism applied;
- when it was released;
- whether it was redacted;
- whether a later version exists;
- whether it is online, onsite, request-only, withdrawn, or superseded.

### 3. Source-asserted truth

What the record's author or institution claims.

An intelligence report can reproduce a source allegation. A field report can describe an observation. A briefing can express an analytic judgment. A committee report can summarize testimony. These are claims made within records, not automatic historical facts.

### 4. Research conclusion

What a careful synthesis concludes after:

- source criticism;
- cross-document comparison;
- chronology;
- corroboration;
- contradictory evidence;
- provenance and version review;
- domain expertise;
- uncertainty assessment.

The system must never silently move from source-asserted truth to research conclusion.

## Scope taxonomy

A record can enter one or more of these classes.

### Formally declassified records

Records for which an authority has removed classification in full or in part.

### FOIA-released records

Records disclosed under the Freedom of Information Act. A FOIA release may be unclassified, declassified, or redacted; FOIA release and declassification are not synonyms.

### Mandatory Declassification Review records

Records released after a request for review under the governing classification order.

### Systematically or automatically reviewed records

Older records processed under systematic or automatic declassification programmes, subject to exemptions, referral, or exclusion.

### Statutory special collections

Records transferred or released under a specific law or presidential direction, such as assassination or UAP record collections.

### Archival-open records

Records open for research through NARA, a presidential library, another official archive, or an official records repository. They may never have been classified.

### Official publications

FRUS volumes, GAO reports, congressional publications, the Federal Register, official histories, and public technical reports. These are government documents of interest but should not be mislabeled declassified when they were public by design.

### Secondary research or preservation copies

Copies and indexes held by nonprofit archives, universities, journalists, libraries, web archives, or document platforms. They are discovery and comparison aids until matched to authoritative custody.

### Excluded or restricted classes

The department does not ingest or republish:

- material known or reasonably suspected to remain classified;
- unlawfully obtained restricted material;
- credentials, access tokens, private correspondence, or non-public request accounts;
- doxxing dossiers;
- intimate or medical records without compelling public-interest and privacy review;
- current operational locations, vulnerabilities, sources, methods, or targeting data;
- design-enabling weapons, nuclear, biological, chemical, explosives, or cyber material;
- graphic victim media without a compelling research reason and trauma-informed controls.

The department may preserve a public metadata note that a restricted record exists without preserving or exposing the payload.

## Architecture

The department uses a layered architecture.

### Layer A — source systems

The machine-readable [`source-index.json`](source-index.json) records official and secondary source systems. Each source has:

- owner;
- jurisdiction;
- source class;
- authority class;
- custody role;
- access modes;
- release mechanisms;
- update model;
- machine-access status;
- limitations;
- rights and safety notes;
- observation date.

### Layer B — collection programmes

[`collections.json`](collections.json) defines bounded research collections. A collection is not a folder of files. It is a declared inquiry with:

- scope;
- research questions;
- authoritative sources;
- seed identifiers;
- required artifact types;
- coverage dimensions;
- payload policy;
- risk tier;
- promotion gate.

### Layer C — document records

[`document-record.schema.json`](document-record.schema.json) defines the module-local draft for one document record.

Document records model:

- identity;
- origin;
- custody;
- dates;
- release state;
- digital objects;
- description;
- relationships;
- provenance;
- rights;
- safety;
- research state.

### Layer D — content-addressed payload plane

No payload plane is created in this branch.

A future payload plane may store approved public copies, OCR, thumbnails, or preservation derivatives. It must be governed by:

- exact byte hashes;
- source receipts;
- format validation;
- malware scanning;
- rights decisions;
- safety decisions;
- access policy;
- retention and deletion policy;
- version relationships;
- separation from canonical registry history.

### Layer E — research and reading projections

Subject modules, History narratives, timelines, people pages, event graphs, and public exhibits should query document metadata and relationships. They should not create duplicate unversioned copies.

## Completeness model

“Complete” is always scoped.

A collection can claim completeness only against a declared universe, for example:

> All document metadata pages discoverable through the CIA Reading Room collection index and sitemap contract observed on 2026-08-07, with every discovered document ID either captured, explicitly failed, excluded by rule, or queued for retry.

A defensible completeness statement identifies:

- source system;
- retrieval method;
- observation period;
- query or export contract;
- pagination and retry behavior;
- exclusions;
- failures;
- deduplication rule;
- change-detection rule;
- expected blind spots.

It never means “every record the government has” or “every record that ever existed.”

## Department operating roles

A mature programme should distinguish these roles even when one person temporarily performs several.

### Collection steward

Defines scope, significance, and promotion gates. Prevents topic drift and sensational selection.

### Source engineer

Builds reproducible discovery, metadata capture, hashing, retries, and portal-change detection.

### Archivist or provenance reviewer

Checks custody, record groups, series, finding aids, identifiers, transfer history, and version lineage.

### Subject researcher

Provides event, institutional, scientific, legal, or regional context.

### Rights reviewer

Assesses government-work status, embedded rights, donor restrictions, platform terms, and reuse decision.

### Privacy and ethics reviewer

Applies data minimization, living-person, victim, medical, reputational, and trauma-informed rules.

### Safety reviewer

Reviews operational-security, dual-use, hazardous-technical, and current vulnerability risks.

### Independent verifier

Reproduces source discovery and checks a declared sample without relying on the original researcher's private notes.

## Collection significance rubric

A proposed collection should score well on several dimensions:

- historical significance;
- public-interest value;
- source authority;
- preservation risk;
- ability to link across agencies or archives;
- unresolved research questions;
- evidence of version or release complexity;
- educational value;
- rights and safety feasibility;
- fit with existing Great Library departments.

Novelty or strangeness alone is insufficient.

## Claims discipline

Every public synthesis should distinguish:

- **documented occurrence:** the record or release event exists;
- **source report:** a person or agency stated something;
- **corroborated fact:** multiple appropriate sources support the event;
- **official conclusion:** an institution reached a stated finding;
- **contested interpretation:** credible evidence or scholarship disagrees;
- **not established:** the public record does not support the claim;
- **unknown:** the necessary evidence is missing, closed, destroyed, redacted, or not yet reviewed.

Confidence must attach to the claim, not to the excitement of the topic.

## Version discipline

The department expects version complexity.

Two public files can differ because of:

- a new declassification review;
- narrower or wider redaction;
- rescanning;
- optical character recognition;
- pagination;
- missing or added enclosure;
- correction;
- changed metadata;
- portal migration;
- compression;
- file corruption;
- third-party rearrangement;
- withdrawal and republication.

The catalog therefore separates:

- historical document identity;
- public release version;
- digital object;
- OCR or transcript derivative;
- metadata-page observation.

## Relationship discipline

Useful relationship edges include:

- document → collection;
- document → attachment;
- document → version;
- document → release package;
- document → request;
- document → record group / series;
- document → event;
- document → person or organization mention;
- document → official report that cites it;
- document → subject module;
- document → correction or replacement.

Relationships require evidence and confidence.

## Ethical stance

The department is neither reflexively deferential to agencies nor reflexively suspicious of every public record.

It assumes:

- agencies can produce accurate, incomplete, mistaken, self-interested, contradictory, or later-corrected records;
- archival context matters;
- declassification is a process, not a guarantee of completeness;
- secrecy can protect legitimate interests and can also obstruct accountability;
- transparency can serve public knowledge and can also harm privacy or safety;
- historical research should expose uncertainty rather than manufacture certainty.

## Success measures

Early success is measured by:

- percentage of source systems with verified current locators;
- number of official sources versus discovery-only sources;
- percentage of records with authoritative external IDs;
- percentage with distinct document, release, ingest, and retrieval dates;
- duplicate and version-link precision;
- percentage with rights and safety decisions;
- reproducibility of source snapshots;
- broken-link detection and repair;
- claim-to-document citation quality;
- independent review findings;
- documented exclusions and failures.

Raw page count is not a success measure by itself.

## Phased programme

### Phase 0 — charter and contracts

Delivered by this branch:

- department charter;
- official/secondary source map;
- source ledger;
- collection roadmap;
- document schema;
- worked metadata example;
- research playbook;
- rights and safety policy;
- offline verifier.

### Phase 1 — CIA pilot

- freeze a CIA Reading Room discovery contract;
- capture metadata only;
- validate stable IDs;
- build collection and version edges;
- select a stratified sample;
- compare official pages with NARA or other custody records;
- measure portal and OCR quality;
- produce a rights and safety report.

### Phase 2 — multi-custody pilots

Run bounded pilots for:

- STARGATE;
- President's Daily Briefs;
- intelligence oversight;
- assassination records;
- UAP Record Group 615;
- FRUS;
- one NARA declassification release list.

### Phase 3 — evidence graph

Link:

- documents;
- collections;
- releases;
- requests;
- agencies;
- record groups;
- people;
- events;
- subjects;
- claims;
- publications.

### Phase 4 — governed preservation

Only after legal, rights, safety, and infrastructure approval:

- store approved exact payload bytes;
- generate checksums;
- derive OCR or thumbnails;
- maintain deletion and correction paths;
- preserve release versions;
- expose public objects through stable content-addressed locators.

### Phase 5 — formal Great Library publication

- register a Work;
- publish an immutable Release;
- create a Source Inventory for external source systems and approved preserved objects;
- select it into a successor Snapshot;
- generate public reading pages;
- document integration with History, Remote Viewing, People Graph, and subject departments.

## Governance decisions reserved for later

This branch intentionally does not decide:

- the permanent global document ID format;
- whether payloads live in this repository, object storage, another repository, or an archive service;
- which crawler technology to use;
- whether every official portal permits automated collection;
- the final rights policy for government documents outside the United States;
- how living-person names flow into People Graph;
- the public access tier for sensitive but officially released records;
- the global classification and declassification ontology.

Those decisions require pilots and review, not confident guessing.

## Charter test

The department is working when a researcher can begin with an intriguing claim and end with:

1. the exact record or a documented failure to find it;
2. the authoritative source and current custodian;
3. the public release and version history;
4. the scan or verified text;
5. the relevant archival and historical context;
6. contradictory or limiting evidence;
7. a clear statement of what is known, disputed, and unknown;
8. a lawful and safe publication decision.

That is the difference between a curiosity archive and a durable research department.
