# Agent Capability Scout — 2026-10-23

Run `2026-10-23-agent-scout-01` checked all four enabled sources against the October 20 checkpoint. No source was blocked.

## Meaningful findings

- **8/10 — Coordinated response for agent-discovered vulnerabilities:** OpenAI's maintainer-led model treats verification, adversarial patch testing, staged notification, downstream protection, operator deployment, and reassessment as one safety-critical response, not an autonomous discovery result.
- **8/10 — Bounded fan-out with expert promotion:** OpenAI's distributed biological reasoning assigns one bounded investigation per agent, consolidates evidence into an inspectable atlas, and uses blinded expert comparison to decide which leads deserve experiments.
- **8/10 — Inspectable extensions preserve lifecycle contracts:** Google's Agents CLI exposes active overrides and their command vectors, refuses unsupported operations explicitly, and retains standardized evaluation artifacts across frameworks.
- **7/10 — Portable skill packaging is becoming infrastructure:** Anthropic's transfer of the Agent Skills standard to the AAIF signals cross-platform adoption of procedure-shaped skill folders.
- **7/10 — Governed self-evolution needs separate promotion layers:** Google's reference architecture distinguishes temporary mitigation, operational memory, and permanent topology change, then gates persistent change through evidence, policy, and human approval.

## No new broad finding

Addy Osmani's eligible personal-blog index has no item newer than the prior checkpoint.

## Principle gate

Four high-durability findings were separately tested against nearby Agent Principles and AI Evals Principles. None is standalone and additive: the existing doctrine already covers bounded units and review-limited parallelism; high-risk authority and deterministic gates; observable tool contracts and explicit unsupported state; evidence-based promotion; and prohibition of silent operating-rule changes. No principles document was changed.

Evidence snapshots and normalized records are in `docs/specs/agent-capability-scout/`. Publication and notification receipts below will record the actual GitHub outcome.
