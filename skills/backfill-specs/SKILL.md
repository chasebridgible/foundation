---
name: backfill-specs
description: Orchestrate a complete existing-repo spec backfill by running Foundation backfill sub-skills for inventory, user-flow extraction, descriptive specs, rendered UX, technical specs, and adequacy review. Use when adopting an existing repo into Foundation, mapping code/docs into intended behavior, or resuming a long-running repo backfill.
---

# Backfill Specs

Use this skill after a target repo is connected to Foundation. It orchestrates smaller backfill skills that extract intended behavior from current evidence and turn it into a complete draft descriptive and technical spec graph.

The output is intent-rigid and architecture-flexible. Descriptive specs define what the system is meant to make possible. Technical specs define required contracts and distinguish current implementation evidence from architecture constraints and implementation latitude.

A request to backfill a repo means the whole repo. After each successful slice, update the report and continue to the next unbackfilled slice until the proposed spec graph is drafted end-to-end.

This skill owns spec artifacts and backfill reports. Existing code and old docs stay in place during backfill. A separate cleanup pass begins when the user asks for one.

## Skill Chain

Run these skills as the backfill loop requires:

1. `skills/backfill-repo-inventory/SKILL.md` - create and maintain the evidence inventory and coverage ledger.
2. `skills/backfill-user-flow-extraction/SKILL.md` - extract concrete user flows from routes, screens, components, docs, and tests.
3. `skills/backfill-descriptive-spec-author/SKILL.md` - write intent-grade descriptive specs from flow evidence.
4. `skills/backfill-rendered-ux-spec/SKILL.md` - add interactive HTML-native rendered experience sections for visual/user-facing slices.
5. `skills/backfill-technical-spec-author/SKILL.md` - write technical contracts that support the intended behavior.
6. `skills/backfill-spec-adequacy-review/SKILL.md` - review the slice against evidence and revise before marking it drafted.
7. `skills/evaluate-backfill-specs/SKILL.md` - evaluate the completed graph against the golden example and rubric before final handoff.

The orchestrator owns sequencing and durable state. The sub-skills own their layer.

## Entry Conditions

Before starting or resuming backfill work:

1. Read the target repo `AGENTS.md`.
2. Read Foundation `AGENTS.md`.
3. Read this skill.
4. Run or confirm `npm run foundation:doctor -- --repo <target-repo>` from Foundation.
5. Read the current dated backfill report if the target repo names one.
6. Read the top-level system/app spec if it exists.

When the repo still needs a Foundation connection, use `skills/install-foundation-substrate/SKILL.md` first.

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
- Repo inventory and coverage ledgers in the review report, or in `docs/specs/backfill/repo-inventory-YYYYMMDD-NN.html` when the inventory is too large for the report.
- Test specs are handled by a later test-backfill skill when the user includes test backfill.

Backfilled specs must start with `status: draft`. Use `confidence: low` or `confidence: medium` until human review upgrades them.

Use a dated run ID for reports:

- Review report: `docs/specs/backfill/review-report-YYYYMMDD-NN.html`.
- Optional final handoff artifact: `docs/specs/backfill/backfill-handoff-YYYYMMDD-NN.html`.

Use the same run ID across reports from one backfill run. Continue the existing dated report when resuming a run; start a new run when the user asks for one.

## Report Contract

The review report is temporary working state and may be deleted after review. It must be useful after context reset.

Keep it updated after each slice with:

- Run ID, date, target repo, Foundation path or revision if known.
- Current top-level spec ID, if one exists.
- Proposed spec graph, slice queue, and inventory coverage ledger.
- Overall status: in progress or complete.
- Slice status: queued, inventory ready, flows extracted, descriptive drafted, technical drafted, adequacy reviewed, needs review, approved, or out of scope.
- Remaining slice queue.
- Created or updated spec IDs and file paths.
- Evidence paths loaded for each slice.
- Coverage by layer: inventory, user flows, rendered UX where applicable, behavior rules, technical contracts, and evidence traceability.
- Architecture classification: required contracts, current implementation evidence, architecture constraints, and implementation latitude.
- Evaluation status and evaluation report path once graph coverage is complete.
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
5. Read the top-level system/app spec if it exists.
6. Use `backfill-repo-inventory` to create or refresh the inventory and coverage ledger.
7. Pick the next slice from the ledger.
8. Use `backfill-user-flow-extraction` for user-facing slices before drafting descriptive prose.
9. Use `backfill-descriptive-spec-author` to write or update descriptive specs.
10. Use `backfill-rendered-ux-spec` when the slice has visual or UX-visible behavior.
11. Use `backfill-technical-spec-author` to write or update technical specs.
12. Use `backfill-spec-adequacy-review` to review the slice against evidence and revise until it passes.
13. Run registry/check commands required by the target repo and Foundation process.
14. Append the slice result and remaining queue to the report.
15. Start the next unbackfilled slice from the report.

Use the report and specs as the durable handoff for long-running state.
Backfill is complete when every relevant inventory item is mapped to an adequate spec, intentionally covered by a parent spec section, or explicitly marked out of scope.
When coverage is complete, use `evaluate-backfill-specs` to create the evaluation report. If evaluation returns `needs revision`, route the revision queue back through the owning backfill skill layers.

## Slice Strategy

For the first pass, map the repo at a useful altitude:

- top-level product/app boundary
- applications and packages in a monorepo
- user-facing routes or flows
- major services, workers, APIs, and integrations
- data model domains and ownership boundaries
- infrastructure areas that materially affect behavior

Create the top-level system/app spec early. It is the spine for child specs and should own product promise, domain vocabulary, repo boundaries, and the proposed spec graph.

Then work one bounded slice at a time. Prefer user-flow-sized child specs when a domain contains multiple journeys, screens, roles, API resources, data entities, jobs, or operational processes. Parent specs define vocabulary, boundaries, and child graph structure. Child specs carry behavior.

## Writing Specs

For each slice, write current evidence as intended behavior:

1. Use target-owned spec IDs, never `foundation.*` for product specs.
2. Set `status: draft`.
3. Link parent, child, sibling, descriptive, and technical specs where known.
4. Keep descriptive specs architecture-agnostic by default: users, operator goals, flows, states, rules, outcomes, rendered UX, and product intent.
5. Keep technical specs contract-first: required contracts, current evidence, architecture constraints, implementation latitude, data/API/service rules, operational behavior, and evidence paths.
6. Name evidence paths in prose, metadata, or the report where they are useful for review.
7. Preserve old docs and code.
8. Regenerate the registry and run spec checks before handoff.

If a fallback path exists in code, record it as current evidence and add a review question about whether it is intended. Write the intended spec around supported product behavior.

## Handoff

When the backfill is complete, report:

- Specs created or updated.
- Inventory coverage status.
- Adequacy review status.
- Evaluation result and evaluation report path.
- Registry/check commands run and results.
- Report path.
- Material unresolved decisions.
- Remaining review queue.

Present the final handoff when the report shows coverage across the backfill graph.
