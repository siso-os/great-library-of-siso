# Library UI renewal: source, composition and acceptance

> **Superseded, 9 Oct 2026.** The Library people read is now the reader in [`reader/`](../reader/README.md) (spec: [`reader/SPEC.html`](../reader/SPEC.html)): every doc on shelves with search, inside Agent Base's Estate and on a private Worker. This file is the September record for the older public site; its links and evidence still hold.


Status: implementation proposal and review-branch documentation, 7 September 2026.
This does not supersede an accepted ADR, appoint a replacement owner, create a
parallel task system, or certify a deployment. The binding design brief remains
[library-ui-spec.md](library-ui-spec.md), read in full for this review.

## 1. The outcome, before the components

The existing brief asks a reader to understand what is valuable, why it matters,
how pieces connect and what can actually be used. It asks agents to find the
owning source, entry instructions and evidence without reconstructing all context.

Design synthesis proposed here: **understand -> choose -> use -> verify**.
This is an interpretation of the brief, not a replacement mission statement.
A page succeeds when it answers the reader's task with truthful, useful content;
page count, component count and a passing build do not establish that outcome.

Preserve the [Library model](../README.md): a Work is a stable identity, a Release
is an immutable evidenced version, a Snapshot selects a named view, an Assembly
composes independent Works, and a Source Inventory holds candidates awaiting gates.
Foundry owns discovery, Knowledge owns corpus/retrieval, Evidence Engines own
source-grounded transformation, and project owners retain implementation/runtime
responsibility. The Library owns public identity, lineage and reading projections,
not those other systems' source payloads or task queues.

## 2. One source authority for each concern

| Concern | Owning source | What the UI may do |
| --- | --- | --- |
| Work identity and current description | `registry/works/` | Explain and link the record; preserve its ID |
| Exact evidenced version | `registry/releases/` | Show the manifest's evidence and limits, not infer rights |
| Current named selection | Highest numeric `registry/snapshots/whole-library-v*.json` | Resolve the pinned Releases and preserve unaffected selections |
| Composition | `registry/assemblies/` | Explain contextual responsibilities without inventing containment |
| Candidate promotion | `registry/source-inventories/` | Show evidence, owning target, blocker and next gate |
| Ownership and change history | `registry/events/`, projected to `site/intelligence.json` | Show dated public observations; do not infer a live owner |
| Shared presentation | `sisodias/siso-shell`, `shell/`, `parts/`, `templates/` | Compose a reviewed, exactly pinned version |
| Library generator and authored readers | `scripts/build.mjs`, `scripts/build-industries.mjs`, `docs/` | Generate readers; never hand-edit generated Work pages |
| Consumer dependency | `package.json` and `package-lock.json` | Pin the selected source exactly and copy assets at build time |
| Served artifact | Existing verified publication path | Report deployment only from an exact artifact/readback receipt |

Sources: [AGENTS.md](../AGENTS.md), [CONTRIBUTING.md](../CONTRIBUTING.md),
[UI spec §§3-7](library-ui-spec.md), [gls lifecycle](gls.md).
A host remains a replaceable projection; a repository and a Work are not necessarily
one-to-one. The existing registry, rather than another consumer inventory, remains
the control plane. The bank's generic reuse examples do not supersede the Library's
selected-Release, pinned-build policy.

## 3. Source baseline, not a live-service claim

Inspected GitHub source revisions:

- Library: `a6cfb54152ba7cf08e258ff7fd43159ff97ab562`.
- Shell: `10895acfbd79bfa21698c2ba4cd160e2410ac141`.

At that Library revision, V40 selects shell `0.1.0+adea886`; `package.json` and
its lockfile root declaration pin `adea8860b50324f283637a596c5a41367ece9776`.
Release `0.2.0+9694a54` is registered separately. Its artifact identifies
`9694a542b5fbd34799f08d1e6afff22e869f0e91`, not the later shell source above.
Do not retarget that immutable manifest to newer code. Review the desired source,
record an appropriate successor Release, then select and re-pin deliberately.

Exact baseline sources:
[Snapshot](https://github.com/sisodias/great-library-of-siso/blob/a6cfb54152ba7cf08e258ff7fd43159ff97ab562/registry/snapshots/whole-library-v40.json),
[selected shell manifest](https://github.com/sisodias/great-library-of-siso/blob/a6cfb54152ba7cf08e258ff7fd43159ff97ab562/registry/releases/siso-shell-adea886.json),
[registered bank manifest](https://github.com/sisodias/great-library-of-siso/blob/a6cfb54152ba7cf08e258ff7fd43159ff97ab562/registry/releases/siso-shell-9694a54.json),
[consumer declaration](https://github.com/sisodias/great-library-of-siso/blob/a6cfb54152ba7cf08e258ff7fd43159ff97ab562/package.json).
These source facts do not establish current installation, deployment or visual acceptance.

## 4. Acceptance mistakes that must not survive the redesign

The following are source observations, not an eyes-on assessment:

| Observation | Source | Required correction |
| --- | --- | --- |
| Shell application is conditional on `reading-page` | `scripts/build.mjs`, `page()` | Separate universal navigation coverage from authored Work reading content |
| The test asserts pilot isolation | `tests/reading-surface.test.mjs` | Replace that assertion with expanded route-family coverage when rollout lands; do not merely delete protection |
| The bank determines `built` by template-file existence, then labels a metric `built and published` | `siso-shell/bin/lib/data.mjs`, `built()` and `galleryData()` | Show source-present/build-tested/deployed/accepted as distinct evidenced observations |
| A template's `Done when` criterion is added to facts when its file exists | `siso-shell/bin/lib/data.mjs`, `detailData()` | Keep acceptance criteria separate from observed verification results |
| Build generation writes family example files and READMEs as well as output | `siso-shell/bin/build-site` | Review source-authoring versus generated-output boundaries before extending the builder; preserve authored files |
| Missing URL, owner and relationship inputs are described as absence | `templates/U4/template.html`, `parts/map.html` in the bank | Render unknown observations, not claims that deployments, owners or relationships do not exist |
| Relationship descriptions are in SVG tooltips; labels are clipped | `siso-shell/bin/lib/helpers.mjs`, `mapSvg()` | Supply readable full-label, typed relationship text beside the visual map |

Bank sources at the reviewed revision:
[data derivation](https://github.com/sisodias/siso-shell/blob/10895acfbd79bfa21698c2ba4cd160e2410ac141/bin/lib/data.mjs),
[builder](https://github.com/sisodias/siso-shell/blob/10895acfbd79bfa21698c2ba4cd160e2410ac141/bin/build-site),
[project template](https://github.com/sisodias/siso-shell/blob/10895acfbd79bfa21698c2ba4cd160e2410ac141/templates/U4/template.html),
[map](https://github.com/sisodias/siso-shell/blob/10895acfbd79bfa21698c2ba4cd160e2410ac141/parts/map.html),
[map renderer](https://github.com/sisodias/siso-shell/blob/10895acfbd79bfa21698c2ba4cd160e2410ac141/bin/lib/helpers.mjs).

The component provenance record also explicitly distinguishes installed-source
references from preview-derived patterns for repository cards, reasoning and
quick-start. Preserve that distinction; a source URL or preview is not proof of
source equivalence or a redistribution grant. See
[parts/SOURCES.md](https://github.com/sisodias/siso-shell/blob/10895acfbd79bfa21698c2ba4cd160e2410ac141/parts/SOURCES.md)
and [SECURITY.md](../SECURITY.md).

## 5. Compose by the reader's task

The following is a proposed composition map implementing the existing 13-family
contract, not a second registry of templates or a claim these views are delivered.

| Spec family | Lead with | Keep available below or beside it |
| --- | --- | --- |
| Root ecosystem front door | Purpose, useful entry routes, connected operating loop | Catalogue, source-backed counts, agent start |
| Section and catalogue | Scope, search/filter, useful summaries | Availability/maturity, selected versus registered, empty states |
| Standard Work | What it does, why it matters, source/usage entry | Contents, useful assets, typed relationships, evidence and rights |
| Project front door | Current outcome, owner observation, resume entry | Source/test/handoff routes, progress and dated activity |
| Assembly / reusable framework | Operating loop, inputs/outputs, responsibilities | Procedures, supported contexts, worked example and admission/release distinctions |
| Industry index | Research coverage, source date, discovery routes | Counts of research records rather than implementation claims |
| Industry detail / value research | Workflow and candidate capabilities | Jurisdiction, evidence, baseline, metric, counterexample and unknown values |
| God Questions index/detail | Question, decision target and research state | Criteria/falsifiers, findings versus accepted answers, evidence gaps and owner |
| Now / activity | Observation time and coverage | Runtime observations, owner reports and verified completion kept separate |
| Private Work stub | Public-safe purpose and access boundary | Owner/context links without exposing restricted payloads |
| Document / research reader | Title, description, contents and readable substance | Source/date, preserved anchors and shared navigation |
| Release / Snapshot / Assembly record | Exact version, selection and scope | Source locators, changed/preserved selection, evidence and rights |
| Source inventory / promotion | Candidate state, owning target and next gate | Evidence and blockers; no automatic Work creation |

Two semantic gaps remain in the reviewed bank: the Assembly/framework walkthrough
and Source inventory/promotion. U12 is record inspection, not the framework
operating method; U18 is a source reader, not a promotion queue. Action Model is the
spec's framework example. Its existing Work remains metadata, not an automatically
validated Assembly or admitted payload. Sources: UI spec §5 and bank
[U12](https://github.com/sisodias/siso-shell/blob/10895acfbd79bfa21698c2ba4cd160e2410ac141/templates/U12/template.html) /
[U18](https://github.com/sisodias/siso-shell/blob/10895acfbd79bfa21698c2ba4cd160e2410ac141/templates/U18/template.html).

Design recommendation: put the useful explanation and entry action before UUIDs,
raw receipts and long history. Use a coherent CRM frame and task-specific
compositions, not the same long stack of cards for every reader. Retain existing
substance and the evidence/activity/catalogue modules; do not add motion or cards
merely to make the page busier.

## 6. Reproducible source diagnostic

```sh
node scripts/audit-ui-integration.mjs
node scripts/audit-ui-integration.mjs --root <library-checkout> --strict
node --test tests/ui-integration-audit.test.mjs
```

The tool reads registry source, chooses the highest numeric Snapshot, resolves its
Release hashes, compares the selected shell commit with package and lock entries,
counts supplied reading objects and flags the known pilot-isolation pattern.
It prints JSON to stdout and never writes registry, site or state files. Its output
is disposable derived evidence, not another task/consumer registry. It reports
installed, deployed, rendered coverage, CRM fidelity, visual acceptance and live
owner presence as unverified.

Exit 0 means a report was produced; `--strict` returns 1 for failing source checks;
2 means malformed/missing/bounded-out inputs. Other registered Releases are
informational, never a command to select the newest one. Missing reading objects
are an authoring inventory, not proof that every Work needs identical content.
Pattern checks are not a JavaScript interpreter or a substitute for route tests.
The fixture suite is included in the existing `scripts/verify.mjs` sequence. The
strict rollout diagnostic is deliberately separate: its known baseline findings
must be resolved by implementation, not hidden to make a build green.

## 7. Delivery sequence and ownership

1. Recover the existing Library and shell owner records; reconcile current local
   work and unpublished commits before integration. Do not replace an owner based
   on missing observations. This isolated review branch does not operate a runtime.
2. Before any parallel implementation, publish the required `initiative_started`
   Event on canonical main with branch and non-overlapping reserved paths, following
   CONTRIBUTING. No active reservation or additional worker is claimed by this document.
3. Establish an exact current-v2 rendered baseline and one authorized coherent CRM
   donor fixture. Keep private donor material and private protocol context private.
4. Have the existing shell owner land bounded shared-part/navigation improvements;
   have content owners provide approved public reading content. Separate shared CSS
   ownership from page-family composition. Do not silently fill evidence gaps.
5. Complete the two missing semantic families and expanded route coverage, then
   review a precise source revision. Publish the appropriate immutable Release,
   successor Snapshot and matching consumer pins, preserving other selections.
6. Run `npm ci && npm run verify` and the UI acceptance matrix. Only the existing
   authorized publication path may publish the exact verified artifact. Record
   source commit, build/route evidence, screenshots and live readbacks separately.

### Acceptance matrix: UI spec §8

- One CRM source revision, retained notices, intentional Library adaptation recorded.
- Approximately 20px visible collapsed handle with usable hit target; no clipped icon row.
- One navigation/main landmark, skip link, current-page state, retained URLs/anchors.
- Click and `[` toggle, saved preference, Cmd/Ctrl+K, Escape and restored focus.
- Direct deep links and refresh; no-JS navigation and unavailable-storage behavior.
- Desktop 2000×1250 and narrow mobile, keyboard, 200% text and reduced motion.
- No document-wide horizontal overflow; large diagrams/tables scroll internally.
- Representative root, Work, framework/project, industry, question and document routes.
- Public/private/unknown/candidate/registered/selected/admitted semantics preserved.
- Actual before/after rendered comparison on the reviewed revision, not v1 approval reused for v2.
- Builds/servers remain within the existing 2 GB constraint.

## 8. Verification receipt and remaining limits

This review added the diagnostic and 30 passing Node tests over explicit synthetic
filesystem fixtures. Tests cover exact pins, numeric Snapshot ordering, hash drift,
missing/duplicate selections, lock-resolution drift, missing observations, error
handling and unchanged input bytes. They were executed on Node 22.16.0 in an
isolated sandbox; the repository's Node 20 full gate remains a separate required
check. This receipt does not claim a full current-registry audit run, full Library
build, live-site inspection, donor-source verification or visual approval.

No existing registry record, Release, Snapshot, generated page, production host,
provider route or owner runtime is changed by these new diagnostic/documentation
files. The only shared implementation adjustment in this proposal is adding the
new fixture suite to the existing verification sequence, without removing a check.
