---
name: author-eval-spec
description: Create or revise eval specs after spec-selection has classified the work as an evaluation contract or an eval companion spec is required.
---

# Author Eval Spec

Use this skill only after `spec-selection` selects `eval` or names a required eval companion spec.

Owning capability: `foundation.author-durable-specs.capability`.
Owning job: `foundation.author-eval-spec.job`.
Eval gate: `foundation.author-eval-spec.eval`.

## Process

1. Read the Spec Selection Result and the spec being evaluated.
2. Read `docs/principles/ai-evals-principles.html` for judge/eval changes and `docs/specs/templates/eval-spec-template.html`.
3. Run the readiness gate before authoring.
4. Define evidence, acceptance conditions, failure conditions, judge method, revision target, and gap handling.
5. Include anti-shortcut cases when agents could pass structurally while missing intent.
6. Author or revise the HTML-native eval spec.
7. Link it to the job, capability, technical spec, or system spec it evaluates.
8. Evaluate against `foundation.author-eval-spec.eval`; revise until no blocking finding remains.
9. Run the registry and graph checks required by `spec-workflow`.

## Readiness Gate

Ask only questions that materially change the judgment contract. Limit to three at a time; otherwise proceed with labeled assumptions.

- What evidence should be judged?
- What must pass, fail, block, or route revision?
- What judge method or deterministic check should be used?
- What shortcuts or generic outputs must this eval reject?

An eval spec must judge evidence. A test collects evidence; the eval decides whether that evidence is good enough.
