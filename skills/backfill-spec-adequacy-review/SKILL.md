---
name: backfill-spec-adequacy-review
description: Review a backfilled capability slice before evaluator scoring. Use inside Backfill Specs after job, rendered UX, and technical specs are written to verify coverage, split boundaries, specificity, traceability, contract preservation, architecture flexibility, and spec-only rebuild readiness.
---

# Review Spec Adequacy

Use inside `backfill-specs` before `evaluate-backfill-specs`.

## Core Question

Could a future build agent implement the intended behavior from the specs while preserving required contracts and using implementation latitude where flexible?

## Check

- capability rows have job spec sections, technical spec sections, evidence, verification targets, status
- no attached row remains `needs-split`
- evidence surfaces are owned, parent-owned with reason, out of scope, or blocked by human decision
- visible/operator entry points map to concrete process/action rows
- job specs cover intent, actors, journeys, states, rules, edge cases, recovery, process, and evidence
- visible behavior includes rendered HTML-native UX or a nonvisual explanation
- technical specs cover data, APIs, services/jobs, permissions, integrations, timing, failures, observability, boundaries
- technical specs separate required contracts, current evidence, constraints, and latitude
- parent specs define vocabulary/graph; child specs carry behavior
- `graph-metadata` is present, valid, source-backed, and semantically aligned with capability/job/process/actor/tool/evidence/metric/gap prose
- technical, eval, and template specs are not graph orphans; they link to what they support, evaluate, or scaffold
- vague nouns, unsupported claims, summary-only prose, and missing state/rule tables are revised
- report/queue names owner skill, next action, exit criterion, capability IDs, and blocking gaps
- observed behavior, inferred intent, required future contract, and human decisions are separated
- spec-only rebuild probe lists source files still needed; source needed for core behavior means revision

## Graph Check

Run `npm run foundation:visible-business-graph:check -- --repo <repo>` before marking a slice ready when specs have been created or revised. Treat valid JSON as necessary but not enough: this review must also reject misleading graph relationships, missing actors/processes/tools/evidence, unsupported confidence, and source section IDs that do not match the prose.

## Output

Append an adequacy row/table to the dated report with slice ID, capability IDs, spec IDs, coverage results, revision actions, remaining questions, evaluator readiness, and status.

## Done

Mark `ready-for-evaluation` only after checks pass and the Capability Map is updated. Human questions may remain only when the intended behavior is clear and the questions are non-blocking.
