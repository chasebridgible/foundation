# Agent Capability Scout brief — 2026-11-11

Run ID: `2026-11-11-agent-scout-01`  
Status: complete  
Comparison baseline: `2026-11-08-agent-scout-01`

## What changed

- **8/10 — OpenAI / Cogent cyber defense factories.** The strongest signal is not the model claim but the control loop: shared enterprise context, deterministic policy checks before tool execution, independent authorization checking, tiered approval, sandboxing, and verified remediation. This is high-value evidence for designing authority-sensitive, long-running agents.
- **6/10 — Anthropic Fable 5.2 and Mythos 5.2.** The release reinforces that stronger agent capability must be paired with behavior testing, external evaluation, safeguards, monitoring, access restriction, and transparent fallbacks. It is useful supporting evidence for existing Foundation doctrine, not a distinct new operating pattern.

## No meaningful change

- Google AI Developers: no newly promoted scoped item after the prior run.
- Addy Osmani: no newly promoted scoped item after the prior run.

## Principle-candidate review

One candidate was evaluated and rejected. The proposed rule—executable authority boundaries should be independently enforced at tool-call time and matched to risk-tiered approval—is durable, but it is not additive: Agent Principles already requires deterministic high-risk boundaries, enforced gates, human high-risk approvals, and inspectable harnesses. No principles document changed.

## Evidence and next action

Evidence snapshots are stored under `docs/specs/agent-capability-scout/evidence/2026-11-11-agent-scout-01/`. The run is ready for the scout checker, protected GitHub publication, and the required GitHub App owner notification.
