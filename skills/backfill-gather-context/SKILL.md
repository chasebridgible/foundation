---
name: backfill-gather-context
description: Use when creating, revising, checking, evaluating, refreshing, reporting, or handing off the Foundation Backfill Context Pack layer from Job / Spec Queue rows. Runs the one-slice-at-a-time loop that gathers bounded evidence for the current queued slice.
---

# Backfill: Gather Context

Use inside `backfill-repo` after Job / Spec Queue handoff and before Process / Action Map.

Owning capability: `foundation.preserve-knowledge-context.capability`.
Owning job: `foundation.backfill-context-pack.job`.

## Bounded Unit

Exactly one queued slice is reviewed at a time.

The output for that unit is exactly one Context Pack row containing only the evidence needed for that slice. If the pack needs parent-wide evidence, broad domain context, or unrelated files to make sense, route the issue back to Job / Spec Queue or Capability Map instead of expanding the pack.

## Required Loop

1. Run `npm run foundation:context-pack:fill -- --repo <target-repo> --run-id <run-id> --next`.
2. Read only the returned Context Pack target, its upstream queue slice, its child/sole capability refs, and cited evidence paths.
3. Gather exact evidence for that same slice: files, surfaces, capability refs, tests, docs, schemas, snippets, symbols, excluded near-misses, gaps, and sufficiency rationale.
4. Write one Context Pack row for that same slice:

   ```bash
   npm run foundation:context-pack:fill -- --repo <target-repo> --run-id <run-id> --slice-ids <slice-id> --packs-json '[{...}]'
   ```

5. Run `npm run foundation:context-pack:check -- --repo <target-repo> --run-id <run-id> --phase batch`.
6. Run `npm run foundation:context-pack:eval -- --repo <target-repo> --run-id <run-id>`.
7. Revise the same pack until checker and eval findings for the current pack fingerprint are resolved.
8. Return to `--next` only after the current pack is bounded, specific, non-bloated, and free of warnings or revision targets.
9. When `--next` returns `null`, run handoff check, eval, and report:

   ```bash
   npm run foundation:context-pack:check -- --repo <target-repo> --run-id <run-id>
   npm run foundation:context-pack:eval -- --repo <target-repo> --run-id <run-id> --sample all
   npm run foundation:context-pack:report -- --repo <target-repo> --run-id <run-id>
   ```

## Pack Contract

The pack must name:

- upstream slice ID;
- child/sole capability refs;
- exact file/surface/test/doc/schema evidence;
- snippets, symbols, line hints, or source anchors where available;
- excluded nearby evidence and why it belongs elsewhere;
- explicit gaps, blockers, or human decisions;
- why the pack is sufficient for Process / Action Map and Author Specs.

## Prohibited Shortcuts

Do not use `--all`, `--batch-size`, generated pack files, multiple slice IDs, multi-pack payloads, parent-wide evidence dumps, broad repo summaries, path-kind classifiers, regex-driven evidence selection, or bloated packs that shift interpretation downstream.

## Done

Done when every active queued slice has one bounded Context Pack row or explicit blocker, every pack preserves child/sole capability refs, checker passes, eval has no warnings or revision targets, the report names `Process / Action Map` as next layer, and Process / Action Map can continue without reopening source for core behavior.
