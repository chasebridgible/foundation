---
name: backfill-process-action-map
description: Map concrete actor processes, actions, states, decisions, and recovery paths from a Context Pack during a Foundation spec backfill. Use inside Backfill Specs for user-facing, operator-facing, admin, external-system, or scheduled-system capability slices before Author Specs.
---

# Backfill Process / Action Map

Use inside `backfill-specs` before Author Specs for visible or operator-relevant capabilities.

## Inputs

- Capability Map row
- Context Pack rows and evidence paths for the slice
- current `process-action-map-YYYYMMDD-NN.jsonl` when continuing a run
- current Context Pack check, eval, summary, and report handoff state
- parent/top-level spec if present

## Command Loop

Run this layer only after Context Pack handoff is complete for the active run.

1. Initialize rows:
   `npm run foundation:process-action-map:init -- --repo <target-repo> --run-id <run-id> [--report docs/specs/backfill/review-report-<run-id>.html] [--run-log docs/specs/backfill/run-log-<run-id>.jsonl]`
2. Find the next row without writing:
   `npm run foundation:process-action-map:fill -- --repo <target-repo> --run-id <run-id> --next`
3. Review exactly one Context Pack row. Read only that Context Pack row and its cited evidence.
4. Fill exactly one Process / Action Map row for that same pack or slice:
   `npm run foundation:process-action-map:fill -- --repo <target-repo> --run-id <run-id> --pack-id <pack-id> --processes-json '{...}' [--run-log ...]`
5. Check the current row loop:
   `npm run foundation:process-action-map:check -- --repo <target-repo> --run-id <run-id> --phase batch [--run-log ...]`
6. Evaluate that row:
   `npm run foundation:process-action-map:eval -- --repo <target-repo> --run-id <run-id> --pack-id <pack-id> [--run-log ...]`
7. Revise the same row until the selected row eval is outstanding. Then return to `--next`.
8. After every non-pending row has an outstanding row receipt, run handoff check and eval:
   `npm run foundation:process-action-map:check -- --repo <target-repo> --run-id <run-id> [--report ...] [--run-log ...]`
   `npm run foundation:process-action-map:eval -- --repo <target-repo> --run-id <run-id> --sample all [--run-log ...]`
9. Report handoff:
   `npm run foundation:process-action-map:report -- --repo <target-repo> --run-id <run-id> [--report ...] [--run-log ...]`

Use `npm run foundation:process-action-map:refresh -- --repo <target-repo> --run-id <run-id>` after Context Pack rows change.

The row loop is strict: `--next` -> read exactly one Context Pack row -> extract exactly one Process / Action Map row -> fill that same pack ID or slice ID -> check -> eval that row -> revise that same row until outstanding -> continue. Exactly one Context Pack row is reviewed and marked at a time.

## Extract

For each capability process, record:

- actor and role
- entry point or trigger
- intended outcome
- domain object
- primary actions
- visible/operator states
- state transitions
- permissions and denial behavior
- system response
- success outcome
- empty, loading, partial, error, offline, retry, permission, and recovery paths
- evidence paths
- proposed job spec owner
- unresolved human decisions

## Graph Metadata Support

Process/action rows are the main source for job-level graph nodes. Capture stable process names, actor roles, tools, evidence paths, metrics, gaps, and source anchors so downstream job specs can emit `job`, `process`, `actor`, `tool`, `evidence`, `metric`, and `gap` nodes with `has-process`, `performed-by`, `uses-tool`, `evidenced-by`, `measured-by`, and `has-gap` edges. If this skill updates an existing job or capability spec, update `graph-metadata` in the same edit and run `npm run foundation:visible-business-graph:check -- --repo <repo>`.

## Split

If one process contains multiple goals, roles, major states, permission models, domain objects, or verification targets, route the row back to Job / Spec Queue or Capability Map ownership and record the blocker before Author Specs consumes it.

## Done

Done when each active Context Pack row has a `ready-for-specs` Process / Action Map row or explicit blocker detail, every non-pending row has a current outstanding row-level eval receipt, the checker and eval pass for the current Process / Action Map fingerprint, eval revision targets are zero, the report names `Author Specs` as next layer, and the rows are clear enough for Author Specs without reopening source files for core behavior.

A row is outstanding only when deterministic checks pass, row eval has no blocking findings, row eval has no warnings, no revision targets remain, no vague placeholders remain, uncertainty is resolved or named as a blocker/human decision, and Author Specs can proceed without rediscovering source for core behavior.
