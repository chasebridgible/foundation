---
name: research-corpus-refresh
description: Run or implement repeatable research-corpus refresh workflows that collect source-backed findings into durable JSON/JSONL, regenerate a readable workbook or share artifact, validate scope and coverage, publish a review-first branch/PR, and notify the owner. Use when research should persist beyond chat or tmp files, when scheduled agents refresh contacts/events/opportunities, or when a project needs the Foundation scout-style JSON plus workbook pattern.
---

# Research Corpus Refresh

Use this skill when a project needs recurring or one-time research to become durable, reviewable, and repeatable.

Owning capability: `foundation.make-outstanding-work-repeatable.capability`.
Owning job: `foundation.research-corpus-refresh.job`.
Technical spec: `foundation.research-corpus-refresh.technical`.
Eval spec: `foundation.research-corpus-refresh.eval`.

## Core Rule

Treat the workbook as a derived human view, not the source of truth. Canonical JSON/JSONL records must preserve what was searched, what was found, what was rejected, where the evidence came from, and what changed during the run.

## Read First

1. Read the target repo `AGENTS.md`.
2. Read the target repo research skill and specs.
3. Read the current corpus, source registry, latest workbook, latest brief, and prior run receipts.
4. Read this Foundation job, technical, and eval spec only as the reusable process contract.

## Implementation Checklist

When building or revising a project research system, ensure the project defines:

- Scope: in-scope categories, lower-ranked categories, and explicit exclusions.
- Source universe: source families, URLs, regions, search terms, cadence, and terminal statuses.
- Canonical state: JSON/JSONL schema for runs, sources, findings, rejections, coverage, briefs, merge receipts, and notifications.
- Receipt idempotency: rerunning `report` for the same run ID should update or replace same-run report receipts instead of appending duplicates.
- Commands: `init`, `next`, `record`, `check`, `report`, and `test` equivalents.
- Workbook view: share-first sheets with simple columns, internal route/monitor sheets when useful, and readback validation.
- Publish path: dated branch, checks, PR, owner notification, and explicit blockers.
- Revision path: which spec, skill, checker, exporter, or source registry changes when results are noisy or wrong.

## Refresh Workflow

1. Start on a clean project branch or create a dated `codex/` branch before writing.
2. Run the project `init` command to create or update the run manifest and source universe.
3. Select exactly one bounded work unit with `next`: one source, region, facility group, query family, or equivalent target.
4. Research that target with source-backed evidence. Preserve exact URLs and the search terms that led to useful findings.
5. Classify every candidate before accepting it. Record off-scope, duplicate, blocked, or not-yet-published candidates as rejections or monitor records when they are useful.
6. Record accepted findings through the project `record` command or equivalent merge path. Do not hand-edit the workbook as canonical state.
7. Regenerate derived artifacts with `report`: JSON exports, workbook, dated brief, and receipt templates.
8. Run the project checker, tests, workbook readback, and `npm run spec:check` when specs changed.
9. Commit, push, open or update a review PR, and notify the owner. Record a blocker instead of pretending publication or notification happened.

## Timer-Gated Runs

When a run has a work-shift timer:

- Start and persist the timer at the beginning of the run.
- Treat the timer as an exit gate only.
- Do not sleep, idle, or poll the clock as the main activity.
- Check the timer only at natural handoff points, after a substantive work batch, or when the agent believes it is ready to exit.
- If the timer is not expired, continue useful work by selecting new targets, expanding search terms, checking sources, improving records, validating exports, or tightening specs.
- Final handoff must include timer start, deadline, final expired result, check count, and evidence that earlier non-expired checks triggered more work.
- Reports and briefs must only attach timer status for the current run ID. Historical timer receipts remain evidence, but stale timers must not appear as if they governed the current run.

## Workbook Rules

- Keep share-first sheets readable for humans.
- Put dates, facility names, event titles, contacts, locations, and source links before scores or internal notes unless the project spec says otherwise.
- Keep internal next actions, long rationale, raw route notes, and monitor-only records on internal sheets or in briefs.
- Separate dated events from ongoing procurement routes, monitors, and evergreen contact paths.
- Validate workbook import/readback after report generation, including sheet placement rules for rows that must stay out of share-first sheets.

## Exit Criteria

A refresh is complete only when:

- Required source families have terminal coverage statuses or explicit blockers.
- Accepted findings are source-backed and in scope.
- Rejections or monitor records explain useful excluded candidates.
- Canonical corpus and workbook agree.
- Project checks and tests pass or blockers are recorded.
- A dated brief summarizes changed rows, top opportunities, blockers, workbook path, and requested owner action.
- Branch, commit, PR or blocker, and notification receipt or blocker are recorded.
