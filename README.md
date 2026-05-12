# Foundation

Foundation is the source bundle for a portable software substrate: principles, specs, skills, checks, and repo conventions for building software with agents.

This repo is both a reference implementation and the thing to copy from. The README describes the current source repo and the workflow for installing the substrate into a new repo.

## What This Repo Contains

- `AGENTS.md`: the small always-loaded rulebook that points agents to the spec system and protected-main workflow.
- `skills/`: reusable workflow skills, including the spec workflow and the one-time install workflow.
- `docs/specs/`: the HTML-native spec system, templates, examples, registry generator, checker, schema, and `spec:new` scaffold command.
- `docs/principles/`: durable principles for agentic software work and compounding systems.
- `docs/definitions/`: shared vocabulary for substrate, harnesses, skills, specs, and portability.
- `docs/compounding-systems.html`: the conceptual root for why this substrate should compound instead of drift.
- `.github/workflows/specs.yml`: CI enforcement for generated registry and metadata validity.

## Reading Order

1. Read [The Compounding System](docs/compounding-systems.html).
2. Read [Core Principles](docs/principles/core-principles.html).
3. Read [Software Development Principles](docs/principles/sw-principles.html).
4. Read [The Spec System](docs/specs/index.html).
5. Read [The Spec Process](docs/specs/process.html) when creating, changing, or reviewing specs.

## Install Into A New Repo

Install the substrate as one bundle. The principles and definitions are part of what make the spec system legible to agents, so they travel with the spec system.

1. Copy these paths into the target repo:
   - `AGENTS.md`
   - `skills/`
   - `docs/`
   - `.github/workflows/specs.yml`
   - spec-related `package.json` scripts
   - `.gitignore`

2. Adapt the target repo:
   - Rewrite `README.md` for the target product or client repo.
   - Merge the spec scripts into the target repo's existing `package.json` instead of replacing it blindly.
   - Replace source-repo names, paths, and spec IDs where they should be target-specific.
   - Keep example specs clearly under `docs/specs/examples/` or replace them with target examples.

3. Regenerate machine indexes:
   - Run `npm run site-map`.
   - Run `npm run spec:registry`.
   - Run `npm run spec:check`.

4. Configure GitHub:
   - Ensure `.github/workflows/specs.yml` runs in the target repo.
   - Protect `main`.
   - Require the status check `Spec registry and metadata`.
   - Use branch -> PR -> required checks pass -> merge for spec and behavior changes.

5. Confirm the install:
   - `npm run spec:check` passes locally.
   - The required GitHub check passes on a PR.
   - Agents can start from `AGENTS.md`, find `docs/specs/index.html`, and invoke `skills/spec-workflow/SKILL.md`.

## One-Time Install Skill

Use `skills/install-foundation-substrate/SKILL.md` when applying this repo to a new target repo. It exists to guide the copy/adapt/verify process and can remain in the target repo as historical substrate or be removed after install if the target repo no longer needs it.

## Spec System

Specs are HTML-native durable contracts for what should exist. Each spec's embedded `spec-metadata` is canonical; the registry in `docs/specs/index.html` is generated from those HTML specs.

When code behavior changes, update the relevant descriptive, technical, and test specs in the same commit. If spec metadata changes, run `npm run spec:registry`, then `npm run spec:check`.

## Thesis

Foundations prevent avoidable debt.

Technical debt, comprehension debt, process debt, and physical injury all rhyme: they come from repeated work on top of weak fundamentals. The earlier the foundation is learned, the more every later repetition compounds in the right direction.

The goal of this repo is to make those foundations explicit enough that people and agents can build systems that compound in value over time.
