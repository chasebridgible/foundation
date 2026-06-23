# Agent Capability Scout brief - 2026-06-23

Run ID: `2026-06-23-agent-scout-01`
Status: complete pending publish closeout
Branch: `codex/agent-capability-scout-20260623-02`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: blocked by Cloudflare managed challenge; no finding recorded.
- `anthropic-news`: fetched. Newest visible items were office, policy, access, and ecosystem announcements; no new agent-system finding recorded.
- `google-ai-developers`: fetched. Two meaningful findings recorded from newly visible 2026-06-22 items.
- `addy-osmani-blog`: fetched. No new personal blog item beyond the 2026-06-19 finding.

## Top findings

1. `2026-06-23-agent-scout-01-finding-02` - Google Jules proactive-agent eval work. Interest grade: 9/10. Proactive coding agents need goal-level and insight-policy evaluation, not only task-completion benchmarks.
2. `2026-06-23-agent-scout-01-finding-01` - Google ADK/A2A cross-language multi-agent pipeline. Interest grade: 8/10. Production multi-agent systems benefit from protocol-level discovery, narrow ownership, inspectable handoff, deterministic subcomponents, and fallback routing.

## Principle candidates

- `2026-06-23-agent-scout-01-principle-01`: rejected. The ADK/A2A production decomposition lesson is useful but not additive to existing Agent Principles covering harness design, context discipline, role separation, verifiable units, deterministic high-risk scaffolding, and durable handoff.
- `2026-06-23-agent-scout-01-principle-02`: proposed. The Jules proactive-agent eval lesson is additive to AI Evals Principles because it names a distinct intervention-policy target: what the agent chooses to notice, evidence, surface, ask, draft, or suppress.

A principles-doc patch was made in `docs/principles/ai-evals-principles.html`; owner judgment is requested before merge.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-06-23-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state before publish: `pr-open`
- Notification state before publish: pending GitHub App PR comment after PR creation.
- Requested owner action: review the proposed AI Evals principle before merge.
