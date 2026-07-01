# Agent Capability Scout brief - 2026-07-01

Run ID: `2026-07-01-agent-scout-01`
Status: complete pending publish closeout
Branch: `codex/agent-capability-scout-20260701-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. One meaningful finding recorded from `How agents are transforming work`, newly normalized after the prior run's OpenAI source block.
- `anthropic-news`: fetched. One meaningful finding recorded from `Claude Science: An AI workbench for researchers`.
- `google-ai-developers`: fetched. Two meaningful findings recorded from `Driving the Agent Quality Flywheel` and `Agent Development Kit Go 2.0`.
- `addy-osmani-blog`: fetched. No new personal blog item beyond the June findings already normalized.

## Top findings

1. `2026-07-01-agent-scout-01-finding-01` - Google agent-quality flywheel. Interest grade: 9/10. Strong eval signal: improve agents through independent evaluation, stable behavior-specific metrics, broad health metrics, production traces, and before/after deltas.
2. `2026-07-01-agent-scout-01-finding-02` - Google ADK Go 2.0. Interest grade: 8/10. Production agent harnesses are moving toward graph-based workflow control, typed shared state, resumable execution, HITL pauses, callbacks, telemetry, and isolated tool execution.
3. `2026-07-01-agent-scout-01-finding-03` - Anthropic Claude Science. Interest grade: 8/10. Domain workbenches can coordinate specialist agents, reviewer agents, bounded compute/data grants, and inspectable research artifacts.
4. `2026-07-01-agent-scout-01-finding-04` - OpenAI agents-at-work article. Interest grade: 7/10. Enterprise agent use is converging on delegated long-horizon work, parallel execution, review, and operational workflows rather than chat-only assistance.

## Principle candidates

- `2026-07-01-agent-scout-01-principle-01`: rejected. The agent-quality flywheel lesson is durable, but it is not additive to existing AI Evals Principles covering independent judgment, controlled comparisons, production traces, representative suites, offline/online loops, and distributional reliability.
- `2026-07-01-agent-scout-01-principle-02`: rejected. The ADK Go 2.0 lesson is durable, but it is not additive to existing Agent Principles covering restartability, durable state, role separation, deterministic gates, traceable handoff, and whole-system evaluation.
- `2026-07-01-agent-scout-01-principle-03`: rejected. The Claude Science workbench lesson is durable, but it is not additive to existing Agent Principles covering scoped permissions, role separation, human approval at high-risk boundaries, reviewer roles, and durable artifacts.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-01-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state before publish: `pr-open`
- PR: https://github.com/chasebridgible/foundation/pull/84
- Merge state after publish: `merged` at `2026-07-01T17:39:55Z`
- Notification state: GitHub App PR comment sent at https://github.com/chasebridgible/foundation/pull/84#issuecomment-4858452899
- Requested owner action: routine review; no principles-doc patch was made.
