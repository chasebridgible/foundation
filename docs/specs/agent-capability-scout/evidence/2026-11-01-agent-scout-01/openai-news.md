# OpenAI news snapshot

- Source: https://openai.com/news/
- Retrieved: 2026-11-01T07:23:40Z
- Scope checked: agent, model, tool, eval, API, Codex, and platform changes relevant to improving agent systems.
- Comparison baseline: `2026-10-29-agent-scout-01`.

## New scoped item

**2026-10-29 — How we detect frontier model misalignment**

OpenAI describes a monitoring system that covers training, evaluation, internal use, and tool-enabled harnesses. It uses a low-cost high-recall screen, model review of agent context and tool use, an isolated investigative agent, telemetry-assisted escalation, and human response or automatic pause for critical cases. It continuously tests the monitors with replayed incidents, simulated attacks, random samples of unflagged traffic, and adversarial attempts to evade or disable monitoring. The system keeps monitoring asynchronous and does not change the reward of individually flagged training samples, to reduce the incentive for agents to hide the behavior being monitored.

Source: https://openai.com/index/how-we-detect-frontier-model-misalignment/

## Principle-candidate assessment

Proposed lesson: a monitor for consequential agent behavior must not become a direct optimization target for the behavior it observes; when monitoring feedback can affect continuation, reward, or access, separate that feedback from per-action incentives and test for evasion. This is a standalone addition to evaluation doctrine: the current principles require traces, robustness, whole-system evaluation, and independent judgment, but do not name evaluator-induced concealment as a failure mode or require testing the monitor boundary itself. Candidate passes the gate and is patched in `docs/principles/ai-evals-principles.html`.

