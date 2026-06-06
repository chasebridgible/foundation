# AGENTS.md

## Start

- Read `docs/specs/index.html` and `docs/specs/foundation-operating-system.html` before behavior-changing work or spec authoring.
- For spec work, follow `docs/specs/process.html#spec-authoring`; `spec-metadata` is canonical; capability specs expose jobs with `realized-by`, and job specs connect back with `supports`.
- Before creating or revising a durable spec, skill, validator, template, or workflow, name the Foundation capability and owning job spec. If no job owns the work, create or revise the job first.
- Before creating, revising, splitting, remapping, or routing any system, capability, job, technical, eval, artifact/interface/process/action, or ambiguous spec request, use `skills/spec-selection/SKILL.md` and produce a Spec Selection Result.
- After Spec Selection, use the selected type-specific authoring skill. Authoring skills do not choose their own spec type.
- Use the most specific skill that applies. Layer skills beat broad workflow skills.
- Layer skills own their exact loops, shortcut bans, outstanding gates, checks, evals, revision gates, and handoff gates.
- Use `docs/principles/ai-evals-principles.html` before judge/eval changes, and `docs/principles/sw-design-principles.html` before UI, rendered UX, accessibility, or visual-verification work.
- If spec metadata changes, run `npm run spec:registry`, then `npm run spec:check`; if Foundation capability/job/skill ownership changes, run `npm run foundation:self-map:check`.
- Protected `main` requires branch -> PR -> required checks pass -> merge.

## Core Skills

| Work | Skill |
| --- | --- |
| Select the right spec type | `skills/spec-selection/SKILL.md` |
| Author a system spec | `skills/author-system-spec/SKILL.md` |
| Author a capability spec | `skills/author-capability-spec/SKILL.md` |
| Author a job spec | `skills/author-job-spec/SKILL.md` |
| Author a technical spec | `skills/author-technical-spec/SKILL.md` |
| Author an eval spec | `skills/author-eval-spec/SKILL.md` |
| Design agent workflows, skills, queues, validators, evals, or handoffs | `skills/agentic-workflow-design/SKILL.md` |
| Keep spec metadata, graph links, registry, checks, and code/spec/test changes aligned | `skills/spec-workflow/SKILL.md` |
| Create job journey images | `skills/job-journey-images/SKILL.md` |

## Backfill Skills

Use these when adopting or continuing an existing-repo backfill.

| Work | Skill |
| --- | --- |
| Backfill an existing repo end to end | `skills/backfill-repo/SKILL.md` |
| Record repo files | `skills/backfill-record-repo-files/SKILL.md` |
| Map what the repo exposes | `skills/backfill-map-repo-surfaces/SKILL.md` |
| Name what the system can do | `skills/backfill-map-system-capabilities/SKILL.md` |
| Map user and operator actions | `skills/backfill-map-actions/SKILL.md` |
| Write specs from mapped work | `skills/backfill-write-specs/SKILL.md` |
| Evaluate generated backfill specs | `skills/backfill-evaluate-specs/SKILL.md` |

## Backfill Sequence

Record repo files -> map what the repo exposes -> name what the system can do -> break work into slices -> gather context -> map user/operator actions -> write specs -> check slices -> check the system -> hand off.
