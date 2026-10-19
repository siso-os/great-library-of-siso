# Frontier Questions — agent entrypoint

Turn a consequential question into a bounded, reviewable research result. Use any
agent that can read sources and save files. Keep the existing question exactly as
written; the Great Library remains its only identity and research-state authority.

**Start with one prompt:**

> Read FRONTIER.md. Work on GQ-014 for the named decision in my request. Recover
> its current canonical record and existing owner/task. Frame the smallest useful
> investigation, then research within my authorized scope. Return source-backed
> claims, counterevidence, a candidate decision and a resumable handoff. Do not
> change the question or claim an accepted answer.

Replace the question ID, not the workflow. When asked only to plan, stop at a
proposed brief. When research is authorized, continue within that authorization;
do not manufacture another approval loop for ordinary source reads. Missing
access is a precise blocker, not permission to pretend a read or run succeeded.

## Read only what you need

1. Read the owning repository's `AGENTS.md` and current owner/task. For this
   repository, retain its cold-start, publication and reservation rules.
2. Resolve the question by `research_contract.question_id` in `registry/works/`.
   Do not infer filenames from IDs. GQ-011 is the linked UNSOLVEABLE programme;
   detailed mathematics stays with that owner. GQ-023 is compute/delegation.
3. Read [PROTOCOL.md](docs/frontier/PROTOCOL.md), then the relevant role below.
   Read the full [architecture](docs/frontier/ARCHITECTURE.md) only for changes
   to the mechanism; do not reload every project or private protocol memo.
4. Use existing source owners through the [adapter boundaries](docs/frontier/ADAPTERS.md).

## Choose the requested role

| Role | Input | Return |
|---|---|---|
| Planner / steward | Question, real decision, existing task and authorization | A bounded brief with baseline, alternatives, acceptance, limits and expiry |
| Researcher | Pinned packet and permitted sources | Source-span references, typed claims, contradictions, gaps and the next discriminating test |
| Critic | Exact research receipt and original sources | Pass/revise/blocked, strongest objections, counterevidence search and honest independence |
| Synthesizer | Research plus its critique | Change/no-change/inconclusive candidate, limits and a digest-checked report |
| Steward at handoff | Candidate and receipts | Return to the original owner/task; identify verification, blocker and next action |

These are roles, not automatically spawned agents. One agent may do several
roles, but self-review stays labelled self-review. A separate context is not
proof of an independent person or an independent evidence family.

## Available commands — Node.js 20 or later

```sh
node scripts/frontier.mjs questions
node scripts/frontier.mjs question GQ-014
node scripts/frontier.mjs prepare GQ-014 --brief BRIEF.json --out .local/frontier/PILOT
node scripts/frontier.mjs next .local/frontier/PILOT
node scripts/frontier.mjs prompt .local/frontier/PILOT
node scripts/frontier.mjs record .local/frontier/PILOT --step STEP.json --expect HEAD_SHA256
node scripts/frontier.mjs check .local/frontier/PILOT
```

The planner writes `BRIEF.json` in the existing owner's private workspace using
[the brief schema](schemas/frontier-brief.schema.json). `HEAD_SHA256` is the exact
head returned by the last `next`/`check`; the empty journal starts at 64 zeros.
Each step follows [the step schema](schemas/frontier-step.schema.json). The
[worked example](docs/frontier/EXAMPLE.md) shows the shapes. These are literal
file arguments, not filenames the tool creates implicitly.

The commands do not call a model, access the network, start a process, schedule a
job, publish, or write a registry record. `prepare` and `record` only write local
attempt artifacts. `--root CHECKOUT` selects an existing Library checkout.
In GitHub-only Chat, use the same protocol through source reads and the existing
owner's approved save path; report any missing runner instead of claiming CLI
verification. Do not commit run artifacts to the public Library.

## Four distinct outcomes

**Source available** is not **task executed**. **Structurally valid receipts** are
not **verified claims**. **A reviewed candidate** is not **an accepted answer**.
**Pushed code** is not **selected, deployed or accepted by a user**.

No command in this kit changes Work, Release, Snapshot, Event or task state.
An accepted answer still needs the owning evidence review and Library release
process. The kit is a compatibility layer over those contracts, not a new
registry, task manager, scheduler, evidence court, or agent service.

For prioritization and sustained operation, read
[ALLOCATION.md](docs/frontier/ALLOCATION.md). For implementation evidence and
remaining gates, read [HANDOFF.md](docs/frontier/HANDOFF.md).
