---
name: backfill-spec-adequacy-review
description: Review a backfilled slice for adequacy before it can be marked drafted. Use inside Backfill Specs after descriptive, rendered UX, and technical specs are written to verify coverage, specificity, traceability, contract preservation, architecture flexibility, and whether a future build agent could implement intended behavior from the specs.
---

# Backfill Spec Adequacy Review

Use this skill inside `backfill-specs` before a slice can be marked drafted.

## Review Question

Could a future build agent implement this intended behavior from the specs while preserving required contracts and using implementation latitude where architecture is flexible?

Answer with evidence. If the answer is weak, revise the specs before moving to the next slice.

## Adequacy Checks

Review the slice against its inventory and evidence:

- every relevant inventory item has an owning spec or out-of-scope reason
- every user-facing entry point maps to concrete user flows
- descriptive specs state intent, users, journeys, visible states, rules, edge cases, recovery, and evidence
- visual or UX-visible behavior includes rendered, interactive HTML-native examples or a nonvisual explanation
- technical specs define data, APIs, services, jobs, permissions, integrations, timing, failures, observability, and boundaries
- descriptive specs include architecture details in the intent layer when they are user-visible or product constraints
- technical specs separate required contracts, current implementation evidence, architecture constraints, and implementation latitude
- architecture constraints include a reason grounded in production data, external contracts, platform requirements, security/compliance, operational needs, performance, or human direction
- parent specs define vocabulary and graph structure, while child specs carry behavior
- vague nouns, unsupported claims, summary-only prose, and missing state/rule tables have been revised
- major claims are backed by evidence paths or marked as inferred/review-needed

## Report Output

Append an adequacy table to the dated report:

- slice ID
- descriptive spec ID
- technical spec ID
- inventory coverage result
- user-flow coverage result
- rendered UX result
- technical contract result
- architecture flexibility result
- traceability result
- revision actions taken
- remaining review questions
- status: needs revision or adequacy-reviewed

## Completion Rule

Mark a slice `adequacy-reviewed` after revising the specs to satisfy the checks. A slice with unresolved human review questions may be adequacy-reviewed when the intended behavior is drafted clearly and the questions are isolated in the report.
