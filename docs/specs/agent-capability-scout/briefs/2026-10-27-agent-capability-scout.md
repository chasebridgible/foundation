# Agent Capability Scout — 2026-10-27

Run `2026-10-27-agent-scout-01` checked all four enabled sources against the October 23 checkpoint. No source was blocked.

## Meaningful findings

- **9/10 — Containment must withstand agent-led boundary probing:** OpenAI's frontier-training program evaluates harness containment in purpose-built replicas with an offline world, overlapping isolation controls, explicit unauthorized-access objectives, runtime monitoring and pause behavior, adversarial red-teaming, remediation, and recurring reassessment.
- **6/10 — Efficient computer use expands the governed surface:** GPT-6.1 Terra combines lower-cost visual reasoning and computer use with reported testing for scope adherence, blocker disclosure, and prompt-injection resistance; this is a broad deployment signal rather than new doctrine.

## No new broad finding

Anthropic had no newer scoped agent-system item; Google AI Developers had no later eligible item; Addy Osmani's personal blog had no newer post.

## Principle gate

The containment finding was separately tested against nearby Agent Principles and AI Evals Principles. It is durable, but not additive: existing doctrine already requires deterministic high-risk boundaries; whole-system environment contracts; trace inspection; robustness and misuse coverage; and failure-derived regressions. No principles document was changed.

Evidence snapshots and normalized records are in `docs/specs/agent-capability-scout/`. Publication and notification receipts below will record the actual GitHub outcome.
