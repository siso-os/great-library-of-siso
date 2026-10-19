# Source Map

## Purpose

This map identifies the source systems from which the department can discover, validate, contextualize, or preserve public government records.

It is a **map of repositories and publication systems**, not a document corpus. The authoritative machine-readable version is [`source-index.json`](source-index.json).

## The custody problem

A single historical record can appear in several places:

- the originating agency's reading room;
- a NARA catalog description;
- a presidential library finding aid;
- an official documentary series;
- a congressional exhibit;
- a nonprofit archive;
- a journalist's DocumentCloud upload;
- an Internet Archive capture.

Those copies have different roles.

The originating agency may know the release decision. NARA may hold legal custody and archival hierarchy. FRUS may provide a verified transcript and decision context. A nonprofit archive may preserve a clearer scan or release letter. A web archive may prove that an official locator once existed.

The catalog should not select one role and erase the others. It should identify:

- **origin:** who created the record;
- **custody:** who officially holds or publishes the observed copy;
- **discovery:** where the record was found;
- **preservation:** where an exact or historical copy may survive;
- **context:** which official or scholarly work explains the record;
- **version:** which bytes and redactions were observed at what time.

## Authority ladder

### Primary official

Use as the default authority for document identity, collection membership, custody, release metadata, and official payload locators.

Examples include CIA, FBI, NSA, DIA, ODNI, NRO, NARA, presidential libraries, State, DOE, military reading rooms, official publishers, and congressional systems.

### Official context

Use to interpret process, law, policy, oversight, and selected documentary history. Official context can be authoritative about what the institution published or concluded without being the complete primary record for an event.

Examples include CRS analysis, PIDB recommendations, redaction-code guidance, and FOIA.gov.

### Secondary discovery

Use to find records, release packages, FOIA request histories, translations, topic collections, and curatorial context. Match the record back to the originating agency or legal custodian whenever possible.

### Secondary preservation

Use to detect link rot, compare historical bytes, recover public locator history, and inspect publisher copies. A preservation copy does not automatically prove legal custody, completeness, authenticity, or reuse rights.

## Release mechanisms are not synonyms

The source ledger tracks mechanisms separately:

| Mechanism | Working meaning |
|---|---|
| FOIA | Disclosure under the Freedom of Information Act, potentially with exemptions and redactions |
| MDR | A request to review classified information for declassification under the governing executive order |
| Systematic review | Review of eligible records by age, series, or programme |
| Automatic declassification | Age-based declassification subject to exemptions, exclusions, referral, or delay |
| Statutory release | Access or transfer governed by a collection-specific statute |
| Presidential determination | A presidential release or declassification decision |
| Discretionary release | Public release that an agency was not compelled to make under a particular request |
| Archival opening | Records opened under archival law, deed, or access regime |
| Official publication | Material made public through an official publishing process and not necessarily formerly classified |

A document can have more than one mechanism or an unresolved mechanism. Preserve the agency's raw wording before normalizing it.

## Source-system table

Every source below was observed on 2026-08-07. “Observed” means that the department recorded the source surface and its apparent role; it does not certify API stability, bulk permission, or completeness.



### Authoritative official sources

| Source ID | Source | Custody role | Best use | Principal limitation |
|---|---|---|---|---|

| `DGR-SRC-CIA-READING-ROOM` | [CIA Freedom of Information Act Electronic Reading Room](https://www.cia.gov/readingroom/) | `originating_agency` | CIA document identity; CREST or FOIA identifiers; collection membership | Portal metadata can reflect repository ingest or publication dates rather than the date the underlying record was authored. Collection labels and OCR text require document-level checking. |
| `DGR-SRC-NARA-CATALOG` | [National Archives Catalog](https://catalog.archives.gov/) | `legal_custodian` | legal custody; record group and series context; National Archives identifiers | Only a fraction of NARA holdings is digitized. A catalog description can exist while the record remains restricted, unprocessed, onsite-only, or partly digitized. |
| `DGR-SRC-NARA-NDC-RELEASE-LISTS` | [National Declassification Center Release Lists](https://www.archives.gov/declassification/ndc/release-lists) | `legal_custodian` | newly completed declassification projects; record groups; series titles | Completion of declassification processing does not necessarily mean immediate online payload access; some series require additional FOIA, privacy, law-enforcement, or reference screening. |
| `DGR-SRC-NARA-SPECIAL-ACCESS` | [NARA Special Access and FOIA](https://www.archives.gov/research/foia) | `legal_custodian` | sensitive archival collections; FOIA finding aids; FBI records at NARA | Many holdings remain onsite or request-based, and access status can vary at box, folder, item, or page level. |
| `DGR-SRC-NARA-PRESIDENTIAL-LIBRARIES` | [Presidential Libraries and Presidential Records Access](https://www.archives.gov/presidential-libraries) | `legal_custodian` | presidential national-security files; NSC material; White House records | Access law differs by administration and collection. Hoover-through-Carter donated collections and later Presidential Records Act holdings do not share one access regime. |
| `DGR-SRC-NARA-JFK` | [President John F. Kennedy Assassination Records Collection](https://www.archives.gov/research/jfk) | `legal_custodian` | JFK assassination records; release-batch lineage; agency provenance | The collection spans multiple media and agencies; online availability and document version can change as digitization and release work continues. |
| `DGR-SRC-NARA-UAP-RG615` | [NARA Record Group 615 — Unidentified Anomalous Phenomena Records Collection](https://www.archives.gov/research/topics/uaps/rg-615) | `legal_custodian` | UAP record-transfer tracking; originating agency provenance; series identifiers | The collection is still growing. Agency transfer, NARA accession, public availability, and declassification are separate events. |
| `DGR-SRC-FBI-VAULT` | [FBI Records: The Vault](https://vault.fbi.gov/foia) | `originating_agency` | FBI file subjects; release series; part numbering | Some large files are incomplete online, split into parts, summarized, or excerpted. Subject labels are not findings of guilt or accuracy. |
| `DGR-SRC-NSA-DECLASSIFICATION` | [NSA Declassification and Transparency Initiatives](https://www.nsa.gov/Helpful-Links/NSA-FOIA/Declassification-Transparency-Initiatives/) | `originating_agency` | cryptologic history; declassification policy; topical releases | Agency pages may point to NARA custody rather than host the complete payload. Preserve both originating-agency and current-custodian identifiers. |
| `DGR-SRC-DIA-READING-ROOM` | [DIA FOIA Electronic Reading Room](https://www.dia.mil/FOIA/FOIA-Electronic-Reading-Room/) | `originating_agency` | defense-intelligence records; topic framework; release dates | Page structures and file IDs can change. Records may be redacted under multiple exemptions and may lack a single stable corpus export. |
| `DGR-SRC-ODNI-READING-ROOM` | [ODNI FOIA Reading Room](https://www.dni.gov/index.php/what-we-do/foia-reading-room) | `originating_agency` | intelligence-community policy; cross-agency reports; UAP and other public releases | ODNI may publish summaries or community-level products while source records remain with component agencies. |
| `DGR-SRC-NRO-READING-ROOM` | [NRO Electronic Reading Room](https://www.nro.gov/foia-home/foia-resources-reading-room/) | `originating_agency` | reconnaissance-program documents; NRO FOIA releases; program and policy context | Many programs and facts remain classified, and declassified program pages do not imply that every associated record or technical detail is releasable. |
| `DGR-SRC-NRO-DECLASSIFIED-PROGRAMS` | [NRO Declassified Programs and Projects](https://www.nro.gov/foia-home/Declassified-NRO-Programs-and-Projects/) | `originating_agency` | CORONA and other legacy reconnaissance-program collections; program lineage; official historical framing | Program declassification is scoped; some facts about declassified programs remain classified. |
| `DGR-SRC-STATE-FRUS` | [Foreign Relations of the United States](https://history.state.gov/historicaldocuments) | `government_publisher` | official documentary history of U.S. foreign policy; cross-agency documents; decision context | FRUS is a selected and edited documentary series, not the complete underlying record. Selection, publication lag, and acknowledged omissions or redactions must be preserved. |
| `DGR-SRC-STATE-FOIA` | [U.S. Department of State Freedom of Information Act Virtual Reading Room](https://foia.state.gov/) | `originating_agency` | diplomatic cables and records; FOIA case and document identifiers; State Department release provenance | Portal behavior and search endpoints must be re-verified before automation; records may be duplicated across cases, NARA, FRUS, and presidential libraries. |
| `DGR-SRC-DOE-OPENNET` | [DOE OpenNet](https://www.osti.gov/opennet/) | `originating_agency` | DOE and predecessor-agency declassified document citations; availability leads; nuclear-history metadata | OpenNet is often an index to where a copy can be obtained rather than a complete full-text corpus. It also includes some never-classified historical documents. |
| `DGR-SRC-DOE-HUMAN-RADIATION` | [DOE Openness — Human Radiation Experiments (archived site)](https://ehss.energy.gov/ohre/index.html) | `originating_agency` | human-radiation-experiment history; document leads; agency openness program context | The site is archived and not a complete substitute for NARA, DOE records offices, or later scholarship. Links and legacy formats may decay. |
| `DGR-SRC-NASA-NTRS` | [NASA Technical Reports Server](https://ntrs.nasa.gov/) | `government_publisher` | space and aeronautics history; technical-report identity; program documentation | NTRS is a public technical repository, not a declassified-only collection. Public records can still have export, proprietary, privacy, or rights notes. |
| `DGR-SRC-ARMY-FOIA` | [U.S. Army FOIA Reading Room](https://foia.army.mil/) | `originating_agency` | Army release records; originator and upload date; military historical and administrative records | The reading room is not a complete Army archive; component commands and NARA hold additional records. |
| `DGR-SRC-AIR-FORCE-FOIA` | [Department of the Air Force FOIA Library](https://www.compliance.af.mil/Library/) | `originating_agency` | Air Force records; FOIA library context; aviation and space-history leads | Component-level records and older holdings may reside at NARA or other repositories. |
| `DGR-SRC-NAVY-FOIA` | [Department of the Navy Inspector General FOIA Reading Room](https://www.secnav.navy.mil/ig/Pages/foia2.aspx) | `originating_agency` | naval oversight and investigation records; component FOIA provenance | This is a component reading room, not a complete Department of the Navy archive. |
| `DGR-SRC-GOVINFO` | [GovInfo](https://www.govinfo.gov/) | `government_publisher` | congressional and executive publications; hearings; reports | GovInfo is broad government information, not a declassified corpus. Coverage and official-version status vary by collection and date. |
| `DGR-SRC-CONGRESS-GOV` | [Congress.gov](https://www.congress.gov/) | `government_publisher` | oversight history; committee investigations; legislative context | Congressional records are governed by different access rules than executive-branch FOIA records; not every committee or archival record is online. |
| `DGR-SRC-GAO` | [U.S. Government Accountability Office Reports and Decisions](https://www.gao.gov/advanced-search) | `oversight_body` | audit and oversight evidence; program history; recommendations | GAO products can summarize classified or non-public evidence without publishing the underlying record. |
| `DGR-SRC-FEDERAL-REGISTER` | [FederalRegister.gov](https://www.federalregister.gov/) | `government_publisher` | executive orders; declassification notices; agency rules | The Federal Register supplies legal and procedural context rather than the underlying archival payload. |
| `DGR-SRC-LOC-FINDING-AIDS` | [Library of Congress Finding Aids and Digital Collections](https://findingaids.loc.gov/) | `legal_or_donor_custodian` | personal papers of policymakers; VENONA-related records; institutional history | Personal papers and copies of government records are not the same as official agency record copies. Classified, donor-restricted, or closed series may remain. |
| `DGR-SRC-NARA-MILITARY` | [NARA Military Records Research](https://www.archives.gov/research/military) | `legal_custodian` | military-record discovery; branch and conflict context; record-group navigation | This is a gateway, not a complete item-level catalog. Personnel records and operational records follow different access paths. |



### Official context, publication, and oversight sources

| Source ID | Source | Custody role | Best use | Principal limitation |
|---|---|---|---|---|

| `DGR-SRC-CIA-RESOURCES` | [CIA Public Resources](https://www.cia.gov/resources/) | `originating_agency` | official context; collection discovery; agency-authored histories | This is a curated surface rather than a complete document catalog. |
| `DGR-SRC-FOIA-GOV` | [FOIA.gov](https://www.foia.gov/) | `government_publisher` | finding the right agency; FOIA library discovery; request and backlog data | FOIA is decentralized; this portal does not hold every responsive document and does not apply to Congress, federal courts, or state and local government in the same way. |
| `DGR-SRC-CRS-REPORTS` | [Congressional Research Service Reports](https://crsreports.congress.gov/) | `government_publisher` | legal and historical context; classification policy; intelligence oversight | CRS reports are analysis, not primary evidence for the underlying event; version history matters. |
| `DGR-SRC-NARA-REDACTION-CODES` | [NARA / ISCAP Redaction Codes](https://www.archives.gov/declassification/iscap/redaction-codes.html) | `oversight_body` | interpreting redaction annotations; normalizing withholding reasons; classification-policy context | Codes must be read in the context of the governing order, document date, and agency practice. |
| `DGR-SRC-PIDB` | [Public Interest Declassification Board](https://www.archives.gov/declassification/pidb) | `oversight_body` | system-level declassification policy; public-interest priorities; reform history | PIDB recommendations are advisory and do not themselves declassify documents. |



### Secondary research and request archives

| Source ID | Source | Custody role | Best use | Principal limitation |
|---|---|---|---|---|

| `DGR-SRC-NATIONAL-SECURITY-ARCHIVE` | [National Security Archive](https://nsarchive.gwu.edu/) | `index_and_publisher` | topic discovery; contextual briefing books; FOIA leads | This is a nongovernmental research archive. Its copy may be invaluable but does not replace verification against the originating agency or current legal custodian. |
| `DGR-SRC-WILSON-DIGITAL-ARCHIVE` | [Wilson Center Digital Archive](https://digitalarchive.wilsoncenter.org/) | `index_and_publisher` | foreign-government records; Cold War international context; translations | Translations and supplied document copies must be traced to the named archive and original-language record. Custody and release law vary by country. |
| `DGR-SRC-MUCKROCK` | [MuckRock Requests, FOIA Log Explorer, and Document Collections](https://www.muckrock.com/) | `request_and_release_archive` | request language; agency tracking numbers; previously released records | Requester-uploaded or platform-hosted copies are not automatic proof of completeness, agency authenticity, or current legal custody. |
| `DGR-SRC-DOCUMENTCLOUD` | [DocumentCloud](https://www.documentcloud.org/) | `preservation_mirror` | OCR and text search; publisher provenance; annotations | Publisher-uploaded documents and OCR are not authoritative transcriptions. The platform is not the legal custodian. |



### Secondary preservation and document platforms

| Source ID | Source | Custody role | Best use | Principal limitation |
|---|---|---|---|---|

| `DGR-SRC-INTERNET-ARCHIVE` | [Internet Archive](https://archive.org/) | `preservation_mirror` | dead-link recovery; portal version history; discovery of withdrawn public copies | User uploads and archived pages can be incomplete, mislabeled, unauthorized, or detached from official custody. |



## Official source families

### CIA

The CIA Reading Room is the first major ingestion target because its document pages expose useful metadata and public attachments. The source contract must still distinguish:

- collection pages from document pages;
- document IDs from attachment files;
- historical document dates from repository metadata dates;
- raw release decisions from normalized states;
- OCR body text from the scan;
- current pages from historical portal versions;
- one document family from multiple release or scan versions.

The CIA public resources surface adds curated publications and context but is not a complete catalog.

### National Archives and presidential libraries

NARA is central because it can hold legal custody, archival hierarchy, record-group and series descriptions, release lists, special-access finding aids, and digital objects.

A NARA catalog page may describe:

- a record group;
- a series;
- a file unit;
- an item;
- one or more digital objects.

Those levels must not be flattened.

NARA also demonstrates why “declassified” and “online” differ. A series may finish declassification processing while still requiring privacy, law-enforcement, or FOIA screening. A catalog description can be online while the payload is onsite or restricted. A presidential collection can be governed by donation, deed, the Presidential Records Act, FOIA, or MDR depending on the administration and record.

### Intelligence and defense agencies

FBI, NSA, DIA, ODNI, NRO, Army, Air Force, and Navy sources are separate systems with different:

- IDs;
- collection structures;
- update cadence;
- FOIA components;
- payload naming;
- redaction practices;
- current custody;
- historical transfer relationships.

A future common harvester must preserve the source-specific raw fields rather than forcing every portal into the CIA model.

### State and official diplomatic history

The State FOIA portal is an originating-agency release system.

FRUS is an official selected documentary history. It offers structured full text, editorial notes, source citations, and cross-agency context. It is excellent for research and citation but is not the complete underlying archive.

The best record graph will link an FRUS document to its cited archival source, agency copy, presidential-library copy, and later release versions.

### DOE, nuclear history, and technical repositories

DOE OpenNet is especially important because it demonstrates an index-and-availability model: a bibliographic record can tell a researcher that a document exists and where it may be obtained without hosting the complete payload.

DOE and NASA technical systems also require a stronger safety boundary. Historical interest does not justify assembling design-enabling nuclear, explosives, safeguards, cyber, or current system-vulnerability material.

### Congress, GAO, GovInfo, and the Federal Register

These official publishing systems provide:

- hearings;
- reports;
- testimony;
- committee activity;
- statutes and legislative history;
- executive orders and notices;
- audits;
- official versions;
- policy and legal context.

They are not limited to declassified records. The catalog must label them as official public records rather than retroactively calling them declassified.

## Secondary-source rules

A secondary source earns a role when it adds one or more of:

- a release letter;
- request tracking number;
- better scan;
- earlier public version;
- full-text search;
- translation;
- archival citation;
- chronology;
- scholarly annotation;
- preservation receipt;
- evidence that an official locator changed.

It does not earn authority merely because it is easier to use.

For each secondary copy:

1. identify the uploader or curator;
2. locate the stated originating agency;
3. capture every external identifier;
4. compare page count, markings, and bytes with official copies;
5. preserve the release letter if public;
6. label OCR and annotations as derivatives;
7. record rights and platform terms;
8. link to the authoritative source or state why none is known.

## Portal-change and link-rot protocol

Every automated source integration should preserve:

- observation timestamp;
- request URL;
- redirect chain;
- response status;
- relevant headers;
- page or API contract version;
- discovered stable ID;
- reported file name and size;
- exact payload SHA-256 when approved and downloaded;
- parser version;
- extraction warnings;
- retry count;
- failure reason.

When a locator changes:

- do not overwrite the previous observation;
- add a new observation;
- compare identifiers and bytes;
- label redirects, replacements, corrections, and withdrawals separately;
- seek an official explanation;
- use secondary archives only as evidence of prior public state;
- never defeat a valid restriction by republishing a withdrawn payload.

## Source refresh cadence

A practical default:

| Source type | Refresh |
|---|---|
| Rolling agency reading room | weekly discovery; monthly integrity sample |
| NARA NDC release list | quarterly and on page change |
| Statutory rolling collection | monthly |
| Official documentary series | monthly or release-triggered |
| FOIA logs and reports | monthly/quarterly/annual by product |
| Static historical topic site | quarterly link check |
| Secondary research archive | monthly discovery only |
| Preservation mirror | event-driven; no routine bulk ingest without a collection need |

The cadence is a starting point. Rate limits, terms, robots rules, infrastructure cost, and source behavior take precedence.

## Adding a source

A new source record must state:

- why it is relevant;
- whether it is official;
- whether it creates, holds, publishes, indexes, or mirrors records;
- which release mechanisms it exposes;
- how it updates;
- whether machine access is documented;
- its principal blind spots;
- its rights boundary;
- its safety boundary;
- the date it was observed.

A source should not be added merely to make the map look comprehensive.
