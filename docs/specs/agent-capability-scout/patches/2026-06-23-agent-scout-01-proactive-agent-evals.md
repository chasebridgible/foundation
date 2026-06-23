# Proposed AI Evals Principles patch - 2026-06-23

Candidate: `2026-06-23-agent-scout-01-principle-02`
Finding: `2026-06-23-agent-scout-01-finding-02`
Target: `docs/principles/ai-evals-principles.html`

## Proposed principle

Proactive agents need insight-policy evals, not only task-completion evals. When an agent can surface work before a human asks, the eval must judge what it chose to notice, what evidence supported the insight, and whether notifying, asking, drafting, or staying silent was the right intervention.

## Additive rationale

Existing AI Evals Principles cover whole-system identity, production-like environments, representative suites, traceability, and distributional reliability. This patch adds a distinct doctrine point for proactive agents whose failure mode is not only doing the wrong task, but choosing the wrong moment, evidence, or intervention for human attention.
