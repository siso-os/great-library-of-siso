# Architecture: a small operational layer over durable questions

Status: implementation proposal and testable reference tooling, 7 September 2026.
This is not an accepted answer to GQ-009 and does not change any question.

## Source-derived starting point

The existing [question model](../research-question-model.html),
[research loop](../question-driven-research.html) and
[constitution](../god-questions-infrastructure.html) already distinguish identity,
evidence, authority, execution and learning. The model explicitly keeps the first
method in the Library instead of inventing a second registry. The
[task convention](../../.agents/tasks/README.md) assigns tasks to their owning
systems, not `registry/tasks/`.

The GQ-009 contract itself identifies cold reconstruction, cross-system receipts,
three-question evaluation and decision impact as gaps. The engineering diagnosis
here is narrower: turn those existing contracts into a small executable input/
return protocol before adding a service. This is an inference from source review,
not a measured claim that the new design saves attention or improves decisions.

## First-principles design choices

1. **Persist the work, not a supposedly immortal agent.** The reproducible unit is
   a pinned frame plus bounded task plus receipts. Models and sessions can change.
2. **Give different truths different owners.** A Work identifies the question; a
   task owns work status; a run records one attempt; evidence review judges claims;
   a Release preserves an accepted answer. None can promote itself into another.
3. **Automate mechanical errors before intellectual judgment.** Detect mismatched
   IDs, stale writers, missing references, altered artifacts and unaccounted cost.
   Do not pretend a schema can decide whether an argument is sound.
4. **Make simple prompts front doors, not vague delegation.** A short user prompt
   resolves to the actual frame, owner, bounded brief and role-specific return.
   The user does not need to paste the portfolio into every agent.
5. **Spend on uncertainty that can change a decision.** A collector is not progress
   unless its evidence reaches a useful consumer. A negative result can be valuable.
6. **Prefer reversible increments to a system-wide rewrite.** Preserve all question
   records and immutable history byte-for-byte. Add compatibility tooling first;
   retire old paths only after a real consumer comparison and owner agreement.

## What is implemented here

`FRONTIER.md` is the common agent entrypoint. `scripts/frontier.mjs` compiles a
source-pinned packet from the live checkout and checks append-only, digest-linked
attempt receipts. Two JSON schemas describe the brief and phase outputs; the
bundled validator also enforces identity, progression, evidence references,
artifact paths, cost accounting and critique targets. Tests use adversarial
synthetic cases and the actual checkout's question records when run there.

No external package is added. This is deliberately not an agent SDK: it performs
no model calls, remote scheduling, deployment, database write or evidence admission.
It is a protocol/checking adapter, not a new independently operated service.

```text
Existing Library Work --------------------> pinned question context
Existing owner task + verified authority --> bounded brief
                                                   |
                            current agent / approved runtime adapter
                                                   |
                 research -> critique -> synthesis -> owner handoff
                     |           |                         |
             owner-held sources  +-- revise                |
                     |                                     |
           Foundry / Knowledge / Evidence Engines <--------+
                                                   |
                            existing Library review/release process
```

The arrows describe contracts. They do not claim every cross-system endpoint is
implemented or currently connected.

## Alternatives examined

| Alternative | Attractive property | Why it is not the default |
|---|---|---|
| More prose and one prompt per question | Very cheap initial setup | Does not mechanically detect stale frames, dropped returns or contradictory review labels |
| Dedicated repo, site and daemon per question | Apparent isolation | Duplicates setup and operating state without proving independent release needs |
| A new universal multi-agent framework | Integrated scheduling and provider calls | Adds another runtime owner and couples research identity to execution before access/cost/consumer contracts are proved |
| Thin packet/receipt adapter over existing owners | Portable, inspectable, testable, no new service | Cannot enforce remote budgets, authenticate actors or judge truth; those remain explicit external gates |

The last option is chosen for this implementation. The choice is falsified if a
cold agent cannot recover the right work, if the ceremony costs more than the
errors prevented, or if the existing evidence and task owners cannot consume the
returns without incompatible manual translation.

## External research and what was actually adopted

Primary sources reviewed 7 September 2026; implementation is original, not copied
from these projects. These observations are not SISO performance measurements.

- [Anthropic, Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)
  distinguishes predictable workflows from dynamically directed agents and advises
  adding complexity only when useful. Adopted: explicit stages with adaptive
  research inside each bounded task. Not adopted: model recommendations or a new SDK.
- [Anthropic, Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system)
  describes benefits for independent search directions alongside coordination and
  token costs. Adopted: scoped worker returns and aggregation of all child effort.
  Not adopted: its reported performance or token multipliers as SISO facts.
- [LangGraph, persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
  and [interrupts](https://docs.langchain.com/oss/javascript/langgraph/interrupts)
  make checkpoints and replay behavior explicit. Adopted: resumable, inspectable
  state and no automatic replay of external effects. No LangGraph dependency or
  equivalent distributed durability guarantee is claimed.
- [MCP security best practices](https://modelcontextprotocol.io/docs/2025-11-25/tutorials/security/security_best_practices)
  treats authorization and token boundaries as security responsibilities, not
  implications of tool availability. Adopted: a reference is not authority,
  credentials stay out of packets, and runtime permissions remain external.

## Promotion gates, not completion claims

First test source integrity and local replay. Then evaluate three heterogeneous
questions: GQ-014 upstream selection, GQ-012 cold intent recovery, and GQ-023
accepted-work accounting. Use genuinely pending decisions, freeze baselines and
compare equal task scope and full effort. Include a self-review control, interrupted
pickup, failed source access and a no-change outcome. Independent evaluators must
read actual sources and artifacts, not just this checker output.

Only after those results should an existing execution owner integrate a sustained
adapter. Only after repeatable independent adoption requires its own release
lifecycle should the method be considered for a separate Work/repository. This
change creates neither, and it leaves all accepted Releases and Snapshots intact.
