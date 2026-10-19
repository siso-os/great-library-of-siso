# One bounded upstream decision

This is a synthetic worked shape, not a live mandate, adopted dependency or research
finding. Do not run the example without replacing its placeholders with the actual
owner/task/authorization and an owner-approved future UTC expiry.

## 1. Give a planner a short prompt

> Read FRONTIER.md. Prepare GQ-014 for the pending choice between keeping our
> current search component and a named alternative. Read the actual host and
> current question. Use the existing task and source owners. Make the baseline,
> two alternatives, countersignals, allowed reads and stop conditions explicit.
> Return a proposed brief, not an adoption or deployment.

The planner writes a private `BRIEF.json` using this shape. The deliberately expired
date below prevents treating an example as current permission.

```json
{
  "schema_version": "frontier-brief-1",
  "task_ref": "task:replace-with-existing-owner-task",
  "decision_owner": "replace-with-actual-owner",
  "authorization_ref": "authorization:replace-with-original-receipt",
  "objective": "Compare two named search choices for the actual host",
  "baseline": "Keep the current component; its measured costs are not yet recorded",
  "alternatives": ["Keep the existing component", "Adopt the named alternative"],
  "acceptance": ["Assess the actual call sites, rights, maintenance and exit cost"],
  "stop_conditions": ["Stop when the evidence cannot distinguish the choices without an integration test"],
  "source_scopes": ["Current host interfaces and official upstream source"],
  "allowed_tools": ["owner-approved source reader"],
  "allowed_effects": ["source_read", "local_artifacts"],
  "caps": {"tool_calls": 30, "source_reads": 20, "cash_minor": 0},
  "currency": "USD",
  "expires_at": "2000-01-01T00:00:00.000Z",
  "next_action_on_stop": "Return the unresolved integration test to the existing owner"
}
```

Do not invent baseline measurements. The source-reading limit and zero paid cash
are proposed bounds, not evidence of available account allowance. If the actual
runtime cannot account for a hard cap, report the missing measurement.

## 2. Compile the packet after the actual authorization is checked

```sh
node scripts/frontier.mjs prepare GQ-014 --brief BRIEF.json --out .local/frontier/UPSTREAM-PILOT
node scripts/frontier.mjs prompt .local/frontier/UPSTREAM-PILOT
```

Give the generated prompt to the chosen agent, or continue in the same authorized
chat. The packet contains the real canonical Work ID and contract; no identifier
or question text is copied into the example as a new source of truth.

## 3. Return evidence rather than a declaration of success

The researcher writes `STEP.json` in the approved private workspace. Replace the
synthetic observation with actual read sources. `observed_at` is the real read time;
`revision` is the actual version/digest or an explicit unversioned limitation.

```json
{
  "schema_version": "frontier-step-1",
  "phase": "research",
  "actor": "actual-researcher-identity",
  "session": "actual-session-identity",
  "usage": {"tool_calls": 1, "source_reads": 1, "cash_minor": 0, "tokens": null, "elapsed_seconds": null},
  "artifacts": [],
  "payload": {
    "sources": [{
      "id": "S1",
      "reference": "https://example.org/source",
      "span": "Synthetic example section, not a real citation",
      "revision": "synthetic-example-only",
      "observed_at": "2000-01-01T00:00:00.000Z",
      "independence_group": "synthetic-source-family",
      "rights_state": "public_metadata",
      "summary": "Synthetic example; replace with source-supported metadata"
    }],
    "claims": [{
      "id": "C1",
      "statement": "The source reports a candidate interface; host fit remains untested",
      "kind": "source_report",
      "supports": ["S1"],
      "challenges": [],
      "limitation": "An interface description is not integration evidence",
      "falsifier": "The actual host needs an unsupported operation"
    }],
    "coverage_gaps": ["No host-level integration or removal test has run"],
    "next_discriminating_test": "Compare the candidate operations against the actual call sites"
  }
}
```

Use null for unobserved usage, not the example's zero. A zero cash amount means
observed no paid charge in that phase; do not infer it from a model name.

```sh
node scripts/frontier.mjs next .local/frontier/UPSTREAM-PILOT
node scripts/frontier.mjs record .local/frontier/UPSTREAM-PILOT --step STEP.json --expect HEAD_SHA256
```

Replace `HEAD_SHA256` with the exact returned head, then read `next` again. A stale
head is a concurrency conflict, not a reason to overwrite the existing receipt.

## 4. Critique, synthesize and return

> Read the pinned packet and exact research receipt. Act as critic. Re-open the
> strongest sources and seek counterevidence. Report pass/revise/blocked and your
> actual independence. Do not mutate the research or invent an accepted answer.

Critique payload fields are `target_sha256`, `verdict`, `independence`, `findings`
and `counterevidence_search`. A `revise` verdict returns to bounded research, not
to a new unlimited campaign. A `pass` proceeds to a candidate synthesis.

The synthesizer writes an immutable report below `artifacts/`, computes its actual
SHA-256, and returns the required conclusion, current claim IDs, limitations and
next action. Use the step schema's `synthesis` definition, targeting the critique.
The final `handoff` targets that synthesis and returns to the original task owner.
All steps include incremental usage and actual actor/session metadata.

```sh
node scripts/frontier.mjs check .local/frontier/UPSTREAM-PILOT
```

A successful sequence says `handed_off`, `not_adjudicated`, `not_published`.
The existing owner now decides whether a real integration test is authorized and
whether evidence is ready for adjudication or public metadata review. No source,
question, task, Release or Snapshot is changed by the example.
