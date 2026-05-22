---
name: backfill-descriptive-spec-author
description: Author architecture-agnostic, intent-grade descriptive specs from capability rows, repo evidence, and extracted flows during a Foundation backfill. Use inside Backfill Specs after inventory and flow extraction, before rendered UX and adequacy review.
---

# Backfill Descriptive Spec Author

Use inside `backfill-specs` to write what the system is intended to make possible for users and operators. Code is evidence; the descriptive spec is the intent contract.

## Inputs

- capability matrix rows for the slice
- extracted flows and state transitions
- evidence paths
- parent spec and sibling technical spec, if present
- dated backfill report

## Write

Use target-owned spec IDs and `status: draft`. Choose altitude:

- parent spec: vocabulary, boundaries, child graph
- child spec: concrete capability behavior

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

## Rules

- Keep implementation choices out unless user-visible or required constraints.
- Preserve cross-platform flexibility: the same capability can appear on multiple platforms when actor, outcome, state model, rules, and contracts are equivalent.
- Mark claims as evidence-backed, inferred, or review-needed in the report.

## Done

Done when a future build agent can understand intended behavior, states, recovery, permissions, and open human decisions from the spec without reading source for core behavior. If the slice has visible UX, call `backfill-rendered-ux-spec`.
