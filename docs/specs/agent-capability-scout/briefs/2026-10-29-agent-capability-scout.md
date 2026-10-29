# Agent Capability Scout — 2026-10-29

- Run ID: `2026-10-29-agent-scout-01`
- Comparison baseline: `2026-10-27-agent-scout-01`
- Sources checked: OpenAI, Anthropic, Google AI Developers, Addy Osmani
- Status at artifact checkpoint: complete; publication and notification pending

## High-interest findings

1. **8/10 — Google AI Developers:** Agent-quality improvement needs a repeatable loop around representative cases, generated traces, complete result artifacts, per-case comparison, scheduled regression runs, and thresholded alerting. A mean score is insufficient decision evidence when different failures are concentrated in different cases.
2. **7/10 — OpenAI:** Independent security review can expand from a pull-request diff to dependencies and linked repositories while retaining an isolated verification boundary, human-approved remediation, and human shipping authority.

## Principle candidates

One candidate was evaluated and rejected as non-additive. The Google finding reinforces existing AI Evals Principles on traceable runs, diagnostic evidence, regression suites, and controlled comparisons. No principles document changed.

## No promoted finding

Anthropic and Addy Osmani had no new scoped item to promote in the inspected source listings.

## Artifact paths

- `docs/specs/agent-capability-scout/evidence/2026-10-29-agent-scout-01/`
- `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- `docs/specs/agent-capability-scout/findings.jsonl`
- `docs/specs/agent-capability-scout/principle-candidates.jsonl`

## Next action

Publish the routine scout-state checkpoint through the protected Foundation PR flow, then notify `@chasebridgible` from the automated-worker-notifications GitHub App.
