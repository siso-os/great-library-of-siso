# Agent guide — The Great Library of SISO

**In one line:** Public registry and reading surface cataloguing SISO Works, their Releases, Assemblies and Source Inventories, with a command-line search and inspect tool. District: `Great_Library_of_SISO` (`~/SISO_Workspace/Great_Library_of_SISO`).

This repository is the public registry, learning record, and generated reading surface for The Great Library of SISO. GitHub records public truth; a laptop checkout is replaceable infrastructure.

## The building (on a SISO machine)

On Shaan's machines this folder is the whole Library, not just this catalog repository. The
collections sit beside the catalog as their own repositories (this repo ignores them):

| Folder | What it is |
| --- | --- |
| `knowledge/` | SISO Knowledge: books, graph, research pipelines, queries (repo `siso-knowledge`) |
| `people-graph/` | the People Graph (repo `siso-people-graph`) |
| `foundry/` | the Foundry research engine (repo `siso-foundry`) |
| `banks/` | reusable banks: `siso-component-bank`, `siso-repo-bank`, `siso-ui-base`, `siso-shell` (HTML page templates) |
| `works/` | individual Works: `siso-stargate-library`, `erdos`, `siso-evidence-engines`, `unfuck-the-project`, ... |

The catalog (`registry/`, `site/`, `bin/gls`) describes Works; the folders above hold them.

## Find the owning source, then do the work

The Library is a discovery route, not a required review phase for every SISO task.
If the request already names an owning repository, enter it and follow its instructions.
Otherwise use `node bin/gls search "<capability>"` or the catalog, open the relevant Work's
dossier, and follow its source link. Read `README.md` or `docs/onboarding.html` when the
identity or ownership is unclear. Browsing does not require installing dependencies,
running the Library suite, or reading every snapshot and event.

For work **on this Library**, read `CURRENT_STATE.md` and the relevant reservations in
`site/intelligence.json`; read `CONTRIBUTING.md` and `SECURITY.md` before changing or importing
source. Consult the selected Snapshot for release/selection changes, and the relevant schema
for registry changes. Once the owner, requested outcome and constraints are clear, implement.
An action request is not complete at an audit, recommendation, or review-ready first pass.

Verify the changed behavior and repair failures caused by the change. Run `npm run verify`
for registry, generator or publication changes; install dependencies with `npm ci` when needed.
For instruction-only edits, check the changed instructions and their paths. Reuse passing
evidence while its inputs and relevant state are unchanged. Another review needs a concrete
unresolved risk or an explicit task requirement; do not add a reviewer for an ordinary edit.

## Sources of truth

| Question | Read or change |
| --- | --- |
| What is a thing? | `registry/works/` |
| What exact version was evidenced? | `registry/releases/` |
| What is selected now? | latest immutable record in `registry/snapshots/` |
| How do Works operate together? | `registry/assemblies/` |
| Where is mixed source awaiting a decision? | `registry/source-inventories/` |
| What is active, what changed, and who owns the lane? | `registry/events/` and generated `site/intelligence.json` |
| Why was a boundary chosen? | `registry/decisions/`, `docs/`, and evidence linked from records |
| What does the public site show? | generated `site/`; never hand-edit generated Work pages |

The registry data is authoritative. The website, future CLI, and future MCP server are projections over the same contracts—not parallel catalogs.

The committed `.agents/owners.log` is public metadata: record source commits,
verification and repository-relative evidence only. Runtime migrations, session
locators and machine paths belong in ignored `.local/` or the private owner
handoff, never in that public log.

## Frontier Question work

For a bounded question investigation, read [FRONTIER.md](FRONTIER.md). It is the
shared entrypoint for planning, source research, critique, synthesis and recovery
across agents. The offline packet/receipt tooling references the existing Work and
owner task; it neither changes question state nor grants execution or publication
authority. Keep run payloads owner-held. GQ-011 remains linked to UNSOLVEABLE;
GQ-023 is compute/delegation. All repository rules below still apply.

## Local checkout contract

The preferred machine-neutral checkout is `$SISO_WORKSPACE/Great_Library_of_SISO`. If `.local/LOCATION.md` exists, it records the exact checkout for that machine. Never publish machine-specific paths.

Related source repositories may be checked out anywhere. Their identity comes from stable Work IDs and exact public Release locators, not local directory nesting.

## Release and publication sequence

Use this sequence when changing a selected source release, Snapshot or published site.
An ordinary source edit does not require a new Release/Snapshot or a separate approval phase.
Keep immutable records, source ownership and publication checks intact.

1. Read `site/intelligence.json`. Before parallel work, publish an `initiative_started` Event with branch and reserved paths.
2. Read and classify source; stop on private, client, credential-bearing, or unclear material.
3. Change the owning source repository and verify it there.
4. Publish an exact source commit.
5. Add a new immutable Release Manifest; never rewrite an accepted Release.
6. Add a new immutable Snapshot that replaces the selected release while preserving the rest of the view.
7. Close the Event thread with exact evidence and next actions.
8. Run `npm run verify`, commit, push, and publish the verified `site/` with the publish skill or `npm run deploy:cloudflare`.
9. Record receipts in `CURRENT_STATE.md` when the operating state materially changes.

Use one active maintainer by default. Parallel Library lanes are permitted only when Shaan initiates them and every lane has a non-overlapping reservation Event visible on canonical `main`. Never publish machine-specific worktree paths.

---

The Great Library of SISO — Built by the SISO Open Source Foundation · Funded by SISO Agency.

<!-- siso:district begin -->
- `library` | siso.library | The Great Library: catalog of works, registry, site and bin/gls
- `library/banks/siso-shell` | siso.library.banks.shell | JSON to a finished HTML page: a bank of 25 page templates
- `library/banks/siso-ui-base` | siso.library.banks.ui-base | UI corpus and the UI Box review app
- `library/foundry` | siso.library.foundry | Turns large source corpora into traceable, ranked research knowledge
- `library/knowledge` | siso.library.knowledge | The knowledge system: sources, pipelines, pages, books, graph (content in data blocks)
- `library/knowledge/app` | siso.library.knowledge.app | The SISO Knowledge app: composes the knowledge collections into one searchable place
- `library/people-graph` | siso.library.people-graph | People graph: who is who, linked to books, repos and videos (data in blocks)
- `library/works/books` | siso.imports.book.library | Queryable public-domain book index tooling; bulk books stay outside.
- `library/works/declassified` | siso.imports.declassified.records | Public-record research department tooling and evidence model.
- `library/works/erdos` | siso.library.works.erdos | Erdos problems work (was siso-unsolveable-mathematics)
- `library/works/repo-bank` | siso.library.works.repo-bank | Repo reuse catalog pipeline, GitHub farm tooling and curated prior art; bulk banks stay at pinned source
- `library/works/repo-bank/bank` | siso.library.banks.repo-bank | Repo Bank corpus metadata and historical collection receipts; authored tooling is siso.library.works.repo-bank
- `library/works/siso-evidence-engines` | siso.library.works.evidence-engines | Evidence engines research work
- `library/works/siso-stargate-library` | siso.library.works.stargate | Remote viewing and psychoenergetics research (public mirror archived)
- `library/works/task0001` | siso.products.os.task0001 | SISO Internal TASK-0001 programme archive: control-plane atlas, design directions and evidence.
- `library/works/trader-platform-research` | siso.library.works.trader-platform | Trader platform research and its site
- `library/works/unfuck-the-project` | siso.library.works.unfuck | Whole-project ownership prompt pack for agents
<!-- siso:district end -->
