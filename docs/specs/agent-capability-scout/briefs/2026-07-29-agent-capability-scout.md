# Agent Capability Scout brief - 2026-07-29

Run ID: `2026-07-29-agent-scout-01`
Status: complete, PR open
Branch: `codex/agent-capability-scout-20260729-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. New visible items: `Scientific computing in the age of agentic AI` (July 28, 2026) and `How AI is expanding what people do at work` (July 27, 2026).
- `anthropic-news`: fetched. New visible items: `Our position on open-weights models` and `Cognizant and Anthropic expand their partnership to bring Claude to enterprise clients` (both July 27, 2026).
- `google-ai-developers`: fetched. No new visible item after `Run Ray on TPU, Part 2: Ray AI libraries`, already recorded in the 2026-07-25 run.
- `addy-osmani-blog`: fetched. No new personal blog item after `Software Factories, Light and Dark`, already recorded in the 2026-07-21 run.

## Top findings

Top interest grade: 9/10.

- 9/10 - OpenAI scientific-computing field report: coding agents shifted researchers toward verification, orchestration, and stewardship; durable value depended on external references, parity targets, simulations, staged benchmarks, tests, upstream coordination, and maintenance ownership.
- 8/10 - Anthropic/Cognizant enterprise adoption: Claude Code inside spec-driven development used project specifications, coding standards, architecture blueprints, and pre-production evaluation, with reported production workflow metrics.
- 7/10 - OpenAI Work at the Frontier: ChatGPT work use shows task crossover across occupational boundaries, strengthening the need to watch workflow ownership and handoffs as AI changes who does work.

## Principle candidates

Three candidates were evaluated and rejected as non-additive:

- `2026-07-29-agent-scout-01-principle-01`: agent-assisted rewrites need verification targets, upstream coordination, ownership, attribution, and maintenance plans.
- `2026-07-29-agent-scout-01-principle-02`: AI-mediated workflows should be evaluated for changed role boundaries and handoffs.
- `2026-07-29-agent-scout-01-principle-03`: enterprise agents should move to production through domain-grounded specs, standards, output evaluation, and measured outcomes.

No principles-doc patch was made. Existing Agent Principles and AI Evals Principles already cover the durable parts of these lessons.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-29-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: `pr-open`
- PR: https://github.com/chasebridgible/foundation/pull/101
- Notification state: pending GitHub App PR comment after PR creation.
- Requested owner action: @chasebridgible review routine scout state when convenient; no principles-doc judgment is required.
