# Agent Capability Scout Brief: 2026-06-07

Run ID: `2026-06-07-agent-scout-01`
Status: `complete`
Source registry version: `2026-06-05`
Branch: `codex/agent-capability-scout-20260607-01`

## Sources Checked

- `openai-news`: fetched. Current page still lists Jun 4 memory, Jun 2 Codex role/tool/workflow update, Jun 1 AWS availability, May 29 evaluation playbook, and May 27 self-improving tax agents.
- `anthropic-news`: fetched. Current page lists Jun 3 partner-network and cyber-threat-mapping items plus prior Claude Opus 4.8 dynamic-workflow item.
- `google-ai-developers`: fetched. Current AI-filtered page lists Jun 5 Colab CLI, Jun 3 Gemma local-agent workflow items, and other AI infrastructure items.
- `addy-osmani-blog`: fetched. Current blog index lists Jun 5 "The Intent Debt" and recent agent-engineering posts.

## Top Interest Grade

Top grade: `9`

The highest-value finding is Addy Osmani's "Intent Debt": agents can infer plausible rationales from code, but they cannot recover the true goals, constraints, and decisions that were never externalized. This is directly relevant to Foundation because the substrate should preserve load-bearing intent as inspectable artifacts for cold-start future agents.

## Findings

- Grade 9, `2026-06-07-agent-scout-01-finding-04`, Addy Osmani: externalize load-bearing intent for agents. Principle candidate created and patched into `docs/principles/agent-principles.html`.
- Grade 8, `2026-06-07-agent-scout-01-finding-01`, OpenAI: Codex role plugins package apps, skills, instructions, and workflows; Sites and annotations make generated work shareable and locally refinable.
- Grade 7, `2026-06-07-agent-scout-01-finding-03`, Google: Gemma local-agent workflow points to local/offline agent execution boundaries for privacy-sensitive or latency-sensitive tasks.
- Grade 6, `2026-06-07-agent-scout-01-finding-02`, Anthropic: partner-network maturity metrics and MCP-connected operational status are useful, but lower-directness, signals for production agent systems.

## Principle Candidates

- `2026-06-07-agent-scout-01-principle-01`: proposed for `docs/principles/agent-principles.html`.
- Proposed principle: externalize load-bearing intent, not only state.
- Standalone additive eval: pass.
- Patch path: `docs/specs/agent-capability-scout/patches/2026-06-07-agent-scout-01-intent-artifacts.md`.

## Artifact Paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-06-07-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Merge And Notification State

- Merge state: `pr-open` pending PR creation and owner review.
- Notification state: pending GitHub App PR comment after PR creation.
- Requested owner action: review the proposed Agent Principles addition before merge.

