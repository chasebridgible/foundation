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

## Split

If one process contains multiple goals, roles, major states, permission models, domain objects, or verification targets, split it and update the Capability Map.

## Done

Done when each visible/operator-relevant capability row has concrete process/action rows and state transitions clear enough for Author Specs without reopening source files for core behavior.
