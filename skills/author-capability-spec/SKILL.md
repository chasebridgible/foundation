---
name: author-capability-spec
description: Create or revise parent or child capability specs after spec-selection has classified the work as a capability. Use only with a Spec Selection Result.
---

# Author Capability Spec

Use this skill only after `spec-selection` selects `parent capability` or `child capability`.

Owning capability: `foundation.author-durable-specs.capability`.
Owning job: `foundation.author-capability-spec.job`.
Eval gate: `foundation.author-capability-spec.eval`.

## Process

1. Read the Spec Selection Result.
2. Read `docs/specs/spec-selection.html#capability-job-tests` and `docs/specs/templates/capability-spec-template.html`.
3. Run the readiness gate before authoring.
4. Confirm the candidate is a standing ability or durable outcome, not triggered work.
5. For a parent capability, name the broad outcome family and the child outcomes it makes coherent.
6. For a child capability, name the narrower reliable outcome and the jobs, rules, evidence, and evals it can own. Keep the visible title and graph label outcome-shaped even when the compatibility ID is older.
7. Author or revise the HTML-native capability spec with explicit jobs and `realized-by` graph edges.
8. Evaluate against `foundation.author-capability-spec.eval`; revise until no blocking finding remains.
9. Run `npm run foundation:capability-language:check`, then the registry, graph, and self-map checks required by `spec-workflow`.

## Readiness Gate

Ask only questions that materially change the capability boundary. Limit to three at a time; otherwise proceed with labeled assumptions.

- What reliable outcome or standing ability should exist?
- Is this a broad parent outcome family or a narrower child outcome?
- What jobs make this capability real?
- What evidence would show the capability is reliable?

Reject artifact names, route names, phase names, process steps, queue rows, and verb phrases unless they can be rewritten as reliable outcomes. Parent capabilities decompose outcomes; they do not group departments, specs, phases, or layers.
