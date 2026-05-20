---
name: evaluate-backfill-specs
description: Evaluate the quality of a completed or in-progress Foundation backfill spec graph using the golden example and rubric. Use after Backfill Specs drafts a repo-wide descriptive/technical graph, when deciding whether a backfill result is good enough for human review, or when an agent needs to produce a scorecard and revision queue for generated specs.
---

# Evaluate Backfill Specs

Use this skill to judge whether a backfill result is good enough. It evaluates semantic quality after metadata and registry checks are already clean.

## Calibration

Read the golden example before scoring:

- `docs/specs/examples/backfill-golden-example.html`
- `docs/specs/foundation-backfill-evaluation.html`

The golden example shows the expected shape of a backfill report, descriptive slice, technical slice, architecture classification, adequacy review, and evaluator scorecard.

## Inputs

Load these artifacts from the target repo:

1. Target `AGENTS.md`.
2. Current dated backfill report and inventory ledger.
3. Top-level system/app spec.
4. Draft descriptive and technical specs named by the report.
5. Rendered UX sections for user-facing slices.
6. Evidence paths needed to audit traceability.

Start from generated specs and reports. Use original repo evidence to verify claims and gaps after the spec-only review.

## Scoring

Score each category from 0 to 3:

- `0` absent: the artifact or behavior is missing.
- `1` shallow: present but too broad, vague, or mostly summary.
- `2` usable: materially useful, with clear revision needs.
- `3` good enough: specific, traceable, and ready for human review.

Categories:

1. Routing and durable state.
2. Inventory coverage and slice queue.
3. Descriptive intent quality.
4. User-flow specificity.
5. Rendered UX quality for user-facing slices.
6. Technical contract quality.
7. Architecture flexibility: required contracts, current evidence, constraints, and latitude are separated.
8. Evidence traceability.
9. Review questions and material discrepancy handling.
10. Spec-only rebuild readiness.

A result is good enough for human review when every category scores at least `2`, spec-only rebuild readiness scores at least `2`, and revision items are isolated in a clear queue.

## Evaluation Workflow

1. Read the golden example and evaluation spec.
2. Read the target backfill report, inventory ledger, and spec graph.
3. Perform a spec-only pass: judge what a future build agent could understand from the generated specs alone.
4. Audit traceability: sample evidence paths for high-risk claims, architecture constraints, and UX-visible behavior.
5. Score each category with file/section citations.
6. Write or update `docs/specs/backfill/evaluation-report-YYYYMMDD-NN.html` using the same run ID as the backfill report.
7. Append the evaluation result and revision queue to the dated backfill report.
8. If the result needs revision, route the next action back to the owning backfill skill layer.

## Report Contract

The evaluation report must include:

- run ID, target repo, evaluator date, evaluated report path, and spec graph summary
- overall result: `good enough for human review` or `needs revision`
- scorecard with category scores and citations
- slice-level findings
- architecture flexibility findings
- spec-only rebuild probe notes
- evidence audit notes
- revision queue with owner skill: inventory, user flows, descriptive authoring, rendered UX, technical authoring, or adequacy review
- final recommendation

Keep the report concrete. Every finding should name the affected spec, section, inventory row, or report row.
