---
name: backfill-write-specs
description: Use when creating, filling, checking, evaluating, revising, refreshing, reporting, or handing off the Backfill Author Specs layer from outstanding Process / Action Map rows. Runs the one-target-at-a-time loop that produces one job/descriptive spec and one contract-first technical spec per queued target.
---

# Backfill: Write Specs

Use this skill inside `backfill-repo` after Process / Action Map handoff and before Slice Evaluation.

Owning capability: `foundation.author-durable-specs.capability`.
Owning job: `foundation.backfill-author-specs.job`.

## Atomic Unit

Exactly one Author Specs target is reviewed at a time. One target is one active Process / Action Map row that already passed the Process / Action Map outstanding gate.

The target is complete only when its Author Specs row has:

- one target-owned job/descriptive spec;
- one target-owned contract-first technical spec;
- a passing current Author Specs check;
- a current row-level Author Specs eval receipt marked outstanding;
- no warnings, blockers, placeholders, generic evidence, or revision targets.

## Required Loop

1. Run `npm run foundation:author-specs:fill -- --repo <target-repo> --run-id <run-id> --next`.
2. Read only the returned Author Specs target, its upstream Process / Action Map row, and that row's referenced Context Pack evidence.
3. Author or revise the target job/descriptive spec using `backfill-job-spec-author`.
4. Author or revise the target technical spec using `backfill-technical-spec-author`.
5. Record the two spec paths for exactly that target:

   ```bash
   npm run foundation:author-specs:fill -- --repo <target-repo> --run-id <run-id> --process-map-id <process-map-id> --job-spec <job-spec-path> --technical-spec <technical-spec-path>
   ```

6. Run `npm run foundation:author-specs:check -- --repo <target-repo> --run-id <run-id> --phase batch`.
7. Run `npm run foundation:author-specs:eval -- --repo <target-repo> --run-id <run-id> --process-map-id <process-map-id>`.
8. If check or eval returns any failure, warning, missing outstanding receipt, omitted material row detail, generic compression finding, weak rebuild-readiness finding, or revision target, revise that same target and repeat steps 5-7.
9. Move to the next target only after the current target has a current outstanding row-level eval receipt.
10. When `--next` returns `null`, run handoff check, handoff eval, and report:

    ```bash
    npm run foundation:author-specs:check -- --repo <target-repo> --run-id <run-id>
    npm run foundation:author-specs:eval -- --repo <target-repo> --run-id <run-id> --sample all
    npm run foundation:author-specs:report -- --repo <target-repo> --run-id <run-id>
    ```

## Inputs

- Process / Action Map artifact and outstanding eval receipts.
- Context Pack row referenced by the current target.
- Child/sole capability refs, parent capability context, surfaces, files, evidence refs, rules, states, edge cases, and recovery paths named by the current target.
- Existing target specs only when they are directly referenced by the current target.

## Output

- `docs/specs/backfill/author-specs-<run-id>.jsonl`
- `docs/specs/backfill/author-specs-check-<run-id>.json`
- `docs/specs/backfill/author-specs-eval-<run-id>.jsonl`
- `docs/specs/backfill/author-specs-summary-<run-id>.html`
- updated backfill report containing `backfill-author-specs-state`
- one job/descriptive spec and one technical spec per active target unless the target is explicitly blocked by upstream evidence gaps

## Outstanding Gate

Do not treat "acceptable" as good enough. A target is outstanding only when deterministic checks pass for the current Author Specs fingerprint, row eval score is 100, no finding has warning or blocking severity, no revision targets remain, and the downstream Slice Evaluation agent can continue without rediscovering core behavior from source.

The row eval compares the authored job/technical spec pair against the current Process / Action Map row. Outstanding requires preserving every material row item: child/sole capability identity, parent context when present, actor or role, trigger, intended outcome, domain object, actions, states and transitions, permissions, rules, visible/operator behavior, edge cases, recovery paths, evidence refs, explicit gaps, blockers, and human decisions.

The pair must be spec-only rebuild ready. A future agent reading only the job spec, technical spec, and row trace must be able to answer what behavior must exist, what contracts are required, what current evidence supports it, what is flexible versus constrained, what failures and recovery paths matter, what verification would prove the row, and what remains uncertain.

Generic compression is a blocking failure. If the Process / Action Map row names specific route families, auth differences, idempotency behavior, 404 masking, avatar config gaps, partial persistence, permissions, states, rules, evidence, or recovery paths, the specs must carry those particulars instead of summarizing them as "family-specific responses," "relevant contracts," "current behavior," or similar broad prose.

## Prohibited Shortcuts

- Do not use `--all`, `--batch-size`, generated author payloads, or file-based bulk spec payloads.
- Do not author or revise multiple Author Specs targets before checking and evaluating the current one.
- Do not continue to the next target while any prior non-pending Author Specs row lacks a current outstanding row-level eval receipt.
- Do not stop the layer after one or a few passing rows. When the user asks to continue with or complete Author Specs from a completed Process / Action Map handoff, keep running the loop until `--next` returns `null`, then run handoff check, all-row eval, and report.
- Do not hand off with stale check/eval artifacts, report drift, placeholders, generic evidence, missing graph metadata, missing job/technical spec paths, under-reviewed rows, or any row that has not passed the current outstanding row eval.

## Spec Authoring Requirements

The job/descriptive spec must preserve actor, intended outcome, domain object, actions, states, rules, permissions, edge cases, recovery, evidence, rendered UX or nonvisual scope, and human decisions.

The technical spec must separate required contracts, current implementation evidence, architecture constraints, implementation latitude, operational behavior, failures/recovery, observability, and verification targets.

The technical spec's verification targets must be tied to the current row's behavior or evidence. Generic spec checks, structural checks, or suite names alone do not prove rebuild readiness.

Both specs must include `spec-metadata`, `graph-metadata`, one canonical section, target-owned spec IDs, owned path metadata for the spec file, and visible traceability to the upstream child/sole capability refs, Process / Action Map row, and slice.

## Handoff

Report the active run ID, current artifact paths, current target if any, check/eval status, outstanding row count, missing outstanding row count, remaining blockers, and whether the next layer is `Evaluate Job Slices`.
