---
name: backfill-specs
description: Orchestrate a complete existing-repo spec backfill by running Foundation backfill sub-skills for inventory, user-flow extraction, descriptive specs, rendered UX, technical specs, and adequacy review. Use when adopting an existing repo into Foundation, mapping code/docs into intended behavior, or resuming a long-running repo backfill.
---

# Backfill Specs

Use this skill after a target repo is connected to Foundation. It orchestrates smaller backfill skills that extract intended behavior from current evidence and turn it into a complete draft descriptive and technical spec graph.

The output is intent-rigid and architecture-flexible. Descriptive specs define what the system is meant to make possible. Technical specs define required contracts and distinguish current implementation evidence from architecture constraints and implementation latitude.

A request to backfill a repo means the whole repo. After each successful slice, evaluate it, revise it until acceptable, update the durable queue, and continue to the next queued slice until the proposed spec graph is drafted and evaluated end-to-end.

This skill owns spec artifacts and backfill reports. Existing code and old docs stay in place during backfill. A separate cleanup pass begins when the user asks for one.

## Quality Target

Backfill quality is intentionally demanding. The target is rebuild-useful spec substrate: precise enough for a future build agent to recover intended behavior from specs, report state, and named human decisions.

Use the strict evaluator standard from `skills/evaluate-backfill-specs/SKILL.md`:

- category scores are `0-10`
- total score is `0-100`
- acceptable means total score at least `96`, every category at least `9`, and spec-only rebuild readiness equals `10`
- anything below acceptable loops back to the owning backfill layer before the slice advances

## Skill Chain

Run these skills as the backfill loop requires:

1. `skills/backfill-repo-inventory/SKILL.md` - create and maintain the evidence inventory and coverage ledger.
2. `skills/backfill-user-flow-extraction/SKILL.md` - extract concrete user flows from routes, screens, components, docs, and tests.
3. `skills/backfill-descriptive-spec-author/SKILL.md` - write intent-grade descriptive specs from flow evidence.
4. `skills/backfill-rendered-ux-spec/SKILL.md` - add interactive HTML-native rendered experience sections for visual/user-facing slices.
5. `skills/backfill-technical-spec-author/SKILL.md` - write technical contracts that support the intended behavior.
6. `skills/backfill-spec-adequacy-review/SKILL.md` - review the slice against evidence and revise before evaluator scoring.
7. `skills/evaluate-backfill-specs/SKILL.md` - score each slice and the completed graph against the golden example and strict rubric; route weak categories back to owner skills.

The orchestrator owns sequencing and durable state. The sub-skills own their layer.

## Entry Conditions

Before starting or resuming backfill work:

1. Read the target repo `AGENTS.md`.
2. Read Foundation `AGENTS.md`.
3. Read this skill.
4. Run or confirm `npm run foundation:doctor -- --repo <target-repo>` from Foundation.
5. Read the current dated backfill report if the target repo names one.
6. Read the embedded durable queue in the dated report if it exists.
7. Read the top-level system/app spec if it exists.

When the repo still needs a Foundation connection, use `skills/install-foundation-substrate/SKILL.md` first.

Setup and backfill are separate phases. A successful Foundation setup or doctor run means the repo is ready for backfill; it does not count as semantic backfill progress.

## Source Of Truth

Use evidence in this order:

1. Current code, routes, components, services, jobs, infrastructure, and config.
2. Database schemas, data models, migrations, fixtures, and seed data.
3. Tests, evals, snapshots, generated artifacts, and runtime traces.
4. Product docs, plans, READMEs, diagrams, tickets, and notes.
5. Human clarification captured from the current request or later review when evidence conflicts or intent is materially ambiguous.

Docs are secondary evidence. Treat stale docs as clues. Specs state intended system behavior supported by the best available evidence. Current architecture is evidence; promote it to a required constraint when production data, external contracts, platform requirements, security/compliance, operational requirements, or human direction make it part of intended system behavior.

## Backfill Artifacts

Create artifacts in the target repo. Use Foundation artifact paths when Foundation is the repo being backfilled.

- Draft descriptive specs in `docs/specs/`.
- Draft technical specs in `docs/specs/`.
- Ongoing review reports in `docs/specs/backfill/`.
- Execution run logs in `docs/specs/backfill/`.
- Repo inventory and coverage ledgers in the review report, or in `docs/specs/backfill/repo-inventory-YYYYMMDD-NN.html` when the inventory is too large for the report.
- Test specs are handled by a later test-backfill skill when the user includes test backfill.

Backfilled specs must start with `status: draft`. Use `confidence: low` or `confidence: medium` until human review upgrades them.

Use a dated run ID for reports:

- Review report: `docs/specs/backfill/review-report-YYYYMMDD-NN.html`.
- Execution run log: `docs/specs/backfill/run-log-YYYYMMDD-NN.jsonl`.
- Optional final handoff artifact: `docs/specs/backfill/backfill-handoff-YYYYMMDD-NN.html`.

Use the same run ID across reports from one backfill run. Continue the existing dated report when resuming a run; start a new run when the user asks for one.

## Execution Run Log

The review report and embedded queue are durable workflow state. The run log is execution observability: an append-only JSONL record of what the agent did, when phases started and finished, what artifacts were read or changed, which commands/checks ran, and what the next action became.

Create or continue `docs/specs/backfill/run-log-YYYYMMDD-NN.jsonl` with the same run ID as the review report. Append one JSON object per line at phase boundaries. Do not rewrite previous log lines except to fix invalid JSON before handoff.

Use this event shape:

```json
{"ts":"2026-05-21T14:00:00.000Z","runId":"YYYYMMDD-NN","sequence":1,"slice":"slice-id-or-null","phase":"inventory","event":"start","summary":"Started repo inventory.","artifactsRead":[],"artifactsChanged":[],"commands":[],"checks":[],"durationSeconds":null,"result":null,"nextAction":"Map package, route, schema, test, and doc evidence."}
```

Required fields:

- `ts`: ISO timestamp.
- `runId`: the dated backfill run ID.
- `sequence`: positive integer that increases by one or more on every appended event.
- `slice`: current slice ID, or `null` for run-level work.
- `phase`: `setup`, `inventory`, `queue`, `user-flow`, `descriptive`, `rendered-ux`, `technical`, `adequacy`, `evaluation`, `validation`, `report`, or `handoff`.
- `event`: `start`, `complete`, `checkpoint`, `revision`, `evaluation`, `validation`, `blocked`, or `handoff`.
- `summary`: concise human-readable statement of the work.
- `artifactsRead`, `artifactsChanged`, `commands`, and `checks`: arrays, even when empty.
- `durationSeconds`: required for `complete` events. Use best-effort wall-clock timing when exact timing is unavailable.
- `result`: required for `complete`, `blocked`, `evaluation`, `validation`, and `handoff` events.
- `nextAction`: concrete next action, or `null` when complete.

Append `start` and `complete` events for inventory, queue refresh, user-flow extraction, descriptive authoring, rendered UX, technical authoring, adequacy review, evaluation, validation, report update, and handoff as those phases occur. When resuming after a context reset, append a `checkpoint` event after reading the target adapter, Foundation instructions, review report, queue, current specs, and existing run log.

Validate the log before handoff and after meaningful phase batches:

```sh
npm run backfill:run-log:check -- <target-repo>/docs/specs/backfill/run-log-YYYYMMDD-NN.jsonl
```

## Report Contract

The review report is temporary working state and may be deleted after review. It must be useful after context reset.

Keep it updated after each slice with human-readable tables and an embedded durable queue:

```html
<script type="application/json" id="backfill-slice-queue">
{
  "runId": "YYYYMMDD-NN",
  "targetRepo": "repo-name",
  "currentSlice": "slice-id",
  "nextSlice": "slice-id",
  "slices": [
    {
      "id": "stable-slice-id",
      "scope": "bounded behavior or system contract",
      "status": "queued|in-progress|needs-revision|revision-ready|acceptable|out-of-scope|blocked-by-human",
      "ownerSkill": "backfill-repo-inventory|backfill-user-flow-extraction|backfill-descriptive-spec-author|backfill-rendered-ux-spec|backfill-technical-spec-author|backfill-spec-adequacy-review|evaluate-backfill-specs",
      "descriptiveSpec": "spec.id.or.null",
      "technicalSpec": "spec.id.or.null",
      "score": null,
      "nextAction": "concrete next action",
      "exitCriterion": "condition for moving this slice forward",
      "blockingGaps": [],
      "evidence": []
    }
  ]
}
</script>
```

The queue is canonical run state for agents. The visible tables explain it for humans.

Keep the report updated with:

- Run ID, date, target repo, Foundation path or revision if known.
- Run log path and last run log sequence.
- Current top-level spec ID, if one exists.
- Proposed spec graph, slice queue, and inventory coverage ledger.
- Overall status: setup complete, in progress, evaluating, complete, or blocked by human decision.
- Slice status from the durable queue enum.
- Remaining slice queue.
- Created or updated spec IDs and file paths.
- Evidence paths loaded for each slice.
- Coverage by layer: inventory, user flows, rendered UX where applicable, behavior rules, technical contracts, and evidence traceability.
- Observed behavior, inferred intent, required future contract, and unresolved human decisions for each slice.
- Architecture classification: required contracts, current implementation evidence, architecture constraints, and implementation latitude.
- Slice evaluation status and graph evaluation status, including evaluation report path.
- Material contradictions, stale docs, missing intent, and unresolved decisions.
- Fallback behavior discovered in code that needs a human decision about intended behavior.
- Current slice and next slice.

Flag material discrepancies at the level that changes product or system intent. Keep the report focused on decisions that affect the spec graph.

The report is run state. A named next slice is the next action.

## Resumable Loop

Backfill work must run as a loop so a large repo can be handled across many sessions.

At the start of each loop:

1. Read target `AGENTS.md`.
2. Read Foundation `AGENTS.md`.
3. Read this skill.
4. Read the dated review report if it exists.
5. Read the existing run log if it exists and append a `checkpoint` event when resuming.
6. Read the top-level system/app spec if it exists.
7. Use `backfill-repo-inventory` to create or refresh the inventory and coverage ledger.
8. Create or refresh the embedded durable queue from the inventory ledger.
9. Pick the next queued, in-progress, or revision-ready slice.
10. Append run-log `start` and `complete` events for each phase as it begins and finishes.
11. Use `backfill-user-flow-extraction` for user-facing slices before drafting descriptive prose.
12. Use `backfill-descriptive-spec-author` to write or update descriptive specs.
13. Use `backfill-rendered-ux-spec` when the slice has visual or UX-visible behavior.
14. Use `backfill-technical-spec-author` to write or update technical specs.
15. Use `backfill-spec-adequacy-review` to review the slice against evidence and revise until it is ready for strict evaluation.
16. Use `evaluate-backfill-specs` on the slice.
17. If the slice scores below acceptable, update the queue to `needs-revision`, route the category gaps to the owning skill, revise, and re-evaluate.
18. Mark the slice `acceptable` only when the evaluator threshold passes.
19. Run `npm run backfill:queue:check -- <target-repo>/docs/specs/backfill/review-report-YYYYMMDD-NN.html` from Foundation after durable queue changes.
20. Run `npm run backfill:run-log:check -- <target-repo>/docs/specs/backfill/run-log-YYYYMMDD-NN.jsonl` from Foundation after run-log updates.
21. Run registry/check commands required by the target repo and Foundation process.
22. Append the slice result, remaining queue, run log path, and last run log sequence to the report.
23. Start the next queued slice from the report.

Use the report and specs as the durable handoff for long-running state.
Backfill is complete when every relevant inventory item is mapped to an acceptable slice, intentionally covered by a parent spec section, explicitly marked out of scope, or blocked by a named human decision. When slice coverage is complete, use `evaluate-backfill-specs` on the full graph. If graph evaluation returns `needs revision`, route the revision queue back through the owning backfill skill layers.

## Slice Strategy

At the start of a run, map the repo at a useful altitude:

- top-level product/app boundary
- applications and packages in a monorepo
- user-facing routes or flows
- major services, workers, APIs, and integrations
- data model domains and ownership boundaries
- infrastructure areas that materially affect behavior

Create the top-level system/app spec early. It is the spine for child specs and should own product promise, domain vocabulary, repo boundaries, and the proposed spec graph.

Then work one bounded slice at a time. Prefer slices that are small enough to score strictly:

- one concrete user journey or role-specific workflow
- one permission or entitlement flow
- one data lifecycle or state-machine flow
- one API resource family with clear user/operator outcome
- one worker/job/integration contract
- one infrastructure contract that materially affects behavior

Parent specs define vocabulary, boundaries, and child graph structure. Child specs carry behavior. A broad slice such as "web app", "identity", or "infrastructure" is acceptable only as a parent map unless it has no meaningful child behavior.

## Writing Specs

For each slice, separate evidence from intent:

1. Use target-owned spec IDs, never `foundation.*` for product specs.
2. Set `status: draft`.
3. Link parent, child, sibling, descriptive, and technical specs where known.
4. Record observed current behavior.
5. Record inferred product/system intent.
6. Record required future contract.
7. Record unresolved human decisions.
8. Keep descriptive specs architecture-agnostic by default: users, operator goals, flows, states, rules, outcomes, rendered UX, and product intent.
9. Keep technical specs contract-first: required contracts, current evidence, architecture constraints, implementation latitude, data/API/service rules, operational behavior, and evidence paths.
10. Name evidence paths in prose, metadata, or the report where they are useful for review.
11. Preserve old docs and code.
12. Regenerate the registry and run spec checks before handoff.

If a fallback path exists in code, record it as current evidence and add a review question about whether it is intended. Write the intended spec around supported product behavior.

## Handoff

When the backfill is complete, report:

- Specs created or updated.
- Inventory coverage status.
- Adequacy review status.
- Evaluation result and evaluation report path.
- Registry/check commands run and results.
- Report path.
- Run log path and last run log sequence.
- Material unresolved decisions.
- Remaining review queue.

Present the final handoff when the report shows coverage across the backfill graph.
