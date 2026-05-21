---
name: backfill-descriptive-spec-author
description: Author intent-grade descriptive specs from existing repo evidence and extracted user flows during a Foundation backfill. Use inside Backfill Specs after inventory and user-flow extraction, before rendered UX and adequacy review.
---

# Backfill Descriptive Spec Author

Use this skill inside `backfill-specs` to write descriptive specs that capture intended behavior from repo evidence.

## Standard

The spec describes what the system is meant to make possible for users and operators. Code, schemas, tests, and docs are evidence for intent. The output should be clear enough that a future build agent can implement the intended behavior from the specs alone.

Descriptive specs are architecture-agnostic by default. Name frameworks, databases, cloud services, libraries, file paths, or implementation mechanisms when they are visible to the user/operator or are part of a required product constraint. Translate implementation details into user-facing intent, state rules, permissions, outcomes, and recovery behavior.

## Authoring Steps

For the current slice:

1. Read the slice inventory rows, extracted flows, parent spec, sibling technical spec if any, and dated report.
2. Choose the correct altitude:
   - parent spec for vocabulary, domain boundaries, and child graph structure
   - child spec for concrete user flows, states, rules, and UX
3. Use target-owned spec IDs and `status: draft`.
4. Write the descriptive sections:
   - product intent
   - user model
   - observed current behavior
   - inferred intended behavior
   - required future contract
   - interface journey
   - visible states and rules
   - edge cases and recovery
   - UX-visible hidden mechanics
   - architecture-neutral intent boundary
   - related specs and evidence paths
   - rendered experience requirement or nonvisual explanation
   - coverage and review gaps
5. Record major claims as evidence-backed or inferred in the report.

## Quality Bar

Descriptive prose must be specific enough to answer:

- who the user is
- what outcome the user is trying to produce
- where the flow begins and ends
- what the user sees and does
- what states and rules govern the experience
- what happens when data is missing, permissions fail, work is processing, or an operation errors
- which details are product intent versus implementation evidence
- what evidence supports the intent
- what remains a human decision

If the slice has visual or UX-visible behavior, call `backfill-rendered-ux-spec` before adequacy review.
