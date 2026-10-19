# Frontier operating kit — implementation handoff

Question scope: GQ-009 operating mechanism; reusable across the existing public
portfolio. GQ-014 is the worked decision shape, GQ-012 the recovery evaluation and
GQ-023 the accounting evaluation. GQ-011 remains the linked UNSOLVEABLE record.

Repository: `sisodias/great-library-of-siso`.
Source base: `a6cfb54152ba7cf08e258ff7fd43159ff97ab562`.
Implementation branch: `agent/frontier-operating-kit-20260907`.
The enclosing commit and pull request carry the actual changed-file and CI receipt;
this is a module handoff, not a replacement for the repository owner's handoff/task.

## Delivered source

A common `FRONTIER.md` agent entrypoint; bounded brief and phase-output schemas;
an offline compiler/replayer/checker; role and owner-adapter instructions;
a decision-value allocation procedure; a synthetic worked example; adversarial
tests; and integration of the new test into the existing full verification gate.

No question Work, title, wording, state, ID, Release, Snapshot, Event, private
protocol, corpus or upstream source repository is changed. No new repository,
agent, scheduler, model route, API account, live acquisition or deployment is part
of this contribution. Existing task and source-owner boundaries are preserved.

## Verification and limits

The focused suite runs on a real local Node.js 22 runner with synthetic fixtures
and a test-only reconstruction of the uploaded public question snapshot. This is
not a fresh full checkout: the local clone failed on GitHub DNS resolution.
Run `node tests/frontier.test.mjs` on the actual checked-out commit, then the
repository's required Node.js 20 `npm ci && npm run verify` gate. The pull request's
CI result is the authoritative fresh-checkout gate, not this prose.

Structural replay, digest and boundary tests do not establish factual correctness,
independent reviewer identity, real task savings, distributed durability, current
runtime access, an accepted research answer or consumer adoption. No source terms
or reviewer independence are authenticated by self-reported packet fields.

## Publication and ownership gate

This is a review-branch implementation, not an active parallel runtime or takeover
of an existing Library maintainer. Do not treat the branch as a canonical main
reservation. Any later parallel implementation must first follow the Library's
main-visible non-overlapping Event rules. The existing root README reservation
and unrelated work are preserved.

Main has a push-triggered Pages deployment workflow. Merging and deployment are
separate acceptance decisions; no workflow configuration is changed to bypass
them. Raw run packets and journals remain owner-held even when the tooling is
public. Do not upload the reconstructed test snapshot or local run artifacts.

## Next action

Review the exact patch and fresh-checkout CI. Then have the existing owner run a
bounded cold-agent pickup and pending-decision comparison using GQ-014/GQ-012/GQ-023,
with real source reads and actual effort accounting. Promote the mechanism only
when those observations justify its overhead. Keep GQ-009 researching until its
own evidence and answer-acceptance contract is met.
