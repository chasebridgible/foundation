---
name: evaluate-backfill-specs
description: Evaluate and route revisions for a Foundation backfill slice or graph using the golden example and strict 100-point rubric. Use after Backfill Specs drafts or revises slices, when deciding whether a slice or repo-wide backfill is acceptable, or when scoring generated specs, updating the durable queue, and looping weak categories back to the owning backfill skill.
---

# Evaluate Backfill Specs

Use to judge semantic quality after registry, metadata, queue, and run-log checks are structurally valid.

## Calibrate

Read when scoring:

- `docs/principles/ai-evals-principles.html`
- `docs/specs/examples/backfill-golden-example.html`
- `docs/specs/foundation-backfill-evaluation.html`

The golden example is the minimum shape of excellent, not a loose sample. Merely understandable work should score around 65-75.

## Inputs

- target `AGENTS.md`
- dated backfill report, capability matrix, inventory ledger, durable queue
- top-level system/app spec
- descriptive and technical specs named by the report
- rendered UX sections for visible slices
- evidence paths needed to audit traceability

## Rubric

Score each category `0-10`, total `0-100`:

1. durable queue and resumability
2. capability coverage, inventory coverage, and slice boundaries
3. evidence traceability
4. descriptive intent quality
5. user-flow and state specificity
6. rendered UX quality for visible slices
7. technical contract quality
8. architecture flexibility: contracts, evidence, constraints, latitude
9. review questions and discrepancy handling
10. spec-only rebuild readiness

Bands:

- `0-30`: misleading or mostly absent
- `31-55`: broad summary with serious missing contracts
- `56-75`: useful orientation, not rebuild-useful
- `76-88`: strong partial slice with material gaps
- `89-95`: near-acceptable but revision-bound
- `96-100`: acceptable

## Gate

Acceptable requires:

- total >= 96
- every category >= 9
- spec-only rebuild readiness = 10
- evaluated capability rows acceptable
- no evaluated capability row needs split
- remaining questions are isolated non-blocking human decisions

## Workflow

1. Read calibration docs.
2. Read generated specs/report first.
3. Run a spec-only probe: what can be built from specs alone, and which source files are still needed for core behavior?
4. Audit source evidence for high-risk claims, permissions, data contracts, UX-visible behavior, architecture constraints, integrations, and discrepancies.
5. Score categories with citations.
6. For any category below 9, write revision items with owner skill, affected artifact, blocking gap, and exit criterion.
7. Write/update `docs/specs/backfill/evaluation-report-YYYYMMDD-NN.html`.
8. Update the dated report, capability matrix, and durable queue.
9. Mark `acceptable` only when the gate passes; otherwise mark `needs-revision` or `revision-ready`.

## Common Failures

- Broad domain slice compresses several capabilities.
- Capability matrix missing, shallow, unmapped, or not referenced by queue.
- Descriptive spec names features but omits states, recovery, copy, or rendered UX.
- Technical spec copies current implementation without classifying required contracts and latitude.
- Spec graph still requires source-code memory for core behavior.

## Output

Evaluation report includes run ID, target repo, result, scorecard, capability findings, slice findings, architecture findings, spec-only rebuild probe, evidence audit, revision queue, durable queue update, and recommendation.
