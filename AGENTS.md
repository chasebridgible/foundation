# AGENTS.md

- Specs are HTML-native durable contracts. Start at `docs/specs/index.html` before behavior-changing software work or spec authoring.
- Use the Descriptive Spec Interview skill at `skills/descriptive-spec-interview/SKILL.md` when turning fuzzy user-facing intent into a descriptive spec.
- Use `docs/principles/sw-design-principles.html` before user-facing UI, rendered-UX, accessibility, responsive layout, or visual-verification work.
- Use the Backfill Specs skill at `skills/backfill-specs/SKILL.md` when converting an existing repo into a capability-covered, intent-rigid, architecture-flexible spec graph with dated report and JSONL run log.
- Use the Artifact Inventory Fill Loop skill at `skills/artifact-inventory-fill-loop/SKILL.md` when creating, filling, refreshing, checking, or evaluating a target repo artifact inventory.
- Use the Surface / Function Map Fill Loop skill at `skills/surface-function-map-fill-loop/SKILL.md` when creating, filling, refreshing, checking, evaluating, or revising a target repo surface/function map; keep its read-one-file, mark-that-file-immediately loop intact.
- Use the Capability Map Fill Loop skill at `skills/capability-map-fill-loop/SKILL.md` when creating, filling, refreshing, checking, evaluating, or revising a target repo capability map from Surface / Function Map handoff output.
- Use the Evaluate Backfill Specs skill at `skills/evaluate-backfill-specs/SKILL.md` when judging whether generated backfill specs meet the strict acceptable-quality gate.
- Use `docs/principles/ai-evals-principles.html` before creating or changing LLM judge rubrics, eval workflows, or backfill quality gates.
- Use the Spec workflow skill at `skills/spec-workflow/SKILL.md` when creating or updating specs, mapping tests, or keeping code/spec/test changes aligned.
- Use the Job Journey Images skill at `skills/job-journey-images/SKILL.md` when generating reusable business-process images or one-slide process canvases.
- For spec creation or revision, follow `docs/specs/process.html#spec-authoring`; each spec's `spec-metadata` is canonical.
- If spec metadata changes, run `npm run spec:registry`, then `npm run spec:check` before handoff. CI requires `npm run spec:check`.
- Protected `main` requires branch -> PR -> required checks pass -> merge. Do not direct-push spec or behavior changes to `main`.
- Keep this file short. Put longer workflow guidance in specs or skills.
