# Agent Capability Scout Brief - 2026-09-25

- Run ID: `2026-09-25-agent-scout-01`
- Started at: `2026-09-25T10:45:36Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260925-01`
- Status: complete, initial PR pending publish

## Sources checked

- `openai-news`: fetched. Newer September 23 source cards were reviewed; the Airbnb GPT-6 Astra company-wide access item created one finding.
- `anthropic-news`: fetched. The September 23 VUMC enzyme-discovery source item created one finding.
- `google-ai-developers`: fetched. September 23-24 AI developer source items created three findings: MCP/API Gateway, local Antigravity SDK models, and OLMo open-model training.
- `addy-osmani-blog`: fetched. No newer unrecorded personal-blog post cleared the enabled topic scope after the September 23 scout baseline.

## Top findings

1. `2026-09-25-agent-scout-01-finding-01` - Anthropic, Claude/VUMC enzyme discovery. Interest grade: 10/10. Scientific agents need high-volume hypothesis generation, traceable rationale, expert steering, and physical-world validation before discovery claims become trusted.
2. `2026-09-25-agent-scout-01-finding-02` - Google, API Gateway to MCP tools. Interest grade: 9/10. Agent-facing APIs become more reliable when formal API contracts compile into hosted MCP tools with centralized auth and policy instead of improvised HTTP glue.
3. `2026-09-25-agent-scout-01-finding-03` - Google, local AI models with Antigravity SDK. Interest grade: 8/10. Local inference becomes part of agent architecture when privacy, latency, offline operation, cost, and hardware-aware routing matter.
4. `2026-09-25-agent-scout-01-finding-04` - Google, open model training with AI-generated data. Interest grade: 7/10. Open, reproducible training loops matter for agent stacks, especially when data filtering, ablations, and eval-bug correction are explicit.
5. `2026-09-25-agent-scout-01-finding-05` - OpenAI, Airbnb GPT-6 Astra adoption. Interest grade: 7/10. Enterprise agent adoption becomes more useful when assistant access, remote agents, and product/support/design workflows are treated as operating surfaces rather than isolated chat usage.

Top interest grade: 10.

## Principle candidates

Three candidates were evaluated and rejected as non-additive. No principles-doc patch was made.

- `2026-09-25-agent-scout-01-principle-01`: scientific discovery agents should separate fast hypothesis generation from expert judgment and physical-world validation.
- `2026-09-25-agent-scout-01-principle-02`: agent-facing APIs should expose formal contracts as hosted tools with centralized authorization and policy.
- `2026-09-25-agent-scout-01-principle-03`: local-model agent systems should treat privacy, latency, hardware, offline operation, and cost as routing dimensions.

Existing Agent Principles and AI Evals Principles already cover these through whole-agent-system design, explicit tool and permission contracts, environment contracts, traceable runs, complementary signals, human authority, high-risk review, cost/resource behavior, and risk-calibrated evaluation.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-09-25-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- PR: pending.
- Merge state: `pr-open` placeholder until the branch is pushed and the PR is created.
- Notification state: pending GitHub App PR comment after PR creation.
- Requested owner action: review the PR once opened, with attention to the 10/10 Anthropic discovery-agent finding and the 9/10 Google MCP/API-contract finding.
