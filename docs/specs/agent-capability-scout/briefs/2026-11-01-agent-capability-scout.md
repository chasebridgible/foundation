# Agent Capability Scout — 2026-11-01

Run ID: `2026-11-01-agent-scout-01`  
Baseline: `2026-10-29-agent-scout-01`  
Status: complete; principles-doc patch requires owner judgment before merge.

## Sources checked

- OpenAI — one promoted finding.
- Anthropic — no promoted scoped change.
- Google AI Developers — no promoted scoped change.
- Addy Osmani — no promoted scoped change.

## Top finding — 9/10

OpenAI's frontier-model monitoring loop treats misalignment detection as a whole-system, adversarially tested operation across training, evaluation, internal use, and tool-enabled harnesses. Its most durable lesson is that a monitor should not create direct incentives for the observed agent to conceal the very behavior being detected: separate monitoring feedback from per-action reward or continuation signals, and test the monitor boundary for evasion.

## Principle candidate

`2026-11-01-agent-scout-01-principle-01` passed the standalone, additive, durable, and evidence-traceability gate. It adds evaluator-induced concealment to the AI Evals Principles and therefore needs owner review before merge.

## Next action

Review the principles-doc patch on the scout PR. The scout checker and spec check are required before publication.

