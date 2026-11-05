# Agent Capability Scout — 2026-11-04

- Run ID: `2026-11-04-agent-scout-01`
- Comparison baseline: `2026-11-02-agent-scout-01`
- Sources checked: OpenAI, Anthropic, Google AI Developers, Addy Osmani
- Status at artifact checkpoint: complete; publication and notification pending

## High-interest findings

1. **8/10 — OpenAI:** Agent-scale security research needs isolated dynamic validation, independent verification of the path to an apparently successful result, current-code revalidation, and human-owned external reporting. Terminal success alone is weak evidence for a high-consequence multi-step workflow.
2. **7/10 — Google AI Developers:** Agent costs should be measured per verified task across the complete retry, tool, and reasoning loop; a lightweight routing layer can reserve expensive reasoning for cases that need it, subject to preserved verified outcomes.

## Principle candidates

Two candidates were separately evaluated and rejected as non-additive. The OpenAI finding reinforces existing AI Evals Principles on outcomes and trace inspection, whole-system evaluation, environment isolation, independent judgment, and failure-derived controls. The Google finding reinforces existing outcome-first, resource-behavior, and cheapest-reliable-signal doctrine. No principles document changed.

## No promoted finding

Anthropic and Addy Osmani had no new scoped item in the inspected source listings.

## Artifact paths

- `docs/specs/agent-capability-scout/evidence/2026-11-04-agent-scout-01/`
- `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- `docs/specs/agent-capability-scout/findings.jsonl`
- `docs/specs/agent-capability-scout/principle-candidates.jsonl`

## Next action

Publish the routine scout-state checkpoint through the protected Foundation PR flow, then notify `@chasebridgible` from the automated-worker-notifications GitHub App.
