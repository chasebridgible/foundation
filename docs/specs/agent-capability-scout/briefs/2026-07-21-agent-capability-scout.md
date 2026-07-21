# Agent Capability Scout brief - 2026-07-21

Run ID: `2026-07-21-agent-scout-01`
Status: complete and merged
Branch: `codex/agent-capability-scout-20260721-02`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. One top finding recorded from `Safety and alignment in an era of long-horizon models`.
- `anthropic-news`: fetched. One medium finding recorded from the rare-disease AI-for-science grant call.
- `google-ai-developers`: fetched. One lower-grade implementation finding recorded from `Run Ray on TPU, Part 1: The foundations`.
- `addy-osmani-blog`: fetched. One top finding recorded from `Software Factories, Light and Dark`.

## Top findings

1. `2026-07-21-agent-scout-01-finding-01` - OpenAI long-horizon safety and alignment. Interest grade: 10/10. Long-running agents need trajectory-level monitoring, incident-derived evals, limited monitored rollout, pause/rollback authority, and inspectable user controls because pre-deployment evals and per-action gates miss sequence-level failures.
2. `2026-07-21-agent-scout-01-finding-02` - Addy Osmani `Software Factories, Light and Dark`. Interest grade: 9/10. Agent factories should treat verification and review throughput as the autonomy constraint, not generation capacity.
3. `2026-07-21-agent-scout-01-finding-03` - Anthropic rare-disease AI-for-science grants. Interest grade: 7/10. High-stakes science agents need agent-readable knowledge substrate, explicit task evals, expert validation, and honest data-quality limits.
4. `2026-07-21-agent-scout-01-finding-04` - Google Ray on TPU. Interest grade: 5/10. Distributed AI infrastructure should encode resource topology constraints in scheduler primitives, but this is mostly platform plumbing rather than direct agent doctrine.

## Principle candidates

- `2026-07-21-agent-scout-01-principle-01`: rejected. Trajectory-level long-horizon safety is durable, but AI Evals Principles already cover production traces, failure-driven suite refresh, whole-system identity, trace visibility, robustness and misuse pressure, and failure-to-regression promotion.
- `2026-07-21-agent-scout-01-principle-02`: rejected. Agent-factory backpressure is durable, but Agent Principles already cover review throughput, human authority, deterministic high-risk gates, whole-harness design, evidence-based progress, and externalized state.
- `2026-07-21-agent-scout-01-principle-03`: rejected. Domain-agent scientific validation is durable, but AI Evals Principles already cover intent/risk contracts, production-like environments, expert labeling, traceable evidence, and failure-driven evals.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-21-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: `merged`
- PR: https://github.com/chasebridgible/foundation/pull/93
- Notification state: GitHub App PR comment sent: https://github.com/chasebridgible/foundation/pull/93#issuecomment-5030392415
- Related recovery: PR 92 from the 2026-07-19 run was merged at `2026-07-21T05:04:54Z` after its required check recovered.
- Closeout: PR 93 passed `Spec registry and metadata` and merged at `2026-07-21T05:13:35Z`.
- Requested owner action: none. This run was routine scout state with no principles-doc patch.
