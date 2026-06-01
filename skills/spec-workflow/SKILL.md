---
name: spec-workflow
description: Create, update, and verify HTML-native specs. Use when Codex is asked to create a system, capability, job, technical, or eval spec; revise spec metadata; map tests or evidence; change behavior governed by specs; or keep implementation/spec/eval changes aligned with the repo's spec process.
---

# Spec Workflow

Use this skill as the execution wrapper for the repo's HTML-native spec system. The source of truth is the spec docs, especially `docs/specs/index.html`, `docs/specs/process.html`, and the relevant system, capability, job, technical, or eval spec. Do not duplicate durable requirements into this skill.

## Entry Workflow

1. Read `docs/specs/index.html#spec-registry` first. Use it to resolve spec IDs, files, related specs, owned paths, implementation references, and coverage.
2. If creating or revising a spec, read `docs/specs/process.html#spec-authoring` and `docs/specs/linking.html#html-native-metadata`.
3. If implementing behavior, load only the relevant job, eval, and technical spec sections. Prefer the lowest-level owning spec over broad parent specs.
4. If no spec covers the behavior, create or update the spec before changing durable behavior.
5. Identify the risk tier from `docs/specs/process.html#risk-tiers` and scale spec/test depth to that tier.
6. Keep prose, `spec-metadata`, HTML meta tags, visible path lists, and coverage tables aligned.
7. If `spec-metadata` changes, run `npm run spec:registry`, then `npm run spec:check`.
8. Before handoff, run `npm run spec:check` and report any remaining semantic review risk.

## Authoring Rules

- Author specs as HTML.
- Copy the closest template in `docs/specs/templates/`: system for whole-system intent, capability for a reliable outcome, job for the work contract and process, technical for implementation behavior, or eval for verification.
- Use `npm run spec:new -- --type job --id product.feature.job --title "Feature Job Spec" --out docs/specs/features/feature-job.html` for a valid starter file.
- Fill `spec-metadata` before generating the spec content.
- Use stable dotted spec IDs.
- Set exactly one section with `data-spec-canonical="true"`.
- Use `ownedPaths` only for files the spec directly owns. Use `implementationPaths` for navigation references.
- Use `coverage.mapsTo` to point evidence back to job, capability, system, technical, or eval section IDs. Planned or gap coverage is acceptable only when explicit.

## Code/Spec/Test Co-Evolution

When code behavior changes, update the relevant specs and tests in the same change unless the user explicitly narrows scope to analysis only.

- Intended work or product behavior change: update the job spec and mapped eval acceptance.
- Internal implementation behavior change: update technical spec at depth proportional to implementation risk.
- Test, business check, evidence path addition, rename, deletion, or gap: update the eval spec coverage metadata and visible coverage table.
- Path move or deletion: update `ownedPaths`, `implementationPaths`, coverage paths, and visible path lists.
- Spec retirement or replacement: update status, `replacedBy`, parent/child links, and related specs.

## Risk Tiers

- T0: typo, formatting, navigation-only. No spec update unless the edited doc becomes inaccurate.
- T1: metadata, registry, CI, or harness maintenance. Update metadata/process docs and run registry/check as needed.
- T2: small bugfix or refactor with no intended user-visible behavior change. Compact technical note and targeted evidence.
- T3: user-visible or operator-visible behavior change inside an existing job. Update job, technical, and eval specs.
- T4: new capability, new job, new flow, or job split. Create or update the capability/job/technical/eval spec set.
- T5: architecture, data, security, concurrency, migration, or cross-feature contract. Deep technical spec, ADR when useful, and broader verification.

If uncertain, choose the higher tier until the spec or tests make the risk smaller.

## Review Boundary

`npm run spec:check` proves the registry is current and references resolve. It does not prove the mappings are semantically true.

Before final handoff, check:

- `relatedSpecs`: relationships are real and minimal.
- `ownedPaths`: only direct ownership is listed.
- `implementationPaths`: references are navigational, not hidden ownership.
- `coverage.mapsTo`: evidence actually verifies the mapped section.
- Visible prose agrees with metadata.
- Spec depth matches the risk tier.

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
