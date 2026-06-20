# AGENTS.md

## Start

- Read `docs/specs/index.html` and `docs/specs/foundation-operating-system.html` before behavior-changing work or spec authoring.
- For spec work, follow `docs/specs/process.html#spec-authoring`; `spec-metadata` is canonical; capability specs expose jobs with `realized-by`, and job specs connect back with `supports`.
- Before creating or revising a durable spec, skill, validator, template, or workflow, name the Foundation capability and owning job spec. If no job owns the work, create or revise the job first.
- Before creating, revising, splitting, remapping, or routing any system, capability, job, technical, eval, artifact/interface/process/action, or ambiguous spec request, use `skills/spec-selection/SKILL.md` and produce a Spec Selection Result.
- After Spec Selection, use the selected type-specific authoring skill. Authoring skills do not choose their own spec type.
- Capability specs must be outcome-shaped. Child capability titles and graph labels cannot be job, artifact, layer, route, command, queue, or phase names; run `npm run foundation:capability-language:check` after capability-map, capability-spec, or capability-template changes.
- Use the most specific skill that applies. Layer skills beat broad workflow skills.
- Layer skills own their exact loops, quality boundaries, outstanding gates, checks, evals, revision gates, and handoff gates.
- Backfill follows the bounded meaning unit rule: deterministic tools enumerate, route, validate, and persist; agents interpret exactly one bounded meaning unit at a time; evals prevent advancement until that unit is outstanding.
- Always choose the right path over the easy one: define the goal and completion standard, follow the governing process, and judge progress by evidence, results, and feedback.
- When work has a shift clock, honor it as committed work time: stay present, choose useful bounded work, preserve current-run evidence, and check the clock at natural handoff or exit points.
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
| Run or implement durable research workflows | `skills/research/SKILL.md` |

## Long-Running Agent Skills

Use these when a task is expected to run across long wall-clock time, context compaction, thread handoff, subagent supervision, recurring automation, or shift-clocked research.

| Work | Skill |
| --- | --- |
| Run shift-clocked or long-duration agent work through bounded durable progress | `skills/long-running-agent-worker/SKILL.md` |
| Observe, steer, and debrief a long-running worker without taking over its task | `skills/watchful-agent-supervisor/SKILL.md` |

## Backfill Skills

Use these when adopting or continuing an existing-repo backfill.
Backfill Capability Map rows use `parent`, `child`, `sole`, `needs-split`, and `blocked`; only queue-eligible `child` and `sole` rows can enter Job / Spec Queue, Context Pack, Process / Action Map, or Author Specs.

| Work | Skill |
| --- | --- |
| Backfill an existing repo end to end | `skills/backfill-repo/SKILL.md` |
| Record repo files | `skills/backfill-record-repo-files/SKILL.md` |
| Map what the repo exposes | `skills/backfill-map-repo-surfaces/SKILL.md` |
| Name what the system can do | `skills/backfill-map-system-capabilities/SKILL.md` |
| Break work into slices | `skills/backfill-create-work-slices/SKILL.md` |
| Gather bounded context | `skills/backfill-gather-context/SKILL.md` |
| Map user and operator actions | `skills/backfill-map-actions/SKILL.md` |
| Write specs from mapped work | `skills/backfill-write-specs/SKILL.md` |
| Evaluate generated backfill specs | `skills/backfill-evaluate-specs/SKILL.md` |

## Backfill Sequence

Record repo files -> map what the repo exposes -> name what the system can do -> break work into slices -> gather context -> map user/operator actions -> write specs -> check slices -> check the system -> hand off.

## Backfill Units

| Layer | Unit agents may interpret before checking/eval |
| --- | --- |
| File Manifest | whole repo, deterministic only |
| Artifact Inventory | exactly one repo-owned file |
| Surface / Function Map | exactly one eligible file |
| Capability Map | one outcome boundary that includes the current `--next` surface |
| Job / Spec Queue | exactly one queue-eligible child/sole capability and one authorable slice |
| Context Pack | exactly one queued slice and one Context Pack row |
| Process / Action Map | exactly one Context Pack row |
| Author Specs | exactly one Process / Action Map row |
