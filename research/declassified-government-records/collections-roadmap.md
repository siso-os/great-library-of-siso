# Collections Roadmap

## Purpose
This roadmap turns curiosity into bounded research programmes. A collection entry is a scope contract, not a completeness claim and not a payload folder.

Every programme must declare its source universe, identifiers, release/version model, payload policy, risk tier, and promotion gate. The machine-readable form is [`collections.json`](collections.json).

## Waves

### Wave 1 — Core catalog and intelligence sources

| ID | Collection | Priority | Risk | First authoritative source |
|---|---|---:|---|---|
| `DGR-COLL-001` | CIA Reading Room Complete-Catalog Programme | P0 | standard | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-002` | President's Daily Briefs and Daily Intelligence Publications | P0 | standard | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-003` | STARGATE and U.S. Remote-Viewing Programme Records | P0 | standard | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-004` | MKULTRA, BLUEBIRD, ARTICHOKE, and Behavioral Research | P0 | enhanced_privacy | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-005` | CIA Family Jewels, Internal Reviews, and Intelligence Oversight | P0 | enhanced_privacy | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-006` | CIA UFO Files and NARA UAP Record Group 615 | P0 | ongoing_or_contested | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-007` | CIA Institutional History, OSS, and Intelligence Origins | P1 | standard | `DGR-SRC-CIA-RESOURCES` |

### Wave 2 — Covert action, cryptology, oversight and civil liberties

| ID | Collection | Priority | Risk | First authoritative source |
|---|---|---:|---|---|
| `DGR-COLL-008` | Iran 1953, Guatemala 1954, and Early Cold War Covert Action | P0 | enhanced_privacy | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-009` | Cuba, Bay of Pigs, Cuban Missile Crisis, and Related Intelligence | P0 | standard | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-010` | Chile, Latin America, and Cold War Political Operations | P1 | enhanced_privacy | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-011` | CORONA, U-2, A-12, and Historical Reconnaissance Systems | P1 | hazardous_technical | `DGR-SRC-NRO-DECLASSIFIED-PROGRAMS` |
| `DGR-COLL-012` | VENONA and Cryptologic History | P1 | enhanced_privacy | `DGR-SRC-NSA-DECLASSIFICATION` |
| `DGR-COLL-013` | COINTELPRO, Domestic Intelligence, and Civil-Liberties Records | P0 | enhanced_privacy | `DGR-SRC-FBI-VAULT` |
| `DGR-COLL-014` | Church, Pike, Rockefeller, and Intelligence-Oversight Investigations | P0 | standard | `DGR-SRC-CONGRESS-GOV` |
| `DGR-COLL-015` | Assassination Records: JFK, RFK, and MLK | P0 | enhanced_privacy | `DGR-SRC-NARA-JFK` |

### Wave 3 — Special statutory and accountability collections

| ID | Collection | Priority | Risk | First authoritative source |
|---|---|---:|---|---|
| `DGR-COLL-016` | Nazi and Japanese War-Crimes Records | P1 | enhanced_privacy | `DGR-SRC-NARA-SPECIAL-ACCESS` |
| `DGR-COLL-017` | Human Radiation Experiments and Government Medical Research | P0 | enhanced_privacy | `DGR-SRC-DOE-HUMAN-RADIATION` |
| `DGR-COLL-018` | Manhattan Project, Atomic Energy, and Nuclear-History Records | P1 | hazardous_technical | `DGR-SRC-DOE-OPENNET` |
| `DGR-COLL-019` | Vietnam, Gulf of Tonkin, Pentagon Papers, and War Decision-Making | P1 | standard | `DGR-SRC-STATE-FRUS` |
| `DGR-COLL-020` | Iran-Contra and Late Cold War Covert Operations | P1 | enhanced_privacy | `DGR-SRC-CONGRESS-GOV` |
| `DGR-COLL-021` | 9/11 Records, Commission Evidence, and Agency Histories | P0 | enhanced_privacy | `DGR-SRC-NARA-SPECIAL-ACCESS` |
| `DGR-COLL-022` | Iraq WMD Intelligence and Postwar Reviews | P1 | standard | `DGR-SRC-CIA-READING-ROOM` |
| `DGR-COLL-023` | Foreign Relations of the United States Decision Corpus | P0 | standard | `DGR-SRC-STATE-FRUS` |

### Wave 4 — Documentary history, presidential and policy systems

| ID | Collection | Priority | Risk | First authoritative source |
|---|---|---:|---|---|
| `DGR-COLL-024` | Presidential National-Security and NSC Files | P1 | enhanced_privacy | `DGR-SRC-NARA-PRESIDENTIAL-LIBRARIES` |
| `DGR-COLL-025` | Classification, Declassification, Redaction, and Access Policy | P0 | standard | `DGR-SRC-NARA-NDC-RELEASE-LISTS` |
| `DGR-COLL-026` | Government Oversight, Audits, and Accountability Reports | P1 | standard | `DGR-SRC-GAO` |
| `DGR-COLL-027` | Space, Aeronautics, and Cold War Science Records | P2 | hazardous_technical | `DGR-SRC-NASA-NTRS` |
| `DGR-COLL-028` | FOIA Request and Release Ledger | P0 | enhanced_privacy | `DGR-SRC-FOIA-GOV` |

### Wave 5 — Operations, preservation and international expansion

| ID | Collection | Priority | Risk | First authoritative source |
|---|---|---:|---|---|
| `DGR-COLL-029` | Withdrawn, Replaced, and Link-Rotting Public Records Watch | P1 | ongoing_or_contested | `DGR-SRC-INTERNET-ARCHIVE` |
| `DGR-COLL-030` | Foreign Official Declassification and Diplomatic Archives — Phase Two | P2 | ongoing_or_contested | `DGR-SRC-WILSON-DIGITAL-ARCHIVE` |

## What each programme must produce

1. A dated source-snapshot manifest with pagination, retries, failures, exclusions, and change detection.
2. Stable document identities and external identifiers, separated from individual scans, OCR and release versions.
3. Custody and release lineage, including archival coordinates and raw agency markings.
4. A stratified quality sample covering duplicates, redactions, missing attachments, OCR errors, and link changes.
5. Rights, privacy, reputational, graphic, operational-security, and hazardous-technical decisions.
6. A research dossier that separates what a record says from what the evidence establishes.

## Payload policies

- `metadata_and_link_only`: default; preserve official locators and receipts, not copied payloads.
- `approved_public_payloads_only`: an item may enter a governed external data plane after review and hashing.
- `metadata_only_restricted`: expose only minimum metadata when privacy, safety, rights, or access restrictions control.

## Promotion rule

A programme may move from planning to pilot only after its authoritative-source contract is reproducible. It may move to publication only after version, rights, safety, deletion/correction, and independent-review gates pass. Collection counts never substitute for coverage evidence.

## Cross-department relationships

`DGR-COLL-003` projects STARGATE records into the separate Remote Viewing Research & Practice module. History and subject departments may build narratives on top of any collection, while this department retains document identity, custody, release, and source receipts. People Graph links require identity resolution and living-person review.
