# Agent Capability Scout brief - 2026-07-19

Run ID: `2026-07-19-agent-scout-01`
Status: complete after delayed GitHub check recovery
Branch: `codex/agent-capability-scout-20260719-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. One meaningful finding recorded from `A scorecard for the AI age`.
- `anthropic-news`: fetched. No finding recorded; `Introducing Claude for Teachers` was inspected but did not clear the broad-change threshold.
- `google-ai-developers`: fetched. No new finding recorded; the highest-value Jul 16 items were already captured in the prior scout run.
- `addy-osmani-blog`: fetched. No new finding recorded; no post-Jul 15 personal blog item was visible.

## Top findings

1. `2026-07-19-agent-scout-01-finding-01` - OpenAI `A scorecard for the AI age`. Interest grade: 8/10. Agent systems should be judged by useful work completed, full cost per successful outcome, dependability, correction/escalation rate, and governance boundaries rather than adoption, fluency, or token price alone.

## Principle candidates

- `2026-07-19-agent-scout-01-principle-01`: rejected. The outcome-cost and dependability scorecard lesson is durable, but existing AI Evals Principles already cover outcomes first, whole-system evaluation, cost and resource behavior, risk boundaries, trace inspection, and routing work from evidence. Existing Agent Principles also cover progress by evidence, governance boundaries, and whole-harness evaluation.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-19-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: `merged`
- PR: https://github.com/chasebridgible/foundation/pull/92
- Notification state: GitHub App PR comment sent: https://github.com/chasebridgible/foundation/pull/92#issuecomment-5017900359
- Recovery: the required `Spec registry and metadata` GitHub check later passed, and PR 92 was merged at `2026-07-21T05:04:54Z`.
- Requested owner action: none for this recovered run. No principles-doc patch was made.
