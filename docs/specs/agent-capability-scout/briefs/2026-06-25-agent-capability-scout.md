# Agent Capability Scout brief - 2026-06-25

Run ID: `2026-06-25-agent-scout-01`
Status: complete pending publish closeout
Branch: `codex/agent-capability-scout-20260625-02`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: blocked by Cloudflare managed challenge; no finding recorded.
- `anthropic-news`: fetched. One meaningful finding recorded from the 2026-06-23 Claude Tag article.
- `google-ai-developers`: fetched. One meaningful finding recorded from the 2026-06-17 A2UI/MCP Apps article that was visible but not yet normalized in the prior run.
- `addy-osmani-blog`: fetched. No new personal blog item beyond the 2026-06-19 finding.

## Top findings

1. `2026-06-25-agent-scout-01-finding-01` - Anthropic Claude Tag. Interest grade: 9/10. Ambient team agents need collaboration-surface identity, scoped memory, explicit tool/data grants, asynchronous work controls, spend controls, and audit logs.
2. `2026-06-25-agent-scout-01-finding-02` - Google A2UI/MCP Apps. Interest grade: 8/10. Agentic UI should be a contract boundary: separate tool/data access from rendering, prefer host-native trusted components for standard interactions, and reserve custom embedded surfaces for complex state.

## Principle candidates

- `2026-06-25-agent-scout-01-principle-01`: rejected. The Claude Tag lesson is durable, but it is not additive to existing Agent Principles covering context curation, externalized memory, role separation, scoped permissions, long-running handoff, review throughput, and human authority.
- `2026-06-25-agent-scout-01-principle-02`: rejected. The A2UI/MCP lesson is useful architecture evidence, but existing Agent Principles already cover the agent-computer interface as a design surface, harness/tool boundaries, role separation, deterministic scaffolding, and whole-system evaluation.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-06-25-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state before publish: `pr-open`
- Notification state before publish: pending GitHub App PR comment after PR creation.
- Requested owner action: routine review; no principles-doc patch was made.
