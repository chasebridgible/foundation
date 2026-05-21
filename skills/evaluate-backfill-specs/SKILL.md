---
name: evaluate-backfill-specs
description: Evaluate and route revisions for a completed or in-progress Foundation backfill spec graph using the golden example and strict 100-point rubric. Use after Backfill Specs drafts or revises slices, when deciding whether a slice or repo-wide backfill is acceptable, or when an agent needs to score generated specs, update the durable queue, and loop weak categories back to the owning backfill skill.
---

# Evaluate Backfill Specs

Use this skill to judge whether a backfill result is acceptable. It evaluates semantic quality after metadata and registry checks are already clean, routes category-level revisions, and updates durable queue state so the backfill can continue or resume.

## Calibration

Read the golden example before scoring:

- `docs/principles/ai-evals-principles.html`
- `docs/specs/examples/backfill-golden-example.html`
- `docs/specs/foundation-backfill-evaluation.html`

The AI eval principles define the evaluator stance. The golden example shows the expected shape of a backfill report, descriptive slice, technical slice, architecture classification, adequacy review, and evaluator scorecard.

Treat the golden example as the minimum shape of an excellent slice, not as a loose sample. A result that is merely understandable should score around 65-75, not pass.

Use calibration bands:

- `0-30`: misleading or mostly absent
- `31-55`: broad summary with serious missing contracts
- `56-75`: useful orientation, not rebuild-useful
- `76-88`: strong partial slice with material gaps
- `89-95`: near-acceptable but still revision-bound
- `96-100`: acceptable

Common near-miss examples:

- A domain summary with no durable queue should fail durable queue and slice-boundary categories.
- A descriptive spec that names features but omits states, recovery, copy, or rendered UX should fail user-flow/rendered categories.
- A technical spec that copies current implementation without separating required contracts, constraints, and latitude should fail architecture flexibility.
- A spec graph that requires the evaluator to remember source-code context should fail spec-only rebuild readiness.

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

Score each category from `0` to `10`, for a total of `100`.

- `0-2` absent or misleading: missing, wrong, or likely to create false confidence.
- `3-5` shallow: present, but broad, generic, summary-level, or weakly grounded.
- `6-7` useful but incomplete: materially helpful, with important gaps.
- `8` strong draft: mostly specific and traceable, with fixable gaps.
- `9` near-acceptable: high-quality, with only small isolated revisions.
- `10` excellent: precise, traceable, architecture-flexible, and strong enough for a future build agent.

Categories:

1. Durable queue and resumability.
2. Inventory coverage and slice boundaries.
3. Evidence traceability.
4. Descriptive intent quality.
5. User-flow and state specificity.
6. Rendered UX quality for user-facing slices.
7. Technical contract quality.
8. Architecture flexibility: required contracts, current evidence, constraints, and latitude are separated.
9. Review questions and discrepancy handling.
10. Spec-only rebuild readiness.

A slice or graph is acceptable only when the total score is at least `96`, every category scores at least `9`, spec-only rebuild readiness scores `10`, and every remaining question is isolated as a non-blocking human decision. A score below that threshold routes revisions back to the owning backfill layer before final handoff.

## Evaluation Workflow

1. Read the golden example and evaluation spec.
2. Read the target backfill report, inventory ledger, durable queue, and spec graph.
3. Pick the slice or graph being evaluated and record its current queue status.
4. Perform a spec-only pass: judge what a future build agent could understand from the generated specs alone.
5. Audit traceability: sample evidence paths for high-risk claims, architecture constraints, UX-visible behavior, permissions, data contracts, and material discrepancies.
6. Score each category from `0` to `10` with file/section citations.
7. For every category below `9`, write a concrete revision item with owner skill, affected artifact, blocking gap, and exit criterion.
8. Write or update `docs/specs/backfill/evaluation-report-YYYYMMDD-NN.html` using the same run ID as the backfill report.
9. Append the evaluation result and revision queue to the dated backfill report.
10. Update the durable queue status:
    - `needs-revision` when any category is below `9`.
    - `revision-ready` when the next action is fully specified for the owning skill.
    - `acceptable` when the total is at least `96`, every category is at least `9`, rebuild readiness is `10`, and only non-blocking human questions remain.
11. If the result needs revision, route the next action back to the owning backfill skill layer. Re-evaluate after revision before marking the slice acceptable.

## Report Contract

The evaluation report must include:

- run ID, target repo, evaluator date, evaluated report path, and spec graph summary
- overall result: `acceptable`, `needs revision`, or `blocked by human decision`
- total score out of `100`
- scorecard with `0-10` category scores, citations, and category-level revision status
- slice-level findings
- architecture flexibility findings
- spec-only rebuild probe notes
- evidence audit notes
- revision queue with owner skill: inventory, user flows, descriptive authoring, rendered UX, technical authoring, or adequacy review
- durable queue update for every evaluated slice
- final recommendation

Keep the report concrete. Every finding should name the affected spec, section, inventory row, or report row.
