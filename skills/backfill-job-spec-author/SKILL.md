---
name: backfill-job-spec-author
description: Author architecture-agnostic, intent-grade job specs from capability rows, Context Packs, and the Process / Action Map during a Foundation backfill. Use inside Backfill Specs after Gather Context and Map Processes, before rendered UX and Review Spec Adequacy.
---

# Backfill Job Spec Author

Use inside `backfill-specs` to write what the system is intended to make possible for users and operators. Code is evidence; the job spec is the intent contract for the capability-backed body of work.

## Inputs

- Capability Map rows for the slice
- extracted process/action rows and state transitions
- evidence paths
- parent spec and sibling technical spec, if present
- dated backfill report

## Write

Use target-owned spec IDs and `status: draft`. Choose altitude:

- parent spec: vocabulary, boundaries, child graph
- child spec: concrete capability behavior

Every authored spec must include `graph-metadata`. Job specs expose the job node, supporting capability edge, process node, actor nodes, tool nodes, evidence/metric/gap nodes, and source sections. Technical and eval specs expose support/evaluation nodes and edges.

For behavior-bearing specs, include:

- product intent
- capability contract: actor, outcome, object, actions, states, rules, surfaces, evidence, human decisions
- user/operator model
- observed current behavior
- inferred intended behavior
- required future contract
- interface or operator journey
- visible states and rules
- edge cases and recovery
- UX-visible hidden mechanics
- architecture-neutral boundary
- related specs and evidence paths
- rendered UX requirement or nonvisual explanation
- coverage and review gaps
- graph metadata that agrees with the visible prose and capability row

## Rules

- Keep implementation choices out unless user-visible or required constraints.
- Preserve cross-platform flexibility: the same capability can appear on multiple platforms when actor, outcome, state model, rules, and contracts are equivalent.
- Mark claims as evidence-backed, inferred, or review-needed in the report.
- Run or route `npm run foundation:visible-business-graph:check -- --repo <target-repo>` after authored specs are written or revised.

## Done

Done when a future build agent can understand intended behavior, states, recovery, permissions, graph relationships, and open human decisions from the spec without reading source for core behavior. If the slice has visible UX, call `backfill-rendered-ux-spec`.
