# Library reading and operating integration

> **Superseded, 9 Oct 2026.** The Library people read is now the reader in [`reader/`](../reader/README.md) (spec: [`reader/SPEC.html`](../reader/SPEC.html)): every doc on shelves with search, inside Agent Base's Estate and on a private Worker. This file is the September record for the older public site; its links and evidence still hold.


This review branch connects the existing registry and readers to the shared CRM
shell and read-only `gls` discovery. Local implementation, selected source and a
production deployment remain separate observations. Public publication requires
its own authority and exact readback receipt.

## Source ownership

The registry owns identities and evidence. The Library generates HTML, catalog
and dossiers. Each project owns its source, tasks and acceptance; Project OS
owns reusable project execution machinery. The existing `.agents/tasks/` records
remain the Library task surface. Neither the website nor `gls` creates another
task store or dispatches an agent.

`siso-shell` owns the rail, tokens, parts and template bank. This consumer pins
`10895acfbd79bfa21698c2ba4cd160e2410ac141` and copies its shell assets at build
time. Its source stylesheet records the CRM donor hashes; tokens match that
donor exactly. Lucide attribution remains in `icons.mjs`. There is no new general
redistribution grant for the whole bank.

## Frame and content

Every HTML reader uses the shared frame independently of authored `reading`
content. Route and heading data provide current-page state and contents links.
The explicit Library adaptation is a 20px collapsed handle with a 44px toggle
target; the donor's compact icon rail remains 52px. Generated markup records
both. Library layout/focus behavior stays separate from unchanged vendor assets.

Authored HTML keeps its body, links and anchors. Native CSS nesting scopes its
rules away from the rail; unreviewed global at-rules fail the build. Browser
verification remains necessary: source-string checks do not prove CSS behavior.

A top-level `404.html` addresses the observed missing-route homepage fallback.
Without it, Cloudflare Pages treats the artifact as an SPA and routes unknown
paths to `/`, including missing JSON paths. See
[Cloudflare's serving behavior](https://developers.cloudflare.com/pages/configuration/serving-pages/#not-found-behavior).
Production behavior is not claimed before publication/readback. HTTP 200 alone
does not prove that the intended Work or JSON dossier was served.

## Operate through existing contracts

The `/use/` reader explains discovery, owner entry, task inspection, contribution
and upgrades. `/llms.txt` is the short agent router. Catalog entries and dossiers
share selection and owner-entry fields. Run/test commands appear only when
authored; missing instructions and private visibility stay explicit.

```sh
node bin/gls search "agent runtime"
node bin/gls inspect siso-agent-base
node bin/gls tasks
node bin/gls task TASK-0007
```

Search is bounded; inspect resolves an exact slug or Work ID. Source digests and
the registry file set detect stale projections and newly added records. Reads
do not install, claim, mutate or publish. Task inspection exposes the full scope,
acceptance and previous evidence. Read status before working: a completed task
is a receipt to inspect, not an instruction to repeat it.

Action Model retains its public method/project readers and private admission
boundary. Harness Lab remains private-source metadata, not a selected payload or
a claimed savings multiplier. The existing Harness proposal is carried forward
from PR #21; the source diagnostic and tests come from #24. Shell #1's observation
and map-text fixes were reviewed separately, not silently treated as a published
dependency.

## Upgrade and verify

Review exact owning source, register an immutable Release, select it in a
successor Snapshot, re-pin the consumer, regenerate and verify it. Projects share
a source without every live deployment changing unexpectedly. V41 replaces only
V40's shell selection; 31 other Releases and the Assembly are preserved. The
successor shell manifest retains pending whole-bank rights and bundled notices.

```sh
node tests/gls-read.test.mjs
node tests/reading-surface.test.mjs
node scripts/audit-ui-integration.mjs --strict
npm run verify
```

The route contract checks every HTML frame and source document parity. Browser
acceptance covers desktop/mobile, collapse/search/focus, direct routes, no JS,
denied storage, reduced motion and enlarged text. Accepted implementation and
live publication receipts belong in the project run and current state; passing
source tests cannot replace either.
