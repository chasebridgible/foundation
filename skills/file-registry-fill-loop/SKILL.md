---
name: file-registry-fill-loop
description: Fill or resume the Foundation File Registry layer for a target repo by reading the active report, manifest, registry, run log, and source files; mapping bounded pending batches; running deterministic checks; and producing eval receipts before handoff.
---

# File Registry Fill Loop

Use this skill when a target repo is creating, refreshing, or resuming a Foundation file registry.

## Source Of Truth

Read these before changing rows:

- target repo `AGENTS.md`
- Foundation `AGENTS.md`
- `docs/specs/foundation-backfill-file-registry.html`
- `docs/specs/foundation-backfill-file-registry-technical.html`
- `docs/specs/foundation-backfill-file-registry-test.html`
- active target report and run log named by the target repo

## Commands

- Initialize: `npm run foundation:file-registry:init -- --repo <repo> --run-id <run-id>`
- Fill a bounded batch: `npm run foundation:file-registry:fill -- --repo <repo> --run-id <run-id> --batch-size 25`
- Check during a batch: `npm run foundation:file-registry:check -- --repo <repo> --run-id <run-id> --phase batch`
- Check handoff: `npm run foundation:file-registry:check -- --repo <repo> --run-id <run-id> --phase handoff`
- Evaluate: `npm run foundation:file-registry:eval -- --repo <repo> --run-id <run-id>`
- Graph check when specs/capabilities exist: `npm run foundation:file-registry:graph-check -- --repo <repo> --run-id <run-id> --mode strict`
- Refresh changed files: `npm run foundation:file-registry:refresh -- --repo <repo> --run-id <run-id>`
- Record report state: `npm run foundation:file-registry:report -- --repo <repo> --run-id <run-id> --report <active-report>`

## Loop

1. Read the current manifest and registry.
2. Select the next pending batch in registry order unless the report names a higher-risk batch.
3. Inspect the source files and immediately related files needed to understand the batch.
4. Update only those rows to `mapped`.
5. Keep uncertainty inside `reviewFlags`; do not create extra statuses.
6. Run the batch checker.
7. Repeat until no pending rows remain.
8. Run handoff check, eval, and graph check when graph artifacts exist.
9. Record artifact paths, pending count, checker result, eval result, latest run-log sequence, and next layer in the target report.

The deterministic fill command is a V1 assistant for creating a first-pass row. Eval findings or human review still route weak rows back through this loop.
