---
name: spec-selection
description: Use before creating, revising, splitting, remapping, or routing any system, capability, job, technical, eval, artifact/interface/process/action, or ambiguous spec request. Produces a Spec Selection Result and hands off to the correct type-specific authoring skill.
---

# Spec Selection

Use this skill as the mandatory front door for spec work. Do not write or revise a durable spec until this skill has classified the work and named the next authoring lane.

Owning capability: `foundation.author-durable-specs.capability`.
Owning job: `foundation.spec-selection.job`.
Eval gate: `foundation.spec-selection.eval`.

## Read First

1. `docs/specs/spec-selection.html`
2. `docs/definitions/definitions.html#system-philosophy-concepts`
3. `docs/specs/index.html#spec-registry`
4. `docs/specs/foundation-operating-system.html#capability-map` for Foundation-owned work

## Classification Loop

1. Restate the user's intent without choosing a spec type.
2. Run the clarification gate when material ambiguity remains.
3. Search for an existing owning spec by goal, capability, job, path, skill, template, validator, or eval.
4. Run the standing-ability and triggered-work tests from `foundation.spec-selection.job`.
5. Choose exactly one primary classification:
   - system goal or system contract
   - parent capability
   - child capability
   - job
   - technical contract
   - eval
   - non-spec artifact, interface, process, action, evidence, or implementation detail
6. Name companion specs only when needed for implementation or durable judgment.
7. Reject nearby wrong classifications explicitly.
8. Evaluate the routing decision against `foundation.spec-selection.eval`; revise until no blocking finding remains.
9. Hand off to the selected type-specific authoring skill.

## Clarification Gate

Ask before classification only when the answer could change the spec type, owner, or companion specs. Ask the smallest useful set of questions, no more than three at a time. If the ambiguity is minor, continue with a labeled assumption.

Altitude questions:

- Are we defining a whole system goal or durable subsystem boundary?
- Are we naming what must become reliably possible?
- Are we defining triggered work an actor performs?
- Are we defining implementation contracts?
- Are we defining how evidence will be judged?
- Is this actually an artifact, interface, process, action, evidence item, or implementation detail inside an existing spec?

## Required Output

Return a `Spec Selection Result` before any authoring:

```text
Spec Selection Result
Intent:
Existing owner:
Clarifying questions, answers, or assumptions:
Primary classification:
Companion specs needed:
Parent/child/job relationship:
Rejected classifications:
Evidence:
Open questions or blockers:
Next skill/process:
```

## Handoff Rules

- Use `skills/author-system-spec/SKILL.md` only after selecting system.
- Use `skills/author-capability-spec/SKILL.md` only after selecting parent or child capability.
- Use `skills/author-job-spec/SKILL.md` only after selecting job.
- Use `skills/author-technical-spec/SKILL.md` only after selecting technical.
- Use `skills/author-eval-spec/SKILL.md` only after selecting eval.
- If the work is a non-spec artifact, interface, process, action, evidence, or implementation detail, attach it to the owning spec instead of creating a new spec.

Do not self-certify. If classification is uncertain, name the blocker or route to the smallest review question needed to resolve it.
