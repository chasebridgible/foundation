# Agent Capability Scout brief - 2026-07-25

Run ID: `2026-07-25-agent-scout-01`
Status: complete and merged
Branch: `codex/agent-capability-scout-20260725-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. One new finding recorded from `Launching Health in ChatGPT`.
- `anthropic-news`: fetched. One high finding recorded from `Introducing Claude Opus 5`.
- `google-ai-developers`: fetched. One medium finding recorded from `Run Ray on TPU, Part 2: Ray AI libraries`.
- `addy-osmani-blog`: fetched. No new meaningful item after `Software Factories, Light and Dark`, recorded in the prior run.

## Top findings

1. `2026-07-25-agent-scout-01-finding-01` - Anthropic Claude Opus 5. Interest grade: 8/10. Model progress is being expressed as agent operating behavior: careful iteration, self-built test harnesses, lower variance, browser-based artifact inspection, memory correction, cleaner handoff, and safety-gated fallbacks.
2. `2026-07-25-agent-scout-01-finding-02` - OpenAI Health in ChatGPT. Interest grade: 8/10. Sensitive connected-data agents need explicit permission, privacy and memory boundaries, expert-shaped evals, disclosure checks before downstream actions, and red-team feedback loops.
3. `2026-07-25-agent-scout-01-finding-03` - Google Ray on TPU Part 2. Interest grade: 6/10. Infrastructure for large AI workloads is moving toward declarative topology, JAX-native data movement, checkpointing, fault tolerance, prebuilt runtime images, and dashboard metrics.

## Principle candidates

- `2026-07-25-agent-scout-01-principle-01`: rejected. Opus 5's self-verification and handoff behavior is durable, but Agent Principles already cover whole-harness design, evidence-based progress, deterministic scaffolding, role separation, and human accountability; AI Evals Principles already cover whole-system evaluation, traceability, variance, resource behavior, and risk-tiered safeguards.
- `2026-07-25-agent-scout-01-principle-02`: rejected. Sensitive connected-data agent permissions are durable, but Agent Principles already cover permissions, memory provenance, high-risk approval, and human authority; AI Evals Principles already cover risk contracts, high-risk evidence sampling, production-like environments, robustness/misuse pressure, and traceable auditability.
- `2026-07-25-agent-scout-01-principle-03`: rejected. Declarative accelerator topology and observability are useful, but the lesson is mostly infrastructure-specific and already covered by harness/environment contracts, whole-system eval identity, and risk-calibrated operational evidence.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-25-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: `pr-open`
- PR: https://github.com/chasebridgible/foundation/pull/97
- Notification state: GitHub App PR comment sent: https://github.com/chasebridgible/foundation/pull/97#issuecomment-5077061178
- Closeout: PR 97 passed `Spec registry and metadata` and merged at `2026-07-25T05:09:45Z`.
- Requested owner action: none. This run was routine scout state with no principles-doc patch.
