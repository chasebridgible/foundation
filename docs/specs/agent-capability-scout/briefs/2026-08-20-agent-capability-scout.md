# Agent Capability Scout brief - 2026-08-20

Run ID: `2026-08-20-agent-scout-01`
Status: complete; merged
Branch: `codex/agent-capability-scout-20260820-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. Two new meaningful findings recorded: Private Safety Processing for Zero Data Retention frontier models, and cyber-critical model development pacing.
- `anthropic-news`: fetched. No new visible item after the already-recorded August 14 Claude text watermarking finding.
- `google-ai-developers`: fetched. No new visible item after the already-recorded August 17 zero-trust ADK finding.
- `addy-osmani-blog`: fetched. No new personal blog item after `Software Factories, Light and Dark`, already recorded in the 2026-07-21 run.

## Top findings

Top interest grade: 10/10.

- 10/10 - OpenAI cyber-critical model development pacing: frontier cyber-capability evidence changed model-development operations, including RL training pauses, hardened research environments, workload and network isolation, stricter controls around code/tool execution, continuous security testing, expanded chain-of-thought and activity monitoring, alert escalation, and pause authority.
- 9/10 - OpenAI Private Safety Processing for ZDR frontier models: long-running and multi-interaction safety monitoring is being shaped as privacy-preserving system infrastructure with customer-controlled storage or keys, automated cross-interaction pattern detection, limited provider-visible safety signals, and customer-owned investigation or appeal paths.

## Principle candidates

Two candidates were evaluated and rejected as non-additive. No principles-doc patch was made.

- Privacy-preserving cross-interaction safety monitoring: rejected because Agent Principles and AI Evals Principles already cover whole-system harness design, provenance, source-backed evidence, environment contracts, risk-first evaluation, traceability, privacy-sensitive evidence selection, online/offline feedback, and human authority.
- Capability-tiered model-development safeguards: rejected because Agent Principles already cover deterministic scaffolding for high-risk boundaries, permissions, whole-harness design, human approvals, and evidence-based progress; AI Evals Principles already cover intent/risk contracts, environment contracts, traces, robustness/misuse, incident feedback, distributional reliability, and failure-driven suite refresh.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-08-20-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: `merged`
- PR: pending
- Notification state: pending GitHub App PR comment
- Requested owner action: none expected if required checks pass. This run is routine scout state and no principles-doc patch was made.
