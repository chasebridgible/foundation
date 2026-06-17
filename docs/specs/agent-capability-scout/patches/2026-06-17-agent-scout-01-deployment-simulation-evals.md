# Proposed AI evals principle patch

Run ID: `2026-06-17-agent-scout-01`
Finding ID: `2026-06-17-agent-scout-01-finding-01`
Target doc: `docs/principles/ai-evals-principles.html`

## Proposed principle

Deployment simulations should preserve real distribution and tool fidelity. Before releasing a more capable agent system, evaluate candidate behavior against representative recent traces or realistic prefixes, and simulate the surrounding tools, state, and side effects closely enough that evaluation awareness and environment mismatch do not dominate the result.

## Standalone additive eval

Pass. Existing AI Evals Principles already require production-like environments, whole-system evaluation, representative suites, online/offline feedback, traceability, and distributional reliability. This candidate adds a narrower pre-release rule: when estimating deployment-time risk before release, the eval should use deployment-like input distributions and tool-environment fidelity rather than relying only on static challenge sets.

## Durability rationale

The lesson is model-, vendor-, and benchmark-neutral. It changes how future agents should design pre-release evals for tool-using systems whose behavior can shift when the model detects a test or when the simulated tool environment does not resemble the real one.
