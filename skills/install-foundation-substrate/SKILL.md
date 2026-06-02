---
name: install-foundation-substrate
description: Connect a target repository to the canonical Foundation software substrate. Use when Codex needs to set up the Foundation workspace model for a repo, create a local AGENTS.md adapter, verify the global Codex pointer, place target-owned specs correctly, configure GitHub Actions with a pinned Foundation checkout, or establish required spec checks.
---

# Connect Target Repo

Use this skill to connect a target repo to Foundation. The model is defined in `docs/specs/foundation-workspace-model.html`: one canonical Foundation repo, global Codex pointer, and small target-repo adapters.

## Target Repo Setup

1. Confirm the canonical Foundation path.
2. Confirm global Codex instructions point to Foundation.
3. Create or update the target repo `AGENTS.md` as a local adapter only:
   - It may define local commands, paths, project constraints, and repo-specific exceptions.
   - It must not duplicate or redefine shared Foundation rules.
   - Use `templates/target-repo-AGENTS.md` as the starting shape.
4. Keep project specs, project knowledge, tests, ADRs, and implementation paths in the target repo.
5. Keep shared process, templates, skills, validators, and principles in Foundation.
6. Install local HTML docs navigation for the target repo:
   - Copy or pin `docs/generate-site-map.mjs` and `docs/site-nav.js` from Foundation into the target repo.
   - The local `docs/site-nav.js` must include the shared sidebar collapse control, including `data-site-nav-toggle`, `substrate-site-nav-collapsed`, and the `substrate:site-nav-toggle` event. If Foundation updates this renderer, refresh the target repo copy or pin.
   - Generate the target repo's own `docs/site-map.js`; it must reflect the target repo's folders, not Foundation's folders.
   - If the target repo has `package.json`, add a `site-map` script that runs `node docs/generate-site-map.mjs`.
   - Ensure durable HTML docs under `docs/` load the local `site-map.js` and collapse-capable `site-nav.js` scripts. Cache-busting query strings are acceptable; the resolved files must still be target-local.
   - Preserve the target repo's spec registry as the semantic lookup for system specs, capability specs, job specs, technical specs, eval specs, paths, and coverage.
7. Ensure target specs are graph-compatible:
   - New target specs must use Foundation templates or `docs/specs/new-spec.mjs` so `graph-metadata` is present from creation.
   - Target `AGENTS.md` should tell agents to run `npm run foundation:visible-business-graph:check -- --repo <target-repo>` after spec graph changes.
   - Generated canvas artifacts remain derived outputs, not source of truth.
8. Configure CI to check out a pinned Foundation revision, not an implicit local sibling path.
9. Run `npm run foundation:doctor -- --repo <target-repo>` from Foundation and resolve failures before handoff.

## Target Repo Adapter

1. Rewrite the target repo README for the target product or client repo.
2. Create target-owned spec directories when the repo starts carrying product specs.
3. Use target-owned spec IDs. Do not create target product specs under `foundation.*`.
4. Record local test, build, development, active backfill report paths, and graph validation command in the target repo adapter.
5. Route shared process improvements back to Foundation.
6. Route product behavior, project knowledge, ADRs, tests, implementation paths, and generated business graph artifacts to the target repo.

## Existing Repo Adoption

After the target repo is connected:

1. Run `npm run foundation:doctor -- --repo <target-repo>` from Foundation.
2. Use `skills/backfill-specs/SKILL.md` to inspect existing repo behavior and create draft job and technical specs.
3. Keep the active dated backfill report named in the target repo adapter while the backfill is in progress.
4. Use a later eval-backfill workflow for eval specs and acceptance mapping.

## GitHub Setup

1. Push the target repo setup on a feature branch.
2. Open a PR into `main`.
3. Configure the workflow to check out a pinned Foundation revision.
4. Run the target repo's local tests/builds and Foundation-backed spec validation.
5. Protect `main`.
6. Require the target repo's quality and spec validation checks.
7. Use branch -> PR -> required checks pass -> merge for future spec and behavior changes.

## Exit Criteria

- Codex can start in the target repo and discover Foundation through global Codex instructions.
- The target repo `AGENTS.md` is a short adapter, not a copy of Foundation rules.
- The target README explains what the target repo is.
- Product specs and project facts live in the target repo.
- Durable HTML docs in the target repo render a left sidebar from the target repo's own folder tree, and the shared collapse control works on every included HTML page.
- The target repo spec registry remains separate from visual document navigation.
- Target specs are created with `graph-metadata`, and the target adapter names the visible business graph check.
- Shared process changes live in Foundation.
- Existing repo adoption routes to Backfill Specs after setup.
- CI checks out a pinned Foundation revision before running Foundation-backed validation.
- `npm run foundation:doctor -- --repo <target-repo>` reports no failures.
