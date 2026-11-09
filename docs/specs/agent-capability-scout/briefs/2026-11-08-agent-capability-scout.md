# Agent Capability Scout — 2026-11-08

- Run ID: `2026-11-08-agent-scout-01`
- Comparison baseline: `2026-11-04-agent-scout-01`
- Sources checked: OpenAI, Anthropic, Google AI Developers, Addy Osmani
- Status at artifact checkpoint: complete; publication and notification pending

## High-interest findings

1. **8/10 — OpenAI:** Authorization is not proven by task success or policy text. High-consequence agent work needs controlled boundary probes that distinguish assigned actions from tempting adjacent targets, plus enforced access constraints, monitoring, and human oversight.
2. **8/10 — Google AI Developers:** Repository text is active agent context. Stale TODO/FIXME references can trigger unauthorized scope and large execution overhead, so instructions need canonical links, freshness signals, and human-reviewed cleanup.

## Principle candidates

Two candidates were separately evaluated and rejected as non-additive. The OpenAI finding reinforces existing outcomes-and-trace, robustness, misuse-pressure, and deterministic-boundary doctrine. The Google finding reinforces existing context curation, provenance, stale-artifact, and harness guidance. No principles document changed.

## No promoted finding

Anthropic and Addy Osmani had no new scoped item in the inspected source listings. Material dated after the run's local date was excluded.

## Artifact paths

- `docs/specs/agent-capability-scout/evidence/2026-11-08-agent-scout-01/`
- `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- `docs/specs/agent-capability-scout/findings.jsonl`
- `docs/specs/agent-capability-scout/principle-candidates.jsonl`

## Next action

Publish the routine scout-state checkpoint through the protected Foundation PR flow, then notify `@chasebridgible` from the automated-worker-notifications GitHub App.
