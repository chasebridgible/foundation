---
name: backfill-user-flow-extraction
description: Extract concrete actor flows from repo evidence during a Foundation spec backfill. Use inside Backfill Specs for user-facing, operator-facing, admin, external-system, or scheduled-system capability slices before descriptive authoring.
---

# Backfill User Flow Extraction

Use inside `backfill-specs` before descriptive authoring for visible or operator-relevant capabilities.

## Inputs

- capability matrix row
- evidence inventory rows and paths for the slice
- parent/top-level spec if present

## Extract

For each capability flow, record:

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
- proposed descriptive spec owner
- unresolved human decisions

## Split

If one flow contains multiple goals, roles, major states, permission models, domain objects, or verification targets, split it and update the capability matrix.

## Done

Done when each visible/operator-relevant capability row has concrete flows and state transitions clear enough for descriptive authoring without reopening source files for core behavior.
