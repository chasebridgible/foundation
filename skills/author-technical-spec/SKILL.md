---
name: author-technical-spec
description: Create or revise technical specs after spec-selection has classified the work as implementation contract work or a technical companion spec is required.
---

# Author Technical Spec

Use this skill only after `spec-selection` selects `technical` or names a required technical companion spec.

Owning capability: `foundation.author-durable-specs.capability`.
Owning job: `foundation.author-technical-spec.job`.
Eval gate: `foundation.author-technical-spec.eval`.

## Process

1. Read the Spec Selection Result and the owning job or capability spec.
2. Read `docs/specs/templates/technical-spec-template.html`.
3. Run the readiness gate before authoring.
4. Define implementation contracts: data, APIs, commands, permissions, sequencing, concurrency, migration, failure/recovery, operational behavior, and owned paths.
5. Preserve latitude by distinguishing constrained behavior from flexible implementation choices.
6. Author or revise the HTML-native technical spec.
7. Link it to the owning job/capability and relevant evals.
8. Evaluate against `foundation.author-technical-spec.eval`; revise until no blocking finding remains.
9. Run the registry and graph checks required by `spec-workflow`.

## Readiness Gate

Ask only questions that materially change the implementation contract. Limit to three at a time; otherwise proceed with labeled assumptions.

- Which behavior is constrained versus flexible?
- What data, API, command, integration, permission, or infrastructure contracts matter?
- What failure, recovery, sequencing, concurrency, or migration paths matter?
- What evidence will prove the implementation contract works?

Do not use a technical spec to smuggle product intent that belongs in a system, capability, or job spec.
