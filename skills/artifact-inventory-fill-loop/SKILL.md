---
name: artifact-inventory-fill-loop
description: Fill or resume the Foundation Artifact Inventory layer for a target repo by reading the active report, manifest, artifact inventory, run log, and source files; mapping bounded pending batches; running deterministic checks; and producing eval receipts before handoff.
---

# Artifact Inventory Fill Loop

Use this skill when a target repo is creating, refreshing, or resuming a Foundation Artifact Inventory.

## Source Of Truth

Read these before changing rows:

- target repo `AGENTS.md`
- Foundation `AGENTS.md`
- `docs/specs/foundation-backfill-artifact-inventory.html`
- `docs/specs/foundation-backfill-artifact-inventory-technical.html`
- `docs/specs/foundation-backfill-artifact-inventory-eval.html`
- active target report and run log named by the target repo

## Commands

- Initialize: `npm run foundation:artifact-inventory:init -- --repo <repo> --run-id <run-id>`
- Fill a bounded batch: `npm run foundation:artifact-inventory:fill -- --repo <repo> --run-id <run-id> --batch-size 25`
- Check during a batch: `npm run foundation:artifact-inventory:check -- --repo <repo> --run-id <run-id> --phase batch`
- Check handoff: `npm run foundation:artifact-inventory:check -- --repo <repo> --run-id <run-id> --phase handoff`
- Evaluate: `npm run foundation:artifact-inventory:eval -- --repo <repo> --run-id <run-id>`
- Graph check when specs/capabilities exist: `npm run foundation:artifact-inventory:graph-check -- --repo <repo> --run-id <run-id> --mode strict`
- Refresh changed files: `npm run foundation:artifact-inventory:refresh -- --repo <repo> --run-id <run-id>`
- Record report state: `npm run foundation:artifact-inventory:report -- --repo <repo> --run-id <run-id> --report <active-report>`

## Graph Metadata

Artifact Inventory rows are upstream evidence for the Visible Business Graph. While this skill does not usually edit specs directly, preserve graph-relevant signals in the inventory rows: candidate systems, capabilities, jobs, processes, actors, tools, evidence paths, metrics, gaps, and source sections. When this layer causes specs to be created or revised, the downstream spec author must update `graph-metadata` and run `npm run foundation:visible-business-graph:check -- --repo <repo>`.

## Loop

1. Read the current manifest and registry.
2. Select the next pending batch in registry order unless the report names a higher-risk batch.
3. Inspect the source files and immediately related files needed to understand the batch.
4. Update only those rows to `mapped`.
5. Keep uncertainty inside `reviewFlags`; do not create extra statuses.
6. Run the batch checker.
7. Repeat until no pending rows remain.
8. Run handoff check, eval, and graph check when graph artifacts or specs exist.
9. Record artifact paths, pending count, checker result, eval result, latest run-log sequence, and next layer in the target report.

The deterministic fill command is a V1 assistant for creating a first-pass row. Eval findings or human review still route weak rows back through this loop.
