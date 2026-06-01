---
name: backfill-process-action-map
description: Map concrete actor processes, actions, states, decisions, and recovery paths from a Context Pack during a Foundation spec backfill. Use inside Backfill Specs for user-facing, operator-facing, admin, external-system, or scheduled-system capability slices before Author Specs.
---

# Backfill Process / Action Map

Use inside `backfill-specs` before Author Specs for visible or operator-relevant capabilities.

## Inputs

- Capability Map row
- Context Pack rows and evidence paths for the slice
- parent/top-level spec if present

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

If one process contains multiple goals, roles, major states, permission models, domain objects, or verification targets, split it and update the Capability Map.

## Done

Done when each visible/operator-relevant capability row has concrete process/action rows and state transitions clear enough for Author Specs without reopening source files for core behavior, including graph-ready actors, process labels, tools, evidence, metrics, and gaps.
