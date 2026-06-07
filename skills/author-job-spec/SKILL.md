---
name: author-job-spec
description: Create or revise job specs after spec-selection has classified the work as a job. Use for triggered work with actors, process, states, rules, evidence, and exit criteria.
---

# Author Job Spec

Use this skill only after `spec-selection` selects `job`.

Owning capability: `foundation.author-durable-specs.capability`.
Owning job: `foundation.author-job-spec.job`.
Eval gate: `foundation.author-job-spec.eval`.

## Process

1. Read the Spec Selection Result.
2. Read `docs/specs/templates/job-spec-template.html` and the owning capability spec.
3. Run the readiness gate before authoring.
4. Capture trigger, actor candidates, intended outcome, process, required context, interfaces, states, rules, edge cases, outputs, evidence, and revision target.
5. Author or revise the HTML-native job spec.
6. Link the job to its capability with registry relationships and a `supports` graph edge.
7. Keep technical and eval companion needs explicit instead of hiding them in prose.
8. Evaluate against `foundation.author-job-spec.eval`; revise until no blocking finding remains.
9. Run the registry and graph checks required by `spec-workflow`.

## Readiness Gate

Ask only questions that materially change the job contract. Limit to three at a time; otherwise proceed with labeled assumptions.

- What triggers this job?
- Who or what performs it?
- What output or state proves the job is complete?
- What states, rules, permissions, edge cases, or recovery paths matter?

A job spec does not decide whether work is a capability. If that boundary is unclear, return to `spec-selection`. Jobs may support multiple capabilities, but they need a primary owning capability and evidence that the job is not hiding several unrelated jobs.
