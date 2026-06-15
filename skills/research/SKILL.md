---
name: research
description: Run or implement repeatable research workflows that collect source-backed findings into durable storage, regenerate a readable access surface such as a workbook, dashboard, or brief, validate scope and coverage, publish a review-first branch/PR, and notify the owner. Use when research should persist beyond chat or tmp files, when scheduled agents update contacts/events/opportunities, or when a project needs the Foundation scout-style storage plus access-surface pattern.
---

# Research

Use this skill when a project needs recurring or one-time research to become durable, reviewable, and repeatable.

Owning capability: `foundation.make-outstanding-work-repeatable.capability`.
Owning job: `foundation.research.job`.
Technical spec: `foundation.research.technical`.
Eval spec: `foundation.research.eval`.

## Core Rule

Treat the access surface as a derived view for people, not the source of truth. Durable storage records must preserve what was searched, what was found, what was rejected, where the evidence came from, and what changed during the run. JSON/JSONL is the lightweight default; a production database can satisfy the same contract when a project needs one. A workbook is one access surface; a dashboard, HTML report, or app view can satisfy the same role.

## Read First

1. Read the target repo `AGENTS.md`.
2. Read the target repo research skill and specs.
3. Read the current storage/corpus, source registry, latest access surface, latest brief, and prior run receipts.
4. Read this Foundation job, technical, and eval spec only as the reusable process contract.

## Implementation Checklist

When building or revising a project research system, ensure the project defines:

- Scope: in-scope categories, lower-ranked categories, and explicit exclusions.
- Setup questions: what the agent is searching for, who will use the result, where it should look, what it should skip, what proof is enough, what matters most, how often it should run, when it is done, what it should save, and who checks it.
- Search plan/source universe: source families, URLs, regions, search terms, cadence, blocked or monitor-only sources, and terminal statuses.
- Storage: schema for runs, sources, findings, rejections, coverage, briefs, merge receipts, and notifications. JSON/JSONL is acceptable, but the concept is durable state, not a file format.
- Receipt idempotency: rerunning `report` for the same run ID should update or replace same-run report receipts instead of appending duplicates.
- Commands: `init`, `next`, `record`, `check`, `report`, and `test` equivalents.
- Merge and cleanup path: dated branch, changed-row review, checks, PR or merge, owner notification, cleanup notes, and explicit blockers.
- Access surface: share-first dashboard, sheets, HTML view, or brief with simple fields, internal route/monitor views when useful, and readback validation.
- Revision path: which spec, skill, checker, exporter, or source registry changes when results are noisy or wrong.

## Search Tool Order

- Start with the project source list. These are the known trusted or high-priority places.
- Open one real source target at a time: official page, calendar, directory, PDF, portal, facility, region, or source family.
- Use web search to find missing doors, not as final proof. Preserve useful search terms.
- Use special places when the target calls for them: LinkedIn for people, procurement portals for buyers, event calendars for conferences, association pages for member events, and news pages for announcements.
- Use an official API or crawler such as Firecrawl only when the project needs repeatable collection across many pages or pages are easier to fetch structurally. The project must still save source URLs and evidence.
- Record the outcome before moving on: found, rejected, searched no result, blocked, not published yet, needs recheck, or project-approved equivalent.

## Research Workflow

1. Start on a clean project branch or create a dated `codex/` branch before writing.
2. Run the project `init` command to create or update the run manifest and configured search plan/source universe.
3. Select exactly one bounded work unit with `next`: one source, region, facility group, query family, or equivalent target.
4. Research that target with source-backed evidence. Preserve exact URLs and the search terms that led to useful findings.
5. Classify every candidate before accepting it. Record off-scope, duplicate, blocked, or not-yet-published candidates as rejections or monitor records when they are useful.
6. Record accepted findings through the project `record` command or equivalent merge path. Do not hand-edit the access surface as durable state.
7. Regenerate derived artifacts with `report`: storage exports, access surfaces, dated brief, and receipt templates.
8. Run the project checker, tests, access-surface readback, changed-row review, and `npm run spec:check` when specs changed.
9. Commit, push, open or update a review PR, merge when policy allows, notify the owner, and record cleanup notes. Record a blocker instead of pretending publication or notification happened.
10. Hand off the final access links or paths only after the publish path is clean or explicitly blocked.

## Shift-Clocked Runs

When a run has a shift clock:

- Start and persist the shift clock at the beginning of the run.
- Treat the shift clock as an exit gate only.
- Do not sleep, idle, or poll the clock as the main activity.
- Check the shift clock only at natural handoff points, after a substantive work batch, or when the agent believes it is ready to exit.
- If the shift clock is not expired, continue useful work by selecting new targets, expanding search terms, checking sources, improving records, validating exports, or tightening specs.
- Final handoff must include shift-clock start, deadline, final expired result, check count, and evidence that earlier non-expired checks triggered more work.
- Reports and briefs must only attach shift-clock status for the current run ID. Historical clock receipts remain evidence, but stale receipts must not appear as if they governed the current run.
- Legacy project commands or files may still be named `timer`; their specs should describe the behavior as a shift clock until those interfaces are renamed.

## Access Surface Rules

- Keep share-first views readable for humans.
- Put dates, facility names, event titles, contacts, locations, and source links before scores or internal notes unless the project spec says otherwise.
- Keep internal next actions, long rationale, raw route notes, and monitor-only records on internal views or in briefs.
- Separate dated events from ongoing procurement routes, monitors, and evergreen contact paths.
- Validate access-surface import/readback after report generation, including placement rules for rows or records that must stay out of share-first views.
- Treat access links as final-facing only after changed rows, checks, PR/merge state, and cleanup notes have been recorded.

## GitHub Publish Pattern

Use this pattern when the project stores research in GitHub:

1. Start in a clean checkout or worktree and create a dated `codex/` branch before writing.
2. Commit only the intended saved records, generated access surfaces, briefs, receipts, specs, skills, tests, or validator changes.
3. Push the branch and open or update a PR.
4. Wait for required GitHub checks in addition to running local checks.
5. Merge only when checks pass, branch protection allows it, and the changes are routine research state, workbook/dashboard/brief output, or other project-approved safe changes.
6. Leave the PR open for owner review when the run changes scope rules, specs, skills, search policy, validation policy, or anything requiring judgment.
7. Notify the owner through the configured PR comment, issue comment, GitHub App, email bridge, or project-approved receipt path.
8. Record explicit blockers for missing auth, missing checks, merge protection, failed checks, missing notification secrets, or unavailable notification commands.

## Exit Criteria

A research run is complete only when:

- Required source families have terminal coverage statuses or explicit blockers.
- Accepted findings are source-backed and in scope.
- Rejections or monitor records explain useful excluded candidates.
- Durable storage and access surface agree.
- Project checks and tests pass or blockers are recorded.
- Branch, commit, PR or blocker, and notification receipt or blocker are recorded.
- Merge or explicit merge blocker and cleanup notes are recorded.
- A dated brief summarizes changed rows, top opportunities, blockers, final access links or paths, and requested owner action.
