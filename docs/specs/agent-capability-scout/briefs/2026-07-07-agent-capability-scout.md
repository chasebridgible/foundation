# Agent Capability Scout brief - 2026-07-07

Run ID: `2026-07-07-agent-scout-01`
Status: complete pending publish closeout
Branch: `codex/agent-capability-scout-20260707-02`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. No new post-2026-07-01 item on the visible news index cleared the meaningful-finding threshold.
- `anthropic-news`: fetched. One meaningful finding recorded from the Government of Alberta Claude Code security-modernization case study. `The Making of Claude Code` was visible on the index, but the article page did not expose enough readable article text in the browser to support a standalone finding.
- `google-ai-developers`: fetched. Two meaningful findings recorded from `Why we built ADK 2.0` and `Build agentic full-stack apps with Genkit`.
- `addy-osmani-blog`: fetched. One meaningful finding recorded from `Agentic Autonomy Levels`; `The Agent-Era Career` was useful but mostly reinforced existing Foundation authority and verification principles.

## Top findings

1. `2026-07-07-agent-scout-01-finding-01` - Addy Osmani autonomy levels. Interest grade: 9/10. Autonomy becomes a risk, evidence, reversibility, rollback, ownership, and metric calibration problem rather than a status badge.
2. `2026-07-07-agent-scout-01-finding-02` - Google ADK 2.0 workflow rationale. Interest grade: 8/10. Production agent systems should move predictable routing, compliance order, failure states, and context boundaries into deterministic workflow scaffolding.
3. `2026-07-07-agent-scout-01-finding-03` - Google Genkit Agents API. Interest grade: 8/10. Full-stack agents need session state, snapshots, branching, interruptible tools, validated resume, detached work, artifact streams, specialist delegation, and inspection UI as runtime contracts.
4. `2026-07-07-agent-scout-01-finding-04` - Anthropic Alberta security-modernization case study. Interest grade: 8/10. High-risk code agents scale through deterministic scanning, exact evidence citations, generated tests, specialist reviewers, continuous controls, and human approval.

## Principle candidates

- `2026-07-07-agent-scout-01-principle-01`: rejected. The autonomy-calibration lesson is durable, but existing Agent Principles already cover restartability before autonomy, small verifiable units, cost-to-risk calibration, review throughput, human high-risk approval, deterministic scaffolding, and evidence-based progress.
- `2026-07-07-agent-scout-01-principle-02`: rejected. The deterministic-workflow lesson is durable, but existing Agent Principles already cover mechanical invariants, deterministic scaffolding, whole-harness design, and explicit context boundaries.
- `2026-07-07-agent-scout-01-principle-03`: rejected. The full-stack agent runtime lesson is durable, but existing Agent Principles already cover externalized state, restartability, durable handoff, high-risk approvals, artifact channels, and the agent-computer interface.
- `2026-07-07-agent-scout-01-principle-04`: rejected. The high-risk security-agent lesson is durable, but existing Agent Principles already cover deterministic gates, evidence, role separation, external evaluation, human high-risk approval, and reviewable change flow.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-07-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state before publish: `pr-open`
- PR: pending.
- Notification state: pending GitHub App PR comment after PR creation.
- Requested owner action: routine review; no principles-doc patch was made.
