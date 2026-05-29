---
name: capability-matrix-fill-loop
description: Fill or resume the Foundation Capability Matrix layer by grouping reviewed Surface Registry rows into actor/outcome capability rows, checking coverage and split discipline, evaluating, and recording handoff to Split And Queue.
---

# Capability Matrix Fill Loop

Use this skill when a target repo is creating, refreshing, revising, checking, evaluating, or resuming a Foundation Capability Matrix.

## Source Of Truth

Load only the context needed for the current step:

- target repo `AGENTS.md`
- Foundation `AGENTS.md`
- active target report and run log named by the target repo
- current target `surface-registry-<run-id>.jsonl`
- current target `capability-matrix-<run-id>.jsonl`
- Capability Matrix specs when changing the process/schema or resolving checker/eval ambiguity:
  - `docs/specs/foundation-backfill-capability-matrix.html`
  - `docs/specs/foundation-backfill-capability-matrix-technical.html`
  - `docs/specs/foundation-backfill-capability-matrix-test.html`

## Commands

- Initialize: `npm run foundation:capability-matrix:init -- --repo <repo> --run-id <run-id>`
- Get next target: `npm run foundation:capability-matrix:fill -- --repo <repo> --run-id <run-id> --next`
- Mark reviewed surfaces: `npm run foundation:capability-matrix:fill -- --repo <repo> --run-id <run-id> --surface-ids <surface-id[,surface-id]> --capabilities-json '<json-array>'`
- Check during work: `npm run foundation:capability-matrix:check -- --repo <repo> --run-id <run-id> --phase batch`
- Check handoff: `npm run foundation:capability-matrix:check -- --repo <repo> --run-id <run-id> --phase handoff`
- Evaluate: `npm run foundation:capability-matrix:eval -- --repo <repo> --run-id <run-id>`
- Refresh changed upstream surfaces: `npm run foundation:capability-matrix:refresh -- --repo <repo> --run-id <run-id>`
- Record report state: `npm run foundation:capability-matrix:report -- --repo <repo> --run-id <run-id> --report <active-report>`

## Required Loop

1. Use `--next` to select a pending or failed surface target.
2. Read the selected Surface Registry row and enough nearby ready surface rows to decide whether they belong to the same actor/outcome capability.
3. Group only reviewed ready-for-capability surface rows. Support classifications are evidence, not upstream capability rows.
4. Immediately mark that reviewed group with inline `--capabilities-json`.
5. Do not rely on generated capability files, all-file fill modes, or broad path/domain summaries. The fill command rejects those shortcuts.
6. Run the batch checker often enough that missing formula fields, uncovered surfaces, stale upstream refs, and split issues are fixed before many more rows are marked.
7. Repeat until every ready surface is owned by a `ready-for-queue` or `needs-split` capability row.
8. Run handoff check, eval, and report once the layer is terminal.

## Capability JSON Shape

`--capabilities-json` is an array of row specs for the reviewed surface group. Common fields: `name`, `actor`, `intendedOutcome`, `domainObject`, `actions`, `states`, `rules`, `experience`, `backingContracts`, `failureAndRecovery`, `evidence`, `status`, `confidence`, and optional `upstreamSurfaceIds`.

Use `status: "ready-for-queue"` when the row is exact enough for a queue slice. Use `status: "needs-split"` with `splitReason` and `splitCriteria` when actors, outcomes, objects, state models, permission/rule models, backing contracts, recovery behavior, or verification targets differ.

```json
[
  {
    "name": "Authenticated dashboard review",
    "actor": "Authenticated workspace user",
    "intendedOutcome": "Review current dashboard metrics with clear loading and error states.",
    "domainObject": "Dashboard view",
    "actions": ["Open dashboard", "Review metric cards", "Recover from loading or API errors"],
    "states": ["loading", "loaded", "empty", "error"],
    "rules": ["Protected dashboard routes require an authenticated session"],
    "experience": "User sees dashboard content or a bounded loading, empty, or error state.",
    "backingContracts": ["dashboard screen surface", "dashboard API surface"],
    "failureAndRecovery": ["API failures render error state without exposing protected content"],
    "evidence": ["surface:abc Dashboard page", "surface:def GET /dashboard API"],
    "status": "ready-for-queue",
    "confidence": "high"
  }
]
```

The fill command writes stable IDs, upstream surface references, freshness fingerprints, and evidence references. It replaces prior Capability Matrix rows that overlap the reviewed surface IDs, so include every capability row needed for that reviewed set in the same mark command.
