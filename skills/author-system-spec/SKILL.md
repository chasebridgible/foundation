---
name: author-system-spec
description: Create or revise a system spec after spec-selection has classified the work as a system goal or whole-system contract. Use only with a Spec Selection Result.
---

# Author System Spec

Use this skill only after `spec-selection` selects `system`.

Owning capability: `foundation.author-durable-specs.capability`.
Owning job: `foundation.author-system-spec.job`.
Eval gate: `foundation.author-system-spec.eval`.

## Process

1. Read the Spec Selection Result.
2. Read `docs/specs/process.html#spec-authoring`, `docs/specs/templates/system-spec-template.html`, and the current target system spec if revising.
3. Run the readiness gate before authoring.
4. Confirm the system has one root goal, boundaries, parent capability families, operating loop, evidence model, and revision model.
5. Author or revise the HTML-native system spec.
6. Keep `spec-metadata`, `graph-metadata`, visible prose, links, owned paths, and coverage aligned.
7. Evaluate against `foundation.author-system-spec.eval`; revise until no blocking finding remains.
8. Run the registry and graph checks required by `spec-workflow`.

## Readiness Gate

Ask only questions that materially change the system contract. Limit to three at a time; otherwise proceed with labeled assumptions.

- What is the single root operating goal?
- What is inside and outside the system boundary?
- What parent capability families must this system make reliable?
- How should reality/evidence revise the system over time?

Do not create a system spec for a feature, workflow layer, artifact, interface, department, or implementation detail. Route those back through `spec-selection`.
