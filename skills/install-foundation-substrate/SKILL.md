---
name: install-foundation-substrate
description: Install this repo's software substrate into another repository. Use when Codex needs to copy or adapt AGENTS.md, skills, docs, specs, package scripts, GitHub Actions, and required-check setup from this repo into a target repo.
---

# Install Substrate

Use this skill as a one-time install workflow for moving the substrate into a target repo. Treat the substrate as one bundle: principles, definitions, specs, skills, scripts, and CI enforcement travel together.

## Copy Set

Copy these paths from the source repo:

- `AGENTS.md`
- `skills/`
- `docs/`
- `.github/workflows/specs.yml`
- `.gitignore`
- the spec scripts from `package.json`: `spec:new`, `spec:registry`, `spec:check`, and `site-map`

Do not copy the source repo `README.md` as-is. Rewrite the target README for the target product or client repo.

## Adaptation Steps

1. Merge `package.json` scripts into the target repo's existing package file.
2. Rewrite `AGENTS.md` only where target-specific paths, commands, or protected-branch rules differ.
3. Keep general principles, definitions, and compounding-system docs unless the target repo has an explicit reason to exclude them.
4. Keep example specs under `docs/specs/examples/` or replace them with target-specific examples.
5. Rename target-owned spec IDs to the target namespace. Do not create new target specs under `foundation.*`.
6. Run `npm run site-map`, `npm run spec:registry`, and `npm run spec:check`.

## GitHub Setup

1. Push the installed substrate on a feature branch.
2. Open a PR into `main`.
3. Confirm the `Specs` workflow runs.
4. Protect `main`.
5. Require the status check `Spec registry and metadata`.
6. Use branch -> PR -> required checks pass -> merge for future spec and behavior changes.

## Exit Criteria

- `npm run spec:check` passes locally.
- The required GitHub check passes on a PR.
- The target README explains what the target repo is.
- `AGENTS.md` points agents to `docs/specs/index.html` and `skills/spec-workflow/SKILL.md`.
- No copied spec claims target product truth unless it has been reviewed and adapted.
