---
name: backfill-map-system-capabilities
description: Fill or resume the Foundation Capability Map layer by grouping reviewed Surface / Function Map rows into actor/outcome capability rows, checking coverage and split discipline, evaluating, and recording handoff to Define Spec Jobs.
---

# Backfill: Map System Capabilities

Use this skill when a target repo is creating, refreshing, revising, checking, evaluating, or resuming a Foundation Capability Map.

## Source Of Truth

Load only the context needed for the current step:

- target repo `AGENTS.md`
- Foundation `AGENTS.md`
- `docs/specs/foundation-operating-system.html#capability-map` when changing Foundation-owned capability, job, skill, template, or checker behavior
- active target report and run log named by the target repo
- current target `surface-function-map-<run-id>.jsonl`
- current target `capability-map-<run-id>.jsonl`
- Capability Map specs when changing the process/schema or resolving checker/eval ambiguity:
  - `docs/specs/foundation-backfill-capability-map.html`
  - `docs/specs/foundation-backfill-capability-map-technical.html`
  - `docs/specs/foundation-backfill-capability-map-eval.html`

## Commands

- Initialize: `npm run foundation:capability-map:init -- --repo <repo> --run-id <run-id>`
- Get next target: `npm run foundation:capability-map:fill -- --repo <repo> --run-id <run-id> --next`
- Mark reviewed surfaces: `npm run foundation:capability-map:fill -- --repo <repo> --run-id <run-id> --surface-ids <surface-id[,surface-id]> --capabilities-json '<json-array>'`
- Check during work: `npm run foundation:capability-map:check -- --repo <repo> --run-id <run-id> --phase batch`
- Check handoff: `npm run foundation:capability-map:check -- --repo <repo> --run-id <run-id> --phase handoff`
- Evaluate: `npm run foundation:capability-map:eval -- --repo <repo> --run-id <run-id>`
- Refresh changed upstream surfaces: `npm run foundation:capability-map:refresh -- --repo <repo> --run-id <run-id>`
- Record report state: `npm run foundation:capability-map:report -- --repo <repo> --run-id <run-id> --report <active-report>`

## Graph Metadata Support

Capability Map rows are the handoff source for capability graph nodes and capability-to-job edges. Preserve stable capability names, actor/outcome/object boundaries, candidate job slices, source surface IDs, evidence paths, metrics, gaps, confidence, and split reasons. When capability specs or job specs are created or revised from this map, the author must update `graph-metadata` with `capability`, `job`, `evidence`, `metric`, and `gap` nodes as appropriate and run `npm run foundation:visible-business-graph:check -- --repo <repo>`.

For Foundation-owned changes, every new capability row must answer which Foundation capability is being improved and which job spec owns the repeatable work. Run `npm run foundation:self-map:check` after changing Foundation capability, job, or skill ownership.

## Required Loop

1. Use `--next` to select a pending or failed surface target.
2. Read the selected Surface / Function Map row and enough nearby ready surface rows to decide whether they belong to the same actor/outcome capability.
3. Group only reviewed ready-for-capability surface rows. Support classifications are evidence, not upstream capability rows.
4. Immediately mark that reviewed group with inline `--capabilities-json`.
5. Do not rely on generated capability files, all-file fill modes, or broad path/domain summaries. The fill command rejects those shortcuts.
6. Run the batch checker often enough that missing formula fields, uncovered surfaces, stale upstream refs, and split issues are fixed before many more rows are marked.
7. Repeat until every ready surface is owned by a `ready-for-queue` or `needs-split` capability row for the Job / Spec Queue.
8. Run handoff check and eval once the layer is terminal.
9. Revise every row named in eval `revisionTargets`; warnings are not handoff-ready.
10. Rerun check and eval until `revisionTargets` is empty, run the visible business graph check when specs already exist, then record report state.

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

The fill command writes stable IDs, upstream surface references, freshness fingerprints, and evidence references. It replaces prior Capability Map rows that overlap the reviewed surface IDs, so include every capability row needed for that reviewed set in the same mark command.
