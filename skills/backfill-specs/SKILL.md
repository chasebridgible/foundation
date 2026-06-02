---
name: backfill-specs
description: Orchestrate a complete existing-repo spec backfill by running Foundation backfill sub-skills to Inventory Artifacts, Map Surfaces, Map Capabilities, Define Spec Jobs, Gather Context, Map Processes, Author Specs, Review Spec Adequacy, Evaluate Job Slices, and Evaluate System Coherence. Use when adopting an existing repo into Foundation, mapping code/docs into intended behavior, or resuming a long-running repo backfill.
---

# Backfill Specs

Use after a target repo is connected to Foundation. Produce a capability-covered draft job + technical spec graph for the whole repo. Leave existing code and old docs in place.

Detailed contracts live in:

- `docs/specs/foundation-backfill-specs.html`
- `docs/specs/foundation-backfill-orchestration-technical.html`
- `docs/specs/foundation-backfill-quality-evaluation.html`
- `docs/specs/foundation-backfill-artifact-inventory.html` plus its technical and eval specs
- `docs/specs/foundation-backfill-surface-function-map.html` plus its technical and eval specs
- `docs/specs/foundation-backfill-capability-map.html` plus its technical and eval specs
- `docs/specs/examples/backfill-golden-example.html`

Read those only when changing the workflow, resolving ambiguity, or calibrating quality.
Read the Artifact Inventory specs before starting or resuming that layer. Its canonical file and command namespace is `artifact-inventory`.
Read the Surface / Function Map or Capability Map specs before starting or resuming those layers. Their canonical command namespaces are `surface-function-map` and `capability-map`.

## Non-Negotiables

- Whole-repo backfill means capability coverage is closed, not that broad slices were summarized.
- Capability formula: actor + intended outcome + domain object + actions + state model + permissions/rules + visible or operator experience + backing contracts + failure/recovery + evidence.
- Routes, screens, endpoints, tables, jobs, workflows, and infrastructure resources are evidence surfaces, not completion units.
- Split capabilities when actors, outcomes, objects, state models, permission models, contracts, recovery behavior, or verification targets differ.
- Job specs stay architecture-agnostic unless implementation details are user-visible or required constraints. A job spec is the contract for the capability-backed body of work and contains the process by default.
- Technical specs are contract-first: required contracts, current evidence, architecture constraints, implementation latitude.
- Authored specs must include `graph-metadata` so the repo's capabilities, jobs, processes, actors, tools, evidence, metrics, evals, and gaps can render in the Visible Business Graph.
- Each slice must be evaluated, revised, and re-evaluated until acceptable before closure.
- Acceptable means evaluator total >= 96, every category >= 9, rebuild readiness = 10, and no attached capability needs split.
- Backfilled specs start as `status: draft` with low or medium confidence.

## Required Artifacts

In the target repo:

- `docs/specs/backfill/review-report-YYYYMMDD-NN.html`
- `docs/specs/backfill/run-log-YYYYMMDD-NN.jsonl`
- draft job and technical specs in `docs/specs/`
- `docs/specs/backfill/file-manifest-YYYYMMDD-NN.json`
- Artifact Inventory artifacts: `docs/specs/backfill/artifact-inventory-YYYYMMDD-NN.jsonl`, `artifact-inventory-eval-YYYYMMDD-NN.jsonl`, and `artifact-inventory-eval-summary-YYYYMMDD-NN.html`
- Surface / Function Map artifacts: `docs/specs/backfill/surface-function-map-YYYYMMDD-NN.jsonl`, `surface-function-map-eval-YYYYMMDD-NN.jsonl`, and `surface-function-map-eval-summary-YYYYMMDD-NN.html`
- Capability Map artifacts: `docs/specs/backfill/capability-map-YYYYMMDD-NN.jsonl`, `capability-map-eval-YYYYMMDD-NN.jsonl`, and `capability-map-summary-YYYYMMDD-NN.html`
- Define Spec Jobs artifacts: `docs/specs/backfill/spec-job-queue-YYYYMMDD-NN.jsonl`, `spec-job-queue-eval-YYYYMMDD-NN.jsonl`, and `spec-job-queue-summary-YYYYMMDD-NN.html`

The report must contain:

- `<script type="application/json" id="backfill-capability-map">`
- `<script type="application/json" id="backfill-spec-job-queue">`
- visible tables for humans showing the same state

Capability rows must include stable ID, actor, outcome, domain object, actions, states, rules, surfaces, backing contracts, failure/recovery, evidence, spec owners/sections, verification targets, status, split state, gaps, and human decisions.

Define Spec Jobs rows must include stable slice ID, name, scope, upstream capability IDs, status, owner skill, spec IDs, next action, exit criterion, blocking questions/gaps, human decisions, and verification targets where applicable.

## Entry

1. Read target `AGENTS.md`.
2. Read Foundation `AGENTS.md`.
3. If changing Foundation itself, read `docs/specs/foundation-operating-system.html#capability-map` and name the capability/job that owns the change before authoring specs or skills.
4. Read this skill.
5. If the repo is not connected, use `skills/install-foundation-substrate/SKILL.md`.
6. Run or confirm `npm run foundation:doctor -- --repo <target-repo>`.
7. Read the active dated report/run log if target `AGENTS.md` names one.
8. Read the top-level system/app spec if it exists.

## Forced Loop

Repeat until capability coverage is closed:

1. Create or resume the dated report and run log.
2. Inventory Artifacts before capability inference: every repo-owned file must be mapped in the canonical Artifact Inventory and pass the check/eval gate.
3. Map Surfaces before capability inference: every eligible artifact row must resolve to ready surfaces, support classifications, or review blockers.
4. Map Capabilities: every ready surface must map to a `ready-for-queue` or `needs-split` capability row.
5. Apply the split rule; rows needing split cannot close.
6. Define Spec Jobs by refreshing the Job / Spec Queue from capability rows.
7. Pick the next capability-backed slice that is queued, in progress, needs split, needs job, needs technical, needs evaluation, needs revision, or revision-ready.
8. Append run-log events for phase start/complete/checkpoint/evaluation/validation/handoff.
9. Use `backfill-process-action-map` to Map Processes for user/operator-visible capability slices.
10. Use `backfill-job-spec-author`.
11. Use `backfill-rendered-ux-spec` when the capability has visible UX.
12. Use `backfill-technical-spec-author`.
13. Use `backfill-spec-adequacy-review` to Review Spec Adequacy; revise before evaluator scoring if it fails.
14. Use `evaluate-backfill-specs` to Evaluate Job Slices.
15. If below threshold, mark `needs-revision`, route the gap to the owning skill, revise, and re-evaluate.
16. If acceptable, mark the slice and attached capability rows acceptable.
17. Run validation after meaningful report/log/spec changes:
    - `npm run backfill:queue:check -- <target-repo>/docs/specs/backfill/review-report-YYYYMMDD-NN.html`
    - `npm run backfill:run-log:check -- <target-repo>/docs/specs/backfill/run-log-YYYYMMDD-NN.jsonl`
    - target registry/spec checks required by its `AGENTS.md`
    - `npm run foundation:visible-business-graph:check -- --repo <target-repo>` after spec graph metadata exists
18. Update report status, Capability Map, remaining Job / Spec Queue, run-log sequence, and next action.

After all capability rows are acceptable, parent-owned with a precise reason, blocked by a named human decision, or out of scope, run `evaluate-backfill-specs` on the full graph to Evaluate System Coherence. If system-coherence evaluation needs revision, route it back through the loop.

## Skill Chain

- `skills/backfill-artifact-inventory/SKILL.md`
- `skills/artifact-inventory-fill-loop/SKILL.md` - Inventory Artifacts
- `skills/surface-function-map-fill-loop/SKILL.md` - Map Surfaces
- `skills/capability-map-fill-loop/SKILL.md` - Map Capabilities
- `skills/backfill-process-action-map/SKILL.md` - Map Processes
- `skills/backfill-job-spec-author/SKILL.md`
- `skills/backfill-rendered-ux-spec/SKILL.md`
- `skills/backfill-technical-spec-author/SKILL.md`
- `skills/backfill-spec-adequacy-review/SKILL.md` - Review Spec Adequacy
- `skills/evaluate-backfill-specs/SKILL.md` - Evaluate Job Slices and Evaluate System Coherence

## Completion

Backfill is complete when:

- every relevant capability row is acceptable, parent-owned with a precise reason, blocked by a named human decision, or out of scope
- every manifest file has a mapped Artifact Inventory row, and every relevant evidence surface maps to a capability row or non-behavioral support note
- graph-level evaluation is acceptable
- queue, run log, registry, spec checks, and visible business graph checks pass
- for Foundation-owned changes, `npm run foundation:self-map:check` passes

## Handoff

Report specs changed, capability coverage status, graph-check status, evaluation result/report path, validation commands/results, review report path, run log path/latest sequence, unresolved decisions, and remaining review queue.
