---
name: watchful-agent-supervisor
description: Observe, steer, and debrief a long-running Codex worker without taking over its task. Use when a user asks to monitor a separate thread, subagent, automation, shift-clocked run, research pass, backfill, scout, or other long-running agent process and wants evidence about whether the agent followed the intended workflow.
---

# Watchful Agent Supervisor

Owning capability: `foundation.long-running-agent-work.capability`.
Owning job: `foundation.long-running-agent-worker.job`.
Supporting technical spec when a shift clock is used: `foundation.shift-clock.technical`.
Supporting eval spec when a shift clock is used: `foundation.shift-clock.eval`.

## Stable Principle

Supervise behavior, not just output. A watcher preserves the worker's autonomy while collecting enough evidence to judge whether the workflow, shift-clock practice, state durability, validation, and handoff actually worked.

## Start Contract

1. Create or confirm a supervisor Codex Goal when the harness supports goals.
2. Capture the worker identity: thread or agent ID, branch/worktree, run ID, model/settings if visible, shift-clock start/deadline, and expected exit criteria.
3. Identify the worker's durable state files, run logs, receipts, generated artifacts, and validation commands.
4. Capture the final artifact contract: expected sheets, sections, row types, categories, columns, and which internal evidence belongs outside the user-facing deliverable.
5. Define success and correction signals before observing.

## Observation Cadence

Use passive reads first. Prefer durable artifacts and thread summaries over interrupting the worker.

- Early startup: check within a few minutes for goal creation, branch/worktree safety, run ID, shift-clock start, and first useful unit.
- Active work: check at coarse intervals, usually 15 to 30 minutes, unless the worker is blocked or high risk.
- Final window: check after the deadline or completion signal for final validation, commit/push, and handoff.

Monitor lightly enough that the worker can keep its own task focus. The watcher should also avoid doing the worker's task in parallel unless explicitly asked.

## Evidence To Collect

- Worker status: active, completed, errored, crashed, queued, blocked, or idle.
- Durable state: run records, shift-clock receipts, source snapshots, merge receipts, reports, workbook or generated artifacts, and git status.
- Progress shape: count of bounded units completed, new records, validations, report regenerations, and artifact changes.
- Artifact shape: whether final deliverables preserve required sheets, tabs, categories, row-type separation, sort order, readable columns, and exclusions for internal notes or routes.
- Shift-clock behavior: current run ID, start time, deadline, check timestamps, expired values, gaps between checks, work evidence between checks, and whether current reports use current-run clock state.
- Recovery behavior: whether the worker resumed from disk state after crash or compaction.
- Final proof: validations, generated artifact checks, commit hash, pushed branch, PR or merge blocker, and goal completion.

## Steering Rules

Intervene only when the observation shows a real workflow failure or likely damage:

- The worker edits `main` or a dirty shared tree when it should branch.
- The worker spends committed work time without producing useful evidence.
- Shift-clock checks happen repeatedly without substantive work between them.
- The worker tries to close while the exit gate remains open.
- The worker accepts findings without source evidence or adds weak filler rows.
- The worker puts internal evidence, route leads, monitor rows, coverage notes, or next actions into a shareable artifact that has separate surfaces for them.
- The worker drops required output surfaces, such as year tabs, summary tabs, route sheets, source sheets, or other user-facing structure.
- The worker is blocked by a recoverable environment issue and cannot process queued guidance.

When steering, be concrete and narrow:

- State the observed issue from artifacts or thread evidence.
- Preserve run ID, branch, shift clock, and current state.
- Tell the worker the next bounded source family, audit, validation, or recovery step.
- Restart only when state is corrupt or the owner asks.
- Let queued guidance be read naturally when the worker is still productive.

If a worker is stuck in a local blocking wait and the user permits intervention, unblock the wait only when the process identity is clear and the action preserves artifacts. Record that as a supervision finding.

## Debrief

At the end, report:

- worker thread/agent ID, branch/worktree, run ID, deadline, and final status;
- what the worker accomplished in durable artifacts;
- whether shift-clock checks were sparse and separated by substantive work;
- whether open-clock checks were followed by more work;
- whether shift-clock receipts and reports belonged to the current run;
- whether crash/compaction recovery worked from durable state;
- whether final artifacts stayed within their row-type and sheet/section contract;
- validation and publish evidence;
- workflow lessons to promote into skills, specs, checks, or future prompts.

Report behavior against evidence, not only whether the visible output looked good.
