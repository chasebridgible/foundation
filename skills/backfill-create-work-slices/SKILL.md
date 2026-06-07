---
name: backfill-create-work-slices
description: Use when creating, revising, checking, evaluating, refreshing, reporting, or handing off the Foundation Backfill Job / Spec Queue layer from Capability Map rows. Runs the one-capability-at-a-time loop that creates one precise authorable slice for the current queue-eligible child or sole capability.
---

# Backfill: Create Work Slices

Use inside `backfill-repo` after Capability Map handoff and before Context Pack.

Owning capability: `foundation.define-right-work.capability`.
Owning job: `foundation.backfill-spec-job-queue.job`.

## Bounded Unit

Exactly one queue-eligible `child` or `sole` Capability Map row is reviewed at a time.

The output for that unit is exactly one Job / Spec Queue slice. If one capability appears to need multiple slices, do not hide the split in the queue. Route the issue back to Capability Map as `needs-split` or a blocker with evidence.

## Required Loop

1. Run `npm run foundation:spec-job-queue:fill -- --repo <target-repo> --run-id <run-id> --next`.
2. Read only the returned queue target, its upstream child/sole Capability Map row, parent context if present, and cited evidence refs.
3. Write one precise queue slice for that same capability:

   ```bash
   npm run foundation:spec-job-queue:fill -- --repo <target-repo> --run-id <run-id> --capability-ids <capability-id> --slices-json '[{...}]'
   ```

4. Run `npm run foundation:spec-job-queue:check -- --repo <target-repo> --run-id <run-id> --phase batch`.
5. Run `npm run foundation:spec-job-queue:eval -- --repo <target-repo> --run-id <run-id>`.
6. Revise the same queue slice until checker and eval findings for the current queue fingerprint are resolved.
7. Return to `--next` only after the current capability slice is precise, queue eligible, and free of warnings or revision targets.
8. When `--next` returns `null`, run handoff check, eval, and report:

   ```bash
   npm run foundation:spec-job-queue:check -- --repo <target-repo> --run-id <run-id>
   npm run foundation:spec-job-queue:eval -- --repo <target-repo> --run-id <run-id> --sample all
   npm run foundation:spec-job-queue:report -- --repo <target-repo> --run-id <run-id>
   ```

## Slice Contract

The slice must name:

- upstream child/sole capability ID;
- exact behavior included;
- exact behavior excluded;
- owner skill;
- target spec IDs when known;
- objective exit criterion;
- next action;
- blocking questions, gaps, or human decisions;
- verification targets.

## Prohibited Shortcuts

Do not use `--all`, `--batch-size`, generated slice files, multiple capability IDs, multi-slice payloads, broad parent summaries, phase names, artifact names, or source-path buckets.

Do not queue parent, `needs-split`, `blocked`, or non-queueable rows. Parent capability context may explain hierarchy, but only queue-eligible child/sole behavior can become work.

## Done

Done when every queue-eligible child/sole capability has one precise active slice or an explicit blocker, every queue row references only child/sole capability refs, no parent-only or broad rows are queued, checker passes, eval has no warnings or revision targets, the report names `Context Pack` as next layer, and Context Pack can continue without rediscovering source.
