---
name: long-running-agent-worker
description: Run a long-running Codex worker task through bounded durable progress until a shift clock or other durable exit criterion is satisfied. Use for shift-clocked research passes, broad repo backfills, recurring scout-style runs, automation dry runs, or any agent task where sustained state, checks, recovery, and handoff determine whether the result can be trusted.
---

# Long-Running Agent Worker

Owning capability: `foundation.long-running-agent-work.capability`.
Owning job: `foundation.long-running-agent-worker.job`.
Supporting technical spec when a shift clock is used: `foundation.shift-clock.technical`.
Supporting eval spec when a shift clock is used: `foundation.shift-clock.eval`.

## Stable Principle

Choose useful bounded work until the exit gate is actually satisfied. Preserve enough durable state that another agent can resume from artifacts instead of chat memory.

## Start Contract

1. Create or confirm a Codex Goal when the harness supports goals.
2. Read the local `AGENTS.md`, Foundation `AGENTS.md`, the owning repo skill/specs, and any task-specific source registry or state files.
3. Work on a branch or worktree before editing durable artifacts.
4. Create a run ID and durable run record before doing substantive work.
5. Start or record the shift clock immediately when the task asks for one. Persist `startedAt`, `deadlineAt`, `duration`, and the command or mechanism used.
6. Name the final artifact contract before the loop starts: which records belong in reviewer-facing output, which belong in internal evidence, and which belong only in rejections, routes, coverage, or notes.

## Work Loop

Repeat this loop until the exit gate passes:

1. Select exactly one bounded unit: a source target, row, file, queue item, route, test failure, quality audit, or focused search family.
2. Load only the context needed for that unit.
3. Produce one durable update: finding, rejection, no-result record, source status, code/spec patch, validation receipt, or handoff note.
4. Run the cheapest relevant check after material changes.
5. Record evidence and the next useful unit before moving on.

When the obvious queue is exhausted, choose adjacent useful work that still supports the goal:

- `needs_recheck`, stale, blocked, or low-confidence targets;
- exact-source URL verification;
- duplicate and low-quality row audits;
- contact, owner, date, status, location, or source-link enrichment;
- explicit no-result searches with recorded terms;
- scoped rejections for plausible but off-target sources;
- checker, report, workbook, or handoff consistency work.

Adjacent work must preserve artifact boundaries. Put internal routes, monitor leads, low-confidence seeds, no-result searches, and coverage notes in the correct internal corpus, route sheet, rejection log, coverage record, or handoff note unless the final artifact contract explicitly accepts that row type.

## Shift Clock Practice

- Treat committed clock time as useful work time.
- Check the shift clock at real exit or handoff gates after a substantial work block.
- A good default threshold is both: at least 30 minutes since the previous shift-clock check, and at least 12 bounded records, validations, or source-family attempts since that check.
- When the check returns `expired:false`, record that the exit gate remains open, then continue with another useful unit.
- When the check returns `expired:true`, finish the current bounded unit, run final checks and reports, then complete the run.
- When writing reports or briefs, include shift-clock status only for the current run ID. Keep prior clock receipts as history.
- Legacy project commands or files may still be named `timer`; apply the shift-clock behavior contract even when the interface has not been renamed.

Short shift-clock checks are useful near the actual deadline or when an external blocker genuinely prevents further useful work. A repeated clock check needs intervening evidence-backed work.

## Scoreboard

- Earn credit for each useful source-backed finding, rejection, verification, no-result record, cleanup, validation, or artifact repair.
- Earn credit when an `expired:false` check leads to more useful bounded work.
- Record correction signals for repeated clock checks without substantive work between them.
- Treat durable evidence, artifact quality, and handoff clarity as the score that matters.

## Quality Boundaries

- Make source-exhaustion claims specific to the source family, search terms, dates, and evidence checked.
- Add rows only when they meet the artifact's scope and quality contract.
- Keep shareable artifacts separate from ongoing routes, monitoring seeds, and internal next actions.
- Preserve required sheets, categories, views, and row-type separation.
- Store durable state outside chat.
- After compaction or crash, reread run state from disk before acting.
- Prove important work with checks, evals, source evidence, or reviewer-visible receipts.

## Recovery

After a crash, compaction, model restart, or thread resume:

1. Read the goal, branch, run ID, shift-clock state, status, latest receipts, and uncommitted files.
2. Continue the same run when state is coherent; restart only when state is corrupt or the owner asks.
3. Preserve observed workflow issues as evidence, then resume useful bounded work.
4. If the worker cannot proceed, write an explicit blocker with evidence and the smallest human action needed.

## Exit Criteria

The run is complete only when:

- the exit gate permits completion;
- durable artifacts are current;
- reviewer-facing artifacts still match their row-type contract and have not lost required sheets, tabs, columns, or category separation;
- checks, reports, and any workbook or generated artifact validations have run;
- changed files are committed or a merge/publish blocker is recorded;
- the Codex Goal is marked complete when available;
- the final handoff names run ID, branch, commit or blocker, shift-clock start/deadline/final check when present, useful work completed, files changed, validations, unresolved risks, and exact continuation point.
