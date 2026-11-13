# Agent Capability Scout — 2026-11-12

- Run ID: `2026-11-12-agent-scout-01`
- Comparison baseline: `2026-11-08-agent-scout-01`
- Sources checked: OpenAI, Anthropic, Google AI Developers, Addy Osmani
- Status at artifact checkpoint: complete; publication and notification pending

## High-interest findings

1. **8/10 — OpenAI:** High-risk agent intervention needs an unavoidable control point: associate work with an authorization identity, re-check permission at execution, and fail closed when the controller is unavailable. This prevents a mutable workload from bypassing its own stop condition.
2. **7/10 — Google AI Developers:** Agent monitoring is stronger when it is tested on independently selected benchmarks, not only the failure shapes anticipated by its authors. Monitoring remains one defense in a broader tool- and policy-constrained system.

## Principle candidates

One candidate passed the standalone, additive, durable, and evidence-traceability gate. Agent Principles now states that high-risk controls should sit at unavoidable execution points and deny progress if the controller cannot decide. The Google finding was separately rejected as non-additive because existing independent-judgment, robustness, and whole-system evaluation principles already require the underlying behavior.

## No promoted finding

Anthropic’s newest scoped item was a model release without a distinct broad agent-systems lesson. Addy Osmani’s listed personal-blog content had no newer scoped item.

## Artifact paths

- `docs/specs/agent-capability-scout/evidence/2026-11-12-agent-scout-01/`
- `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- `docs/specs/agent-capability-scout/findings.jsonl`
- `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- `docs/principles/agent-principles.html`

## Next action

Publish the checkpoint through the protected Foundation PR flow, wait for required checks, and notify `@chasebridgible` from the automated-worker-notifications GitHub App.
