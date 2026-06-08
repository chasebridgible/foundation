# Agent Capability Scout Brief: 2026-06-08

Run ID: `2026-06-08-agent-scout-01`
Status: `complete`
Source registry version: `2026-06-05`
Branch: `codex/agent-capability-scout-20260608-02`

## Sources Checked

- `openai-news`: fetched. Current page still lists Jun 4 memory, Jun 3 GPT-Rosalind, Jun 2 Codex role/tool/workflow update, Jun 1 AWS availability, May 29 evaluation playbook, and May 27 self-improving tax agents.
- `anthropic-news`: fetched. Current page still lists Jun 3 Services Track and Partner Hub, Jun 3 cyber-threat mapping, Jun 2 Project Glasswing, and the May 28 Claude Opus 4.8 product item.
- `google-ai-developers`: fetched. Current AI-filtered page still lists Jun 5 Colab CLI, Jun 3 Gemma local-agent workflow items, and other recent AI infrastructure items.
- `addy-osmani-blog`: fetched. Current blog index now lists Jun 7 "Loop Engineering" above the previously captured "The Intent Debt" and "The Orchestration Tax" posts.

## Top Interest Grade

Top grade: `8`

The highest-value finding is Addy Osmani's "Loop Engineering": agent leverage is moving from one-off prompting toward recurring loops that discover work, assign it, verify it, persist state, and continue from durable memory. This is directly relevant to Foundation's automation, skill, worktree, sub-agent, and write-through checkpoint design.

## Findings

- Grade 8, `2026-06-08-agent-scout-01-finding-01`, Addy Osmani: design recurring agent loops as control systems with durable state, isolated worktrees, packaged skills, real-tool connectors, and maker/checker separation. No principles-doc patch was made because the standalone additive gate failed; existing Agent Principles already cover engineering the agent system, durable state, role separation, restartable long runs, and review-throughput limits.

## Principle Candidates

- `2026-06-08-agent-scout-01-principle-01`: rejected for `docs/principles/agent-principles.html`.
- Proposed principle evaluated: design loops as control planes, not prompt chains.
- Standalone additive eval: fail.
- Reason: the finding is important but overlaps current Agent Principles rather than adding a distinct durable rule.
- Patch path: none.

## Artifact Paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-06-08-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Merge And Notification State

- Merge state: `pr-open` pending PR creation, checks, and routine scout-state merge assessment.
- Notification state: pending GitHub App PR comment after PR creation.
- Requested owner action: review the run summary; no doctrine patch needs owner judgment.
