---
name: spec-workflow
description: Create, update, and verify HTML-native software specs. Use when Codex is asked to create a new spec, revise spec metadata, map tests or coverage, change behavior governed by specs, or keep code/spec/test changes aligned with the repo's spec process.
---

# Spec Workflow

Use this skill as the execution wrapper for the repo's HTML-native spec system. The source of truth is the spec docs, especially `docs/specs/index.html`, `docs/specs/process.html`, and the relevant descriptive, technical, or test spec. Do not duplicate durable requirements into this skill.

## Entry Workflow

1. Read `docs/specs/index.html#spec-registry` first. Use it to resolve spec IDs, files, related specs, owned paths, implementation references, and coverage.
2. If creating or revising a spec, read `docs/specs/process.html#spec-authoring` and `docs/specs/linking.html#html-native-metadata`.
3. If implementing behavior, load only the relevant descriptive, test, and technical spec sections. Prefer the lowest-level owning spec over broad parent specs.
4. If no spec covers the behavior, create or update the spec before changing durable behavior.
5. Keep prose, `spec-metadata`, HTML meta tags, visible path lists, and coverage tables aligned.
6. If `spec-metadata` changes, run `npm run spec:registry`, then `npm run spec:check`.
7. Before handoff, run `npm run spec:check` and report any remaining semantic review risk.

## Authoring Rules

- Author specs as HTML.
- Copy the closest template in `docs/specs/templates/`: descriptive for product intent, technical for internal behavior, test for verification.
- Fill `spec-metadata` before generating the spec content.
- Use stable dotted spec IDs
- Set exactly one section with `data-spec-canonical="true"`.
- Use `ownedPaths` only for files the spec directly owns. Use `implementationPaths` for navigation references.
- Use `coverage.mapsTo` to point evidence back to descriptive or technical section IDs. Planned or gap coverage is acceptable only when explicit.

## Code/Spec/Test Co-Evolution

When code behavior changes, update the relevant specs and tests in the same change unless the user explicitly narrows scope to analysis only.

- Product behavior change: update descriptive spec and mapped test acceptance.
- Internal behavior change: update technical spec at depth proportional to implementation risk.
- Test addition, rename, deletion, or gap: update the test spec coverage metadata and visible coverage table.
- Path move or deletion: update `ownedPaths`, `implementationPaths`, coverage paths, and visible path lists.
- Spec retirement or replacement: update status, `replacedBy`, parent/child links, and related specs.

## Review Boundary

`npm run spec:check` proves the registry is current and references resolve. It does not prove the mappings are semantically true. For final review, explicitly check whether `relatedSpecs`, `ownedPaths`, `implementationPaths`, and `coverage.mapsTo` truthfully describe the work.

## Protected Main Flow

Use this flow for spec-system, spec metadata, or behavior-changing commits:

1. Create a feature branch from current `main`.
2. Commit changes on the feature branch.
3. Push the feature branch and open a PR into `main`.
4. Wait for the required `Spec registry and metadata` check to pass.
5. Merge the PR only after the required check is green.
6. Sync local `main` from `origin/main`.
7. Delete the feature branch after merge.

Do not direct-push these changes to protected `main`; GitHub rejects commits that have not already passed the required check in the protected flow.
