---
name: spec-workflow
description: Maintain and verify HTML-native spec mechanics after spec-selection has chosen the spec lane. Use for spec metadata, graph links, registry generation, checks, code/spec/test co-evolution, and alignment of implementation paths, coverage, and visible prose.
---

# Spec Workflow

Use this skill as the mechanical execution wrapper for the repo's HTML-native spec system. It does not decide which spec type to create. Classification belongs to `skills/spec-selection/SKILL.md`; authoring belongs to the selected type-specific authoring skill. The source of truth is the spec docs, especially `docs/specs/index.html`, `docs/specs/process.html`, and the relevant system, capability, job, technical, or eval spec.

## Entry Workflow

1. Read `docs/specs/index.html#spec-registry` first. Use it to resolve spec IDs, files, related specs, owned paths, implementation references, and coverage.
2. Read `docs/specs/foundation-operating-system.html#capability-map` before authoring Foundation-owned specs, skills, validators, templates, or workflows.
3. If the work creates, revises, splits, remaps, or routes a spec and no Spec Selection Result exists yet, stop and use `skills/spec-selection/SKILL.md` first.
4. Name the owning Foundation capability and owning job spec before writing. If no owning job exists, create or revise the job spec through the selected authoring lane before adding a new skill, validator, template, or durable workflow.
5. If creating or revising a spec, read `docs/specs/process.html#spec-authoring` and `docs/specs/linking.html#html-native-metadata`.
6. If implementing behavior, load only the relevant capability, job, eval, and technical spec sections. Prefer the lowest-level owning spec over broad parent specs.
7. If no spec covers the behavior, create or update the spec through Spec Selection before changing durable behavior.
8. Identify the risk tier from `docs/specs/process.html#risk-tiers` and scale spec/test depth to that tier.
9. Keep prose, `spec-metadata`, `graph-metadata`, HTML meta tags, visible path lists, and coverage tables aligned.
10. If `spec-metadata` changes, run `npm run spec:registry`, then `npm run spec:check`.
11. If `graph-metadata` changes, run `npm run foundation:visible-business-graph:check -- --repo <repo>`.
12. If Foundation capability, job, or skill ownership changes, run `npm run foundation:self-map:check`.
13. Before handoff, run `npm run spec:check`, graph check, and the self-map check when Foundation itself changed; then report any remaining semantic review risk.

## Authoring Rules

- Author specs as HTML.
- Copy the template selected by Spec Selection and the active type-specific authoring skill.
- Use `npm run spec:new -- --type job --id product.feature.job --title "Feature Job Spec" --out docs/specs/features/feature-job.html` for a valid starter file.
- Fill `spec-metadata` before generating the spec content.
- Fill `graph-metadata` before handoff. Every system, capability, job, technical, eval, template, and index spec must expose graph nodes and edges.
- For Foundation-owned work, attach every job to a capability. Before adding or changing a skill, answer: Which Foundation capability does this improve? Is there already a job spec for this work?
- Keep capability/job graph edges explicit: capability specs realize child jobs with `realized-by` edges, and job specs support their owning capability with `supports` edges. A `parent` or `children` registry link alone is not enough.
- Every Foundation skill must have an owning capability, an owning job spec, a technical spec when it defines scripts or data contracts, an eval spec when quality judgment matters, and tests or checks when it mutates repo state.
- Use stable dotted spec IDs.
- Set exactly one section with `data-spec-canonical="true"`.
- Use `ownedPaths` only for files the spec directly owns. Use `implementationPaths` for navigation references.
- Use `coverage.mapsTo` to point evidence back to job, capability, system, technical, or eval section IDs. Planned or gap coverage is acceptable only when explicit.

## Code/Spec/Test Co-Evolution

When code behavior changes, update the relevant specs and tests in the same change unless the user explicitly narrows scope to analysis only.

- Intended work or product behavior change: update the job spec and mapped eval acceptance.
- Internal implementation behavior change: update technical spec at depth proportional to implementation risk.
- Test, business check, evidence path addition, rename, deletion, or gap: update the eval spec coverage metadata and visible coverage table.
- Capability, job, actor, process, tool, evidence, metric, eval, template, or gap relationship change: update `graph-metadata` and run the visible business graph check.
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

`npm run spec:check` proves the registry is current and references resolve. `npm run foundation:visible-business-graph:check -- --repo <repo>` proves graph metadata resolves. Neither proves the mappings are semantically true.

Before final handoff, check:

- `relatedSpecs`: relationships are real and minimal.
- `ownedPaths`: only direct ownership is listed.
- `implementationPaths`: references are navigational, not hidden ownership.
- `coverage.mapsTo`: evidence actually verifies the mapped section.
- Visible prose agrees with metadata.
- Graph metadata agrees with visible prose and spec metadata.
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
