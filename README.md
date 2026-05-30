# Foundation

Foundation is the canonical source bundle for System Philosophy and its software-development substrate: principles, specs, skills, checks, and repo conventions for turning intent into verified results with agents across local repositories.

This repo is both the reference implementation and the shared system other repos should point at. Target repos should keep their own product specs, project context, tests, and facts locally, while Foundation owns the shared development process and root vocabulary.

## What This Repo Contains

- `AGENTS.md`: the small always-loaded rulebook that points agents to the spec system and protected-main workflow.
- `skills/`: reusable workflow skills, including descriptive spec interview, spec workflow, Foundation target-repo setup, orchestrated existing repo spec backfill, and backfill evaluation.
- `docs/specs/`: the HTML-native spec system, templates, examples, registry generator, checker, schema, and `spec:new` scaffold command.
- `docs/specs/foundation-workspace-model.html`: the workspace model for using one canonical Foundation repo from many target repos.
- `docs/principles/`: durable principles for agentic software work, AI evals, software design, and compounding systems.
- `docs/definitions/`: shared vocabulary for substrate, harnesses, skills, specs, and portability.
- `docs/general/system-philosophy.html`: the root philosophy for intent, context, action, evidence, goals, capabilities, jobs, processes, actors, and substrate.
- `docs/compounding-systems.html`: the five-layer framework for why this substrate should compound instead of drift.
- `scripts/foundation-doctor.mjs`: setup diagnostic for the canonical Foundation path, global Codex pointer, target repo adapters, target-owned spec namespaces, and pinned Foundation CI.
- `.github/workflows/specs.yml`: CI enforcement for generated registry and metadata validity.

## Reading Order

1. Read [System Philosophy](docs/general/system-philosophy.html).
2. Read [The Compounding System](docs/compounding-systems.html).
3. Read [Core Principles](docs/principles/core-principles.html).
4. Read [Software Development Principles](docs/principles/sw-dev-principles.html).
5. Read [AI Evals Principles](docs/principles/ai-evals-principles.html) before creating or changing evaluator rubrics, LLM judges, backfill quality gates, or eval workflows.
6. Read [Software Design Principles](docs/principles/sw-design-principles.html) before user-facing UI, responsive layout, rendered UX, accessibility, or visual verification work.
7. Read [The Spec System](docs/specs/index.html).
8. Read [The Spec Process](docs/specs/process.html) when creating, changing, or reviewing specs.
9. Read [The Foundation Workspace Model](docs/specs/foundation-workspace-model.html) when setting up cross-repo use, global Codex instructions, target repo adapters, or CI integration.
10. Read [Foundation Backfill Specs](docs/specs/foundation-backfill-specs.html) when adopting an existing repo into the spec system.
11. Read [Foundation Backfill Orchestration Technical Spec](docs/specs/foundation-backfill-orchestration-technical.html) when changing the backfill skill chain, coverage ledger, or adequacy gate.
12. Read [Foundation Backfill Evaluation Process](docs/specs/foundation-backfill-quality-evaluation.html) when changing the evaluator rubric, golden example, or quality gate.

## Use Foundation From A Target Repo

Use one canonical Foundation repo plus small target-repo adapters.

1. Keep Foundation at a stable local path, for example:
   - `/Users/ChaseBartlett/Documents/repos/foundation`

2. Install a global Codex pointer:
   - `~/.codex/AGENTS.md` should point agents to the canonical Foundation path.
   - Agents should read Foundation `AGENTS.md` for shared process before repo-specific spec or behavior work.

3. Keep target repo truth local:
   - Product specs, project knowledge, implementation paths, tests, and ADRs live in the target repo.
   - Target repo `AGENTS.md` files are adapters: they define local commands, paths, constraints, and exceptions while Foundation owns shared rules.

4. Treat Foundation updates as shared substrate updates:
   - Process improvements, shared skills, templates, validators, and principles are changed in Foundation.
   - Product behavior and client-specific intent are changed in the target repo.

5. Use pinned Foundation behavior in CI:
   - Local agent work can use the live Foundation repo.
   - CI checks out a pinned Foundation revision before running Foundation-backed validation.

## Set Up A Target Repo

Set up each target repo as a consumer of canonical Foundation.

1. Create or update the target repo `AGENTS.md`:
   - Point to the canonical Foundation path.
   - Name target-repo commands, paths, constraints, and project-specific exceptions.
   - Keep shared Foundation rules in Foundation.
   - Use `templates/target-repo-AGENTS.md` as the adapter shape.

2. Keep project-owned artifacts in the target repo:
   - Product specs in `docs/specs/`.
   - Project knowledge, ADRs, tests, implementation paths, and product README content.
   - Target-owned spec IDs in the target namespace.

3. Use Foundation-owned workflows:
   - Use Foundation `AGENTS.md` for shared routing.
   - Use Foundation skills for descriptive spec interview, spec workflow, and setup.
   - Use Foundation specs, principles, templates, and validators as the shared process source.

4. Configure GitHub for the target repo:
   - Check out the target repo.
   - Check out a pinned Foundation revision.
   - Run the target repo's local tests/builds and Foundation-backed spec validation.
   - Protect `main`.
   - Require the target repo's quality and spec validation checks.
   - Use branch -> PR -> required checks pass -> merge for spec and behavior changes.

5. Confirm setup:
   - Codex can start in the target repo, read global Codex instructions, read Foundation `AGENTS.md`, then read the target repo adapter.
   - A user-facing spec request in the target repo routes to Foundation `skills/descriptive-spec-interview/SKILL.md`.
   - Shared process changes are made in Foundation; target product truth remains in the target repo.
   - `npm run foundation:doctor -- --repo /path/to/target-repo` reports no failures.

## Adopt An Existing Repo

Use this sequence when a repo already has substantial code, docs, plans, or tests and needs to join the Foundation spec system:

1. Use `skills/install-foundation-substrate/SKILL.md` to connect the repo to Foundation.
2. Run `npm run foundation:doctor -- --repo /path/to/target-repo`.
3. Use `skills/backfill-specs/SKILL.md` to orchestrate Artifact Inventory, Surface / Function Map, Capability Map, Define Spec Jobs, Context Pack, Process / Action Map, descriptive specs, rendered UX, technical specs, and Review Spec Adequacy until capability coverage is complete.
4. Keep the active dated report and run-log JSONL named in the target repo `AGENTS.md` while backfill is in progress; the report owns the Capability Map and Job / Spec Queue.
5. Keep descriptive specs architecture-agnostic and technical specs contract-first: required contracts, current evidence, architecture constraints, and implementation latitude.
6. Run `npm run backfill:queue:check -- /path/to/target-repo/docs/specs/backfill/review-report-YYYYMMDD-NN.html` after Capability Map or Job / Spec Queue updates so durable run state stays machine-checkable.
7. Run `npm run backfill:run-log:check -- /path/to/target-repo/docs/specs/backfill/run-log-YYYYMMDD-NN.jsonl` after run-log updates so execution observability stays machine-checkable.
8. Use `skills/evaluate-backfill-specs/SKILL.md` to score capability-backed slices and the completed graph, revise weak categories, and mark only strict 96+ results acceptable.
9. Leave existing docs and code in place until the backfilled specs are reviewed and a separate cleanup pass is approved.
10. Use a later eval-backfill workflow for eval specs and acceptance mapping.

## Foundation Doctor

Run the setup diagnostic from the Foundation repo:

```sh
npm run foundation:doctor
npm run foundation:doctor -- --repo /path/to/target-repo
```

The doctor checks that Foundation exists at the canonical path, required Foundation skills exist, global Codex instructions point to Foundation, the target repo adapter points back to Foundation with local adapter content, target specs use a target-owned namespace, and target CI references a pinned Foundation revision when CI is configured.

## AGENTS-Load Canary

Use [Foundation AGENTS Load Canary Test](docs/specs/foundation-agents-load-canary-eval.html) when proving that a new agent session loads the expected instruction layers. The canary is a temporary manual smoke test: add nonce-based canary lines, start a cold agent session, verify the phrases in the first response, and remove the canary lines immediately.

## Setup Skill

Use `skills/install-foundation-substrate/SKILL.md` when connecting a target repo to Foundation. It guides target repo adapters, global Codex pointer checks, target-owned spec placement, and CI pinning.

## Spec System

Specs are HTML-native durable contracts for what should exist. Each spec's embedded `spec-metadata` is canonical; the registry in `docs/specs/index.html` is generated from those HTML specs.

When code behavior changes, update the relevant descriptive, technical, and eval specs in the same commit. If spec metadata changes, run `npm run spec:registry`, then `npm run spec:check`.

## Thesis

Foundations prevent avoidable debt.

Technical debt, comprehension debt, process debt, and physical injury all rhyme: they come from repeated work on top of weak fundamentals. The earlier the foundation is learned, the more every later repetition compounds in the right direction.

The goal of this repo is to make those foundations explicit enough that people and agents can build systems that compound in value over time.
