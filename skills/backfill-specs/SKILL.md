---
name: backfill-specs
description: Orchestrate a complete existing-repo spec backfill by running Foundation backfill sub-skills for inventory, capability coverage, user-flow extraction, descriptive specs, rendered UX, technical specs, adequacy review, and evaluation. Use when adopting an existing repo into Foundation, mapping code/docs into intended behavior, or resuming a long-running repo backfill.
---

# Backfill Specs

Use after a target repo is connected to Foundation. Produce a capability-covered draft descriptive + technical spec graph for the whole repo. Leave existing code and old docs in place.

Detailed contracts live in:

- `docs/specs/foundation-backfill-specs.html`
- `docs/specs/foundation-backfill-orchestration-technical.html`
- `docs/specs/foundation-backfill-evaluation.html`
- `docs/specs/foundation-backfill-file-registry.html` plus its technical and test specs
- `docs/specs/examples/backfill-golden-example.html`

Read those only when changing the workflow, resolving ambiguity, or calibrating quality.
Read the file-registry specs before starting or resuming that layer.

## Non-Negotiables

- Whole-repo backfill means capability coverage is closed, not that broad slices were summarized.
- Capability formula: actor + intended outcome + domain object + actions + state model + permissions/rules + visible or operator experience + backing contracts + failure/recovery + evidence.
- Routes, screens, endpoints, tables, jobs, workflows, and infrastructure resources are evidence surfaces, not completion units.
- Split capabilities when actors, outcomes, objects, state models, permission models, contracts, recovery behavior, or verification targets differ.
- Descriptive specs stay architecture-agnostic unless implementation details are user-visible or required constraints.
- Technical specs are contract-first: required contracts, current evidence, architecture constraints, implementation latitude.
- Each slice must be evaluated, revised, and re-evaluated until acceptable before closure.
- Acceptable means evaluator total >= 96, every category >= 9, rebuild readiness = 10, and no attached capability needs split.
- Backfilled specs start as `status: draft` with low or medium confidence.

## Required Artifacts

In the target repo:

- `docs/specs/backfill/review-report-YYYYMMDD-NN.html`
- `docs/specs/backfill/run-log-YYYYMMDD-NN.jsonl`
- draft descriptive and technical specs in `docs/specs/`
- `docs/specs/backfill/file-manifest-YYYYMMDD-NN.json`
- `docs/specs/backfill/file-registry-YYYYMMDD-NN.jsonl`
- `docs/specs/backfill/file-registry-eval-YYYYMMDD-NN.jsonl`
- `docs/specs/backfill/file-registry-eval-summary-YYYYMMDD-NN.html`

The report must contain:

- `<script type="application/json" id="backfill-capability-matrix">`
- `<script type="application/json" id="backfill-slice-queue">`
- visible tables for humans showing the same state

Capability rows must include stable ID, actor, outcome, domain object, actions, states, rules, surfaces, backing contracts, failure/recovery, evidence, spec owners/sections, verification targets, status, split state, gaps, and human decisions.

Queue slices must include stable ID, scope, capability IDs, status, owner skill, spec IDs, score, next action, exit criterion, blocking gaps, and evidence.

## Entry

1. Read target `AGENTS.md`.
2. Read Foundation `AGENTS.md`.
3. Read this skill.
4. If the repo is not connected, use `skills/install-foundation-substrate/SKILL.md`.
5. Run or confirm `npm run foundation:doctor -- --repo <target-repo>`.
6. Read the active dated report/run log if target `AGENTS.md` names one.
7. Read the top-level system/app spec if it exists.

## Forced Loop

Repeat until capability coverage is closed:

1. Create or resume the dated report and run log.
2. Complete or resume the file-registry layer before capability inference: every repo-owned file must be mapped in the canonical registry and pass the file-registry check/eval gate.
3. Use `backfill-repo-inventory` to derive evidence inventory and capability matrix from the file registry.
4. Apply the split rule; rows needing split cannot close.
5. Refresh the slice queue from capability rows.
6. Pick the next capability-backed slice that is queued, in progress, needs split, needs descriptive, needs technical, needs evaluation, needs revision, or revision-ready.
7. Append run-log events for phase start/complete/checkpoint/evaluation/validation/handoff.
8. Use `backfill-user-flow-extraction` for user/operator-visible capability slices.
9. Use `backfill-descriptive-spec-author`.
10. Use `backfill-rendered-ux-spec` when the capability has visible UX.
11. Use `backfill-technical-spec-author`.
12. Use `backfill-spec-adequacy-review`; revise before evaluator scoring if it fails.
13. Use `evaluate-backfill-specs`.
14. If below threshold, mark `needs-revision`, route the gap to the owning skill, revise, and re-evaluate.
15. If acceptable, mark the slice and attached capability rows acceptable.
16. Run validation after meaningful report/log/spec changes:
    - `npm run backfill:queue:check -- <target-repo>/docs/specs/backfill/review-report-YYYYMMDD-NN.html`
    - `npm run backfill:run-log:check -- <target-repo>/docs/specs/backfill/run-log-YYYYMMDD-NN.jsonl`
    - target registry/spec checks required by its `AGENTS.md`
17. Update report status, capability matrix, remaining queue, run-log sequence, and next action.

After all capability rows are acceptable, parent-owned with a precise reason, blocked by a named human decision, or out of scope, run `evaluate-backfill-specs` on the full graph. If graph evaluation needs revision, route it back through the loop.

## Skill Chain

- `skills/backfill-repo-inventory/SKILL.md`
- `skills/backfill-user-flow-extraction/SKILL.md`
- `skills/backfill-descriptive-spec-author/SKILL.md`
- `skills/backfill-rendered-ux-spec/SKILL.md`
- `skills/backfill-technical-spec-author/SKILL.md`
- `skills/backfill-spec-adequacy-review/SKILL.md`
- `skills/evaluate-backfill-specs/SKILL.md`

## Completion

Backfill is complete when:

- every relevant capability row is acceptable, parent-owned with a precise reason, blocked by a named human decision, or out of scope
- every manifest file has a mapped file-registry row, and every relevant evidence surface maps to a capability row or non-behavioral support note
- graph-level evaluation is acceptable
- queue, run log, registry, and spec checks pass

## Handoff

Report specs changed, capability coverage status, evaluation result/report path, validation commands/results, review report path, run log path/latest sequence, unresolved decisions, and remaining review queue.
