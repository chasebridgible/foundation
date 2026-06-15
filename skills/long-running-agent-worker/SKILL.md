---
name: long-running-agent-worker
description: Run a long-running Codex worker task that must keep making useful, source-backed progress until a shift clock or other durable exit criterion is satisfied. Use for shift-clocked research passes, broad repo backfills, recurring scout-style runs, automation dry runs, or any agent task where early self-declared completion, idling, clock-watching, context loss, or weak handoff would make the result unreliable.
---

# Long-Running Agent Worker

Owning capability: `foundation.shift-clock.capability`.
Owning job: `foundation.backfill-author-specs.job` for skill-file ownership; Shift Clock itself has no child job.
Technical spec: `foundation.shift-clock.technical`.
Eval spec: `foundation.shift-clock.eval`.

## Stable Principle

Treat the shift clock or long-run bound as an exit gate, not a work strategy. The worker should continue useful bounded work until the gate allows exit, while preserving enough durable state that another agent can resume without chat memory.

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

If the obvious queue is exhausted, do not idle. Move to adjacent useful work:

- `needs_recheck`, stale, blocked, or low-confidence targets;
- exact-source URL verification;
- duplicate and low-quality row audits;
- contact, owner, date, status, location, or source-link enrichment;
- explicit no-result searches with recorded terms;
- scoped rejections for plausible but off-target sources;
- checker, report, workbook, or handoff consistency work.

Adjacent work must preserve artifact boundaries. Do not add internal routes, monitor leads, low-confidence seeds, no-result searches, or coverage notes to a reviewer-facing deliverable just because they are useful evidence. Put them in the correct internal corpus, route sheet, rejection log, coverage record, or handoff note unless the final artifact contract explicitly accepts that row type.

## Shift Clock Discipline

- Do not use `sleep`, long waits, clock guard sessions, or idle holding to pass time.
- Do not check the shift clock before each unit.
- Check the shift clock only at a real exit or handoff gate after a substantial work block.
- A good default threshold is both: at least 30 minutes since the previous shift-clock check, and at least 12 bounded records, validations, or source-family attempts since that check.
- If the check returns `expired:false`, record that the attempted exit was blocked, then continue with another useful unit.
- If the check returns `expired:true`, finish the current bounded unit, run final checks and reports, then complete the run.
- When writing reports or briefs, include shift-clock status only for the current run ID. Keep prior clock receipts as history, not as current-run evidence.
- Legacy project commands or files may still be named `timer`; apply the shift-clock behavior contract even when the interface has not been renamed.

Short shift-clock checks are acceptable only near the actual deadline or when an external blocker genuinely prevents further useful work. A repeated clock check without intervening evidence-backed work is a workflow failure.

## Scoreboard

- Earn credit for each useful source-backed finding, rejection, verification, no-result record, cleanup, validation, or artifact repair.
- Earn credit when an `expired:false` check causes more useful bounded work instead of a handoff.
- Take a demerit for repeated clock checks without substantive work between them.
- Treat waiting, sleeping, filler rows, polluted shareable artifacts, stale clock receipts, or claimed effort without durable evidence as failed-run behavior.

## Forbidden Shortcuts

- Do not write a broad "source exhaustion" note and then stop while the shift clock remains open.
- Do not add weak rows merely to stay busy.
- Do not treat a shareable artifact as a scratchpad for ongoing routes, monitoring seeds, or internal next actions.
- Do not collapse different row types into one output surface when the user-facing artifact has separate sheets, categories, or views.
- Do not treat chat updates as durable state.
- Do not rely on inherited context after compaction or crash; reread run state from disk.
- Do not self-certify important work without checks, evals, source evidence, or reviewer-visible receipts.

## Recovery

After a crash, compaction, model restart, or thread resume:

1. Read the goal, branch, run ID, shift-clock state, status, latest receipts, and uncommitted files.
2. Continue the same run when state is coherent; do not restart unless state is corrupt or the owner asks.
3. If the previous worker was idling or clock-watching, preserve that as an observed failure and resume useful bounded work.
4. If the worker cannot proceed, write an explicit blocker with evidence and the smallest human action needed.

## Exit Criteria

The run is complete only when:

- the exit gate permits completion;
- durable artifacts are current;
- reviewer-facing artifacts still match their row-type contract and have not lost required sheets, tabs, columns, or category separation;
- checks, reports, and any workbook or generated artifact validations have run;
- changed files are committed or a merge/publish blocker is recorded;
- the Codex Goal is marked complete when available;
- the final handoff names run ID, branch, commit or blocker, shift-clock start/deadline/final check, shift-clock check count, useful work completed, files changed, validations, unresolved risks, and exact continuation point.
