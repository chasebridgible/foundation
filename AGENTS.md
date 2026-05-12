# AGENTS.md

- Specs are HTML-native durable contracts. Start at `docs/specs/index.html` before behavior-changing software work or spec authoring.
- Use the Spec workflow skill at `skills/spec-workflow/SKILL.md` when creating or updating specs, mapping tests, or keeping code/spec/test changes aligned.
- For spec creation or revision, follow `docs/specs/process.html#spec-authoring`; each spec's `spec-metadata` is canonical.
- If spec metadata changes, run `npm run spec:registry`, then `npm run spec:check` before handoff. CI requires `npm run spec:check`.
- Protected `main` requires branch -> PR -> required checks pass -> merge. Do not direct-push spec or behavior changes to `main`.
- Keep this file short. Put longer workflow guidance in specs or skills.
