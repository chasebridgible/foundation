# Agent Capability Scout — 2026-11-07

- Run ID: `2026-11-07-agent-scout-01`
- Comparison baseline: `2026-11-04-agent-scout-01`
- Sources checked: OpenAI, Anthropic, Google AI Developers, Addy Osmani
- Status at artifact checkpoint: complete; publication and notification pending

## High-interest findings

1. **8/10 — Google AI Developers:** Incidental repository content can redirect coding agents into costly, unprompted scope expansion. Treat stale instruction-like artifacts as an agent-behavior defect: use corpus scanning, evidence-based history checks, reviewable cleanup, and preventive analyzers before they become ambient task context.
2. **8/10 — OpenAI:** High-capability agent evaluations should measure staying within an assigned authorization boundary independently from task completion, including attractive but out-of-scope paths in an isolated environment.

## Principle candidates

Google's ambient-context finding passed the separate gate as a durable, vendor-neutral, additive principle. It adds an explicit requirement to treat repository hygiene as behavior control, rather than merely advising agents to curate their active context. The smallest supporting patch is in Agent Principles → Context engineering.

OpenAI's scope-adherence finding was evaluated and rejected as non-additive. Existing Agent Principles already require work inside the mission, explicit authority, constrained tool boundaries, and evidence-based evaluation; the source provides a strong security-specific realization of that doctrine.

## No promoted finding

Anthropic and Addy Osmani had no new scoped item in the inspected source listings.

## Artifact paths

- `docs/specs/agent-capability-scout/evidence/2026-11-07-agent-scout-01/`
- `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- `docs/specs/agent-capability-scout/findings.jsonl`
- `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- `docs/principles/agent-principles.html`

## Next action

Publish the scout checkpoint through the protected Foundation PR flow. Because the run includes an additive principles-doc patch, leave the PR open for owner review after required checks pass.
