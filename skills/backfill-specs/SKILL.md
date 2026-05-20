---
name: backfill-specs
description: Convert an existing repository into a Foundation spec system by inspecting current code, schemas, tests, and documentation, then creating draft descriptive and technical specs plus a dated HTML backfill review report. Use when adopting a repo that did not start with Foundation, backfilling specs from code/docs, mapping current behavior into intended behavior, or resuming a long-running repo spec backfill.
---

# Backfill Specs

Use this skill after a target repo is connected to Foundation. It turns current repo behavior into draft descriptive and technical specs that state how the system is intended to work from this point forward.

This is not a code cleanup skill. Leave existing code and old docs alone unless the user explicitly asks for a separate cleanup pass.

## Entry Conditions

Before starting or resuming backfill work:

1. Read the target repo `AGENTS.md`.
2. Read Foundation `AGENTS.md`.
3. Read this skill.
4. Run or confirm `npm run foundation:doctor -- --repo <target-repo>` from Foundation.
5. Read the current dated backfill report if the target repo names one.
6. Read the top-level system/app spec if it exists.

If the repo is not connected to Foundation yet, use `skills/install-foundation-substrate/SKILL.md` first.

## Source Of Truth

Use evidence in this order:

1. Current code, routes, components, services, jobs, infrastructure, and config.
2. Database schemas, data models, migrations, fixtures, and seed data.
3. Tests, evals, snapshots, generated artifacts, and runtime traces.
4. Product docs, plans, READMEs, diagrams, tickets, and notes.
5. Human clarification when evidence conflicts or intent is materially ambiguous.

Docs are secondary evidence. Treat stale docs as clues, not truth. Specs should not merely describe accidental implementation; they should state the intended system behavior supported by the best available evidence.

## Backfill Artifacts

Create artifacts in the target repo, not Foundation, unless the repo being backfilled is Foundation itself.

- Draft descriptive specs in `docs/specs/`.
- Draft technical specs in `docs/specs/`.
- Ongoing review reports in `docs/specs/backfill/`.
- No test specs unless the user explicitly includes test backfill. Test backfill is expected to become a separate skill.

Backfilled specs must start with `status: draft`. Use `confidence: low` or `confidence: medium` until human review upgrades them.

Use a dated run ID for reports:

- Review report: `docs/specs/backfill/review-report-YYYYMMDD-NN.html`.
- Optional final handoff artifact: `docs/specs/backfill/backfill-handoff-YYYYMMDD-NN.html`.

Use the same run ID across reports from one backfill run. Continue the existing dated report when resuming a run unless the user asks to start a new run.

## Report Contract

The review report is temporary working state and may be deleted after review. It must be useful after context reset.

Keep it updated after each slice with:

- Run ID, date, target repo, Foundation path or revision if known.
- Current top-level spec ID, if one exists.
- Proposed spec graph and slice queue.
- Slice status: not started, in progress, drafted, needs human review, approved, blocked.
- Created or updated spec IDs and file paths.
- Evidence paths loaded for each slice.
- Material contradictions, stale docs, missing intent, and unresolved decisions.
- Fallback behavior discovered in code that needs a human decision about intended behavior.
- Next-slice recommendation.

Flag material discrepancies only. Do not turn the report into a line-by-line critique of every old doc.

## Resumable Loop

Backfill work must run as a loop so a large repo can be handled across many sessions.

At the start of each loop:

1. Read target `AGENTS.md`.
2. Read Foundation `AGENTS.md`.
3. Read this skill.
4. Read the dated review report if it exists.
5. Read the top-level system/app spec if it exists.
6. Pick the next slice from the report or create the first slice queue.
7. Load only the evidence needed for that slice.
8. Create or update draft descriptive and technical specs for that slice.
9. Run registry/check commands required by the target repo and Foundation process.
10. Append the slice result to the report.
11. Stop with a clear next-slice recommendation, or continue if context and budget allow.

Never rely on model memory for long-running state. The report and specs are the durable handoff.

## Slice Strategy

For the first pass, map the repo at a useful altitude:

- top-level product/app boundary
- applications and packages in a monorepo
- user-facing routes or flows
- major services, workers, APIs, and integrations
- data model domains and ownership boundaries
- infrastructure areas that materially affect behavior

Create the top-level system/app spec early. It is the spine for child specs and should own product promise, domain vocabulary, repo boundaries, and the proposed spec graph.

Then work one bounded slice at a time. Prefer a slice that can produce one descriptive spec and one technical spec without reading the entire repo.

## Writing Specs

For each slice:

1. Use current behavior as evidence, but write the spec as intended behavior.
2. Name evidence paths in prose or metadata where they are useful for review.
3. Use target-owned spec IDs, never `foundation.*` for product specs.
4. Set `status: draft`.
5. Link parent, child, sibling, descriptive, and technical specs where known.
6. Avoid inventing intent when docs and code conflict. Record the conflict in the report.
7. Preserve old docs and code.
8. Regenerate the registry and run spec checks before handoff.

If a fallback path exists in code, record it as current evidence and ask whether it is intended. Do not frame the intended spec as "old way plus fallback" unless the fallback is explicitly a supported product mode.

## Handoff

End each session with:

- Specs created or updated.
- Registry/check commands run and results.
- Report path.
- Material unresolved decisions.
- Recommended next slice.

If the user has set a long-running goal, keep moving through the loop until context, budget, validation failure, or a material human decision blocks the next slice.
