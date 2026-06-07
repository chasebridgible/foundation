---
name: backfill-record-repo-files
description: Fill or resume the Foundation Artifact Inventory layer for a target repo by reading the active report, manifest, artifact inventory, run log, and exactly one source file at a time; mapping that file's row; running deterministic checks; and producing eval receipts before handoff.
---

# Backfill: Record Repo Files

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
- Get next file: `npm run foundation:artifact-inventory:fill -- --repo <repo> --run-id <run-id> --next`
- Fill one file: `npm run foundation:artifact-inventory:fill -- --repo <repo> --run-id <run-id> --path <repo-relative-file>`
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
2. Use `--next` to select the next pending file.
3. Read exactly that file and only the immediately related files needed to understand it.
4. Fill exactly that file's Artifact Inventory row with `--path`.
5. Keep uncertainty inside `reviewFlags`; do not create extra statuses.
6. Run the batch checker after the current file, or often enough that structural failures are fixed before more files are marked.
7. Repeat until no pending rows remain.
8. Run handoff check, eval, and graph check when graph artifacts or specs exist.
9. Record artifact paths, pending count, checker result, eval result, latest run-log sequence, and next layer in the target report.

The deterministic fill command is a V1 assistant for creating a first-pass row after file review. Eval findings or human review still route weak rows back through this one-file loop. Do not use `--all`, `--batch-size`, generated inventory payloads, shell loops, path-only classifiers, or broad directory summaries to replace file review.
