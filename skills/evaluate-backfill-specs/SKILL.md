---
name: evaluate-backfill-specs
description: Evaluate Job Slices and Evaluate System Coherence for a Foundation backfill using the golden example and strict 100-point rubric. Use after Backfill Specs drafts or revises slices, when deciding whether a slice or repo-wide backfill is acceptable, or when scoring generated specs, updating the Job / Spec Queue, and looping weak categories back to the owning backfill skill.
---

# Evaluate Job Slices And System Coherence

Use to judge semantic quality after registry, metadata, visible business graph, queue, and run-log checks are structurally valid.

## Calibrate

Read when scoring:

- `docs/principles/ai-evals-principles.html`
- `docs/specs/examples/backfill-golden-example.html`
- `docs/specs/foundation-backfill-quality-evaluation.html`

The golden example is the minimum shape of excellent, not a loose sample. Merely understandable work should score around 65-75.

## Inputs

- target `AGENTS.md`
- dated backfill report, Capability Map, Artifact Inventory, Job / Spec Queue
- top-level system/app spec
- job and technical specs named by the report
- rendered UX sections for visible capability work
- evidence paths needed to audit traceability
- visible business graph check output when graph metadata exists

## Rubric

Score each category `0-10`, total `0-100`:

1. Job / Spec Queue and resumability
2. capability coverage, inventory coverage, and slice boundaries
3. evidence traceability
4. job intent quality
5. Process / Action Map and state specificity
6. rendered UX quality for visible capability work
7. technical contract quality
8. architecture flexibility: contracts, evidence, constraints, latitude
9. review questions and discrepancy handling
10. spec-only rebuild readiness
11. visible graph usefulness is assessed inside the relevant categories: capability coverage, evidence traceability, process/state specificity, and rebuild readiness.

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
- visible business graph check passes when graph metadata exists
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
8. Update the dated report, Capability Map, and Job / Spec Queue.
9. Mark `acceptable` only when the gate passes; otherwise mark `needs-revision` or `revision-ready`.

## Common Failures

- Broad domain slice compresses several capabilities.
- Capability Map missing, shallow, unmapped, or not referenced by queue.
- Descriptive spec names features but omits states, recovery, copy, or rendered UX.
- Technical spec copies current implementation without classifying required contracts and latitude.
- Spec graph still requires source-code memory for core behavior.

## Output

Evaluation report includes run ID, target repo, result, scorecard, capability findings, slice findings, architecture findings, spec-only rebuild probe, evidence audit, revision queue, Job / Spec Queue update, and recommendation.
