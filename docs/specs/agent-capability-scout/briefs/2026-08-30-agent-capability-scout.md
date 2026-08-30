# Agent Capability Scout Brief - 2026-08-30

- Run ID: `2026-08-30-agent-scout-01`
- Started at: `2026-08-30T05:02:34Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260830-01`
- Status: complete

## Sources checked

- `openai-news`: fetched. New relevant source items included the Cursor/SpaceX contract wind-down, Thailand AI startup accelerator, and the previously observed critical-thinking education item. One OpenAI finding was created.
- `anthropic-news`: fetched. The newest relevant Anthropic item remained the Model Hardware Standard research preview recorded by the August 28 scout; the support-for-scientists item did not add a new broad agent-system lesson.
- `google-ai-developers`: fetched. The newest visible August 27 AI item was narrow domain deep-learning work, while the latest agent-relevant embedding and live/voice ADK eval items were already recorded by prior scouts.
- `addy-osmani-blog`: fetched. The latest agent-engineering personal blog posts remained the August items already recorded by the August 24 scout.

## Top findings

1. `2026-08-30-agent-scout-01-finding-01` - OpenAI, `Our decision on Cursor following its acquisition by SpaceX`. Interest grade: 8/10. The broadly useful lesson is that agent-platform integrations need change-of-control review, revocable model access, compliance evidence, future-model boundary controls, transition notice, and downstream continuity handling when ownership or accountability assumptions change.

Top interest grade: 8.

## Principle candidates

One candidate was evaluated and rejected as non-additive. No principles-doc patch was made.

- `2026-08-30-agent-scout-01-principle-01`: agent-platform integrations should make model access revocable when ownership, compliance, safety, or accountability assumptions change, while preserving reviewable transition paths for affected downstream users.

Existing Agent Principles and AI Evals Principles already cover this as whole-harness design, mechanical safeguards, explicit tool and permission contracts, human accountability, high-risk approval boundaries, reviewable change flow, whole-system identity, policy compliance, environment contracts, and risk-first acceptance.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-08-30-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- PR: https://github.com/chasebridgible/foundation/pull/128
- Merge state: PR 128 passed the required `Spec registry and metadata` check and merged at `2026-08-30T05:07:32Z`.
- Notification state: GitHub App notification sent at https://github.com/chasebridgible/foundation/pull/128#issuecomment-5466838399.
- Requested owner action: @chasebridgible no merge action needed; no principles-doc patch needs owner judgment.
