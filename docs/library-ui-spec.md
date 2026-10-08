# Great Library UI — Fable implementation brief

> **Superseded, 9 Oct 2026.** The Library people read is now the reader in [`reader/`](../reader/README.md) (spec: [`reader/SPEC.html`](../reader/SPEC.html)): every doc on shelves with search, inside Agent Base's Estate and on a private Worker. This file is the September record for the older public site; its links and evidence still hold.


Status: ready for Fable design and implementation; the current UI is an incomplete pilot.
Direction: Shaan's September 5 Library requests and September 6 correction.
Live baseline: https://great-library-of-siso.pages.dev/

## 1. The outcome

Build the public, human- and agent-readable front door to SISO's research,
software, methods and projects. A person should understand what is valuable,
why it matters, how the pieces connect and what they can actually use. An agent
should find the owning source, entry instructions and evidence without rebuilding
the whole context. The earlier target was orientation in roughly 20k tokens;
that is an orientation goal, not permission to discard relevant evidence.

This is an implementation brief, not a request for another broad research pass.
Shaan has assigned the UI work to Fable. Library owns the registry and source
boundaries; other project owners retain their content and runtime authority.

## 2. What the pilot missed

- The original instruction explicitly named the SISO CRM sidebar, the Operator
  reference, persistent collapse and a shared shell across pages.
- The shipped `siso-shell` is a new forest-colored approximation. It is not the
  requested CRM component/style extraction and must not be treated as the visual
  reference for the redesign.
- `scripts/build.mjs` gates the new shell on `reading-page`. Only the homepage
  and Foundry Work currently have it. Other Work pages, section/index pages and
  standalone documents retain different navigation.
- `docs/module-page-template.md` documents one pilot. It does not specify the
  complete family of project, framework, industry, question and evidence pages.
- Existing checks prove generation, source parity, links and selected behavior.
  They do not prove CRM fidelity, complete navigation coverage or sufficient
  content depth. The pilot-isolation assertion in
  `tests/reading-surface.test.mjs` must be replaced for the expanded scope.

The rail mismatch is an execution miss against explicit instructions. Missing
page-family contracts and visual acceptance checks are also specification and
verification gaps. Keep the working registry, tools and evidence while fixing
those gaps.

## 3. Shared shell: use the actual SISO CRM source

The private reference packet identifies verified source files and hashes for
CRM `GroupedRail.tsx`, `GroupedRail.css`, `tokens.css`, and the newer Operator
`GroupedRail`/`crm-tokens.css` adaptation named in the original brief.

Read those implementations and their style dependencies. Extract/reuse the
SISO-owned presentation, grouping, controls and tokens. Bind Library destinations
and public data to it. Do not substitute a 21st.dev sidebar or redraw it from
memory. Shaan corrected his wording from 21st.dev to SISO CRM: CRM is the binding
sidebar reference; component-bank material can support other appropriate modules.

The reference includes the floating/inset glass rail, rounded frame, layered
border/highlight, grouped destinations, active/hover states, search and collapse
controls. The inspected Operator version uses 232px expanded width and 27px
outer radius. These are reference measurements, not an invitation to mix tokens
from different revisions. Choose and record one coherent source version.

The Library-specific collapsed requirement is an approximately 20px visible
strip with a centered chevron/handle, while keeping a usable hit target. The
reference CRM compact rail is wider; implement the explicit Library strip mode
without clipping a row of compact icons into 20px. Record this intentional
adaptation. Click and `[` toggle it; persist the preference; provide meaningful
labels and keyboard focus. Add the requested command/search affordance, with
Cmd/Ctrl+K, Escape and return of focus.

Use the same shell on every Library page and supported project/subsite template.
Include authored document readers, not just generated Work pages. Preserve
existing URLs, anchors, local links and content during wrapping. Ensure one
navigation landmark, one main landmark, a working skip link, current-page state
and usable no-JavaScript navigation. Mobile must have a coherent closed/open
navigation state; reduced motion and unavailable localStorage must work.

Keep the shared implementation in `siso-shell`; consumers pin it and copy assets
only as generated build output. Do not import client rosters, private routes,
auth state, runtime models or source payloads from the donor application. Retain
applicable source attribution and third-party notices.

## 4. Information architecture

Primary destinations: Library/all Works; Agents; Research; Industries; God
Questions; Now; SISO Source (explicitly private); Agent Base/public source.
Releases, Snapshots, repository estate, promotion and reference documents remain
reachable in a secondary group. Preserve existing routes or provide explicit
redirects when a new route becomes canonical. Do not publish dead navigation.

The registry remains the identity and selection authority. A registered Work,
a selected Release, a source candidate and an admitted runtime capability are
different states. Where a Work is registered but outside the selected Snapshot,
show that clearly instead of silently changing selection to make a page look full.

## 5. Page families and required content

| Family | Reader's job | Required content and composition |
| --- | --- | --- |
| Root ecosystem front door | Understand SISO and choose where to go | Purpose; useful section counts; featured entry points; the connected ecosystem loop; concise human and agent start routes. Keep the full catalogue reachable without making the first viewport a wall of registry metadata. |
| Section and catalogue | Find relevant work | Section purpose, scope, real counts, search/filter controls, useful summaries, type/maturity/source availability, clear selected-versus-registered state, empty and no-results states. Preserve existing search behavior. |
| Standard module / Work | Understand and use one thing | Section/type/maturity kicker; title and explanatory subtitle; authored “Why it matters”; actual contents; source-backed highlights; relationship map; every relevant repo/locator with visibility; agent entry and commands; evidence, rights and version state. UUIDs and raw receipts belong below the primary explanation. |
| Project front door | Resume a project or understand its current work | Purpose, current outcome, owner, source/run/test entry, verified current state, next useful work, existing handoff route, parent and satellite repo links, published page URL, material activity. Reuse the project's spine; do not create a second task or handoff writer. |
| Assembly / reusable framework | Follow how independent pieces become a result | Operating loop, inputs/outputs, component responsibilities and boundaries, reusable procedures agents can follow, supported contexts, worked example, verification/admission/release distinctions, unresolved methods. An overall framework Work is not automatically a validated Assembly manifest. Action Model is the key example. |
| Industry index | Find relevant business research | Industry names and scope, what the available research covers, useful discovery routes and source date. Counts distinguish research records from implemented or admitted packs. |
| Industry detail / value research | Understand a workflow and candidate software | Process/workflow map; current marketed capabilities; candidate modules; source and jurisdiction; authority, baseline, metric and counterexample; evidence gaps. Preserve null/unmeasured value. No invented savings, installed-base prevalence or readiness. Use Foundry's exact published contract and data. |
| God Questions index and detail | Understand a decision and its evidence | Question and decision target; research state; proposed criteria/falsifiers; source Works; evidence gaps; current findings and accepted answers separately; next useful work and owner. Registration must not imply research execution. D-20: Mathematics is GQ-011, compute is GQ-023; private reservations stay private. |
| Now / activity | See who is doing what and how current it is | Dated public-safe owner/runtime observations, task/outcome summaries, repo activity and links. Separate runtime status, owner report and verified completion. Show coverage and unavailable/stale observations; never invent “live” state from an old Event. |
| Private Work stub | Understand why something exists and how access works | Public-safe purpose, owner, relationship context, explicit private badge and access boundary. No private receipts, conversation text, client details, machine paths or credentials. SISO Source is the example. |
| Document / research reader | Read a substantial source without losing orientation | The same shell, breadcrumb, title, description, useful contents navigation, preserved anchors, readable prose/tables/diagrams, source and date. Keep the existing authored substance. |
| Release / Snapshot / Assembly record | Inspect what is actually pinned | Exact version, scope, source locators, evidence, distribution and rights states, changed/preserved selection, contextual composition. Never make the UI a new writer of immutable history. |
| Source inventory / promotion | Inspect candidates and next gates | Candidate versus accepted identity, ownership target, evidence, blockers and next gate. No automatic promotion or payload copy to fill a visual card. |

Page depth is judged by useful questions answered, not by adding words. A short
page can be complete for a small thing; a complex framework cannot be reduced to
its name, summary and a handful of links. Missing content should become explicit
authoring work, never fabricated detail.

## 6. Reusable page modules

Design these once, then compose the families above:

- Global CRM shell, grouped navigation, search and collapse control.
- Page heading, breadcrumb, purpose/subtitle and meaningful state badges.
- Authored reasoning block with source/interpretation distinction.
- Ecosystem loop and typed relationship map, with accessible text equivalents.
- Repository and satellite cards with public/private/access/rights state.
- “Sauce” cards: 3–7 genuinely useful assets, examples, datasets or receipts.
- Contents/capability list and a procedure or workflow sequence.
- Agent quick-start panel: entry file, actual commands, owner and verification.
- Evidence/limitations/version panel; facts and proposals visibly distinct.
- Activity strip with observation date and coverage.
- Searchable catalogue cards/table and truthful empty/blocked states.
- Related work / next reading; no unrelated recommendation filler.

The ecosystem loop must make the connections legible: clients fund compute;
owners build industry systems; packs/code enter the Library; people and repos
feed Foundry; questions turn evidence into breakthroughs; improved systems and
packs create better client outcomes. Each node links to a real destination.
This is the operating thesis; show measured results only where evidence exists.

## 7. Source and implementation map

| Concern | Owning implementation / input |
| --- | --- |
| Page generation and shell selection | `scripts/build.mjs` (`nav`, `page`, `homePage`, `workPage`, `moduleReading`, `emit`) |
| Existing content styling / behavior | `src/site/assets/styles.css`, `reading.css`, `app.js` |
| Shared rail package | `siso-shell`, pinned in `package-lock.json`; current pilot requires replacement against CRM reference |
| Work content and relationships | `registry/works/`, existing `reading` contract in `schemas/work.schema.json` |
| Version/selection/history | `registry/releases/`, `snapshots/`, `assemblies/`, `events/` |
| Current human/agent data | generated `catalog.json`, `estate.json`, `intelligence.json`, Work dossiers |
| Industry/valuation reader | Foundry integration in `scripts/build-industries.mjs`, `research/industries/manifest.json`, producer source references |
| Existing authored reasoning | `docs/`, especially mission, knowledge model, Foundry intelligence, questions and operating maps |
| Registry and publication tools | `bin/gls`, `docs/gls.md`, installed `publish` skill |

The incoming Action Model Work must keep its public Blueprint and private source
locator distinct, retain the connector research Work, and declare contextual
Research/Foundry/Knowledge/People relationships without claiming live integration
or admitting any payload. Use it to design the framework-family page.

## 8. Acceptance and delivery

1. Establish one clean CRM reference fixture and screenshots; document the exact
   source version and intentional Library adaptations. Visual similarity by
   assertion is insufficient.
2. Design the complete family/component map above. Build representative root,
   Work, framework/project, industry and question views, then apply the shared
   frame to all existing routes and document readers.
3. Check expanded and collapsed navigation, Cmd/Ctrl+K, focus, direct deep links,
   refresh and saved preference. Verify no duplicated shell and no missing rail.
4. Check 2000×1250 desktop and a narrow mobile viewport, plus keyboard, 200% text
   enlargement, reduced motion, no-JS and storage-denied behavior. Horizontal
   scrolling belongs inside large diagrams/tables, not the whole document.
5. Run the registry/link/privacy gate. Add route-family coverage and actual visual
   comparison checks. Replace the old pilot-isolation assertion. A green build
   alone does not pass design acceptance.
6. Verify data semantics: all displayed counts come from inputs; private/unknown
   values remain private/unknown; candidate/registered/selected/admitted states
   remain distinct; existing evidence and identifiers survive.
7. Deliver the live URL, representative before/after screenshots, source commit,
   checked route matrix and exact remaining content/data gaps. Publish through
   the existing play only after verification and within the adopted write scope.

Prefer the existing static generator and dependency-light assets. Keep every
build/server under the 2 GB machine constraint; no uncapped dev server. Do not
restart research, source capture, fleet allocation or client operations for this
UI task. Coordinate source edits and reserved paths before parallel work.
