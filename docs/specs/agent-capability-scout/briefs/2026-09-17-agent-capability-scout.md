# Agent Capability Scout Brief - 2026-09-17

- Run ID: `2026-09-17-agent-scout-01`
- Started at: `2026-09-17T05:03:16Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260917-01`
- Status: complete pending publish

## Sources checked

- `openai-news`: fetched. New Sep 16 items created two OpenAI findings: model-misalignment reporting and AI usage-to-business-value analytics. The advertising item was reviewed as product-specific and below the agent-system finding threshold.
- `anthropic-news`: fetched. No newer unrecorded in-scope item after the Sep 10 misuse report already recorded by the September 11 scout.
- `google-ai-developers`: fetched. New Sep 15 and Sep 16 Gemini Enterprise runtime-governance items created one Google finding.
- `addy-osmani-blog`: fetched. Enabled personal blog source still exposed the previously handled agent-engineering posts. No Addy finding was created.

## Top findings

1. `2026-09-17-agent-scout-01-finding-01` - OpenAI, `Our framework for reporting model misalignment`. Interest grade: 10/10. Frontier agent-system safety needs incident disclosure and learning loops that cover training, eval, testing, deployment, oversight evasion, memory-compaction corruption, unauthorized tool use, and cross-agent communication even when mitigations are incomplete.
2. `2026-09-17-agent-scout-01-finding-03` - Google, Gemini Enterprise runtime governance and Agent Anomaly Detection. Interest grade: 10/10. Production agents need trace-level anomaly detection, intent-aware runtime policy, severity/probability thresholds, human and programmatic intervention points, and closed-loop policy updates.
3. `2026-09-17-agent-scout-01-finding-02` - OpenAI, `How to connect AI usage to business value`. Interest grade: 8/10. Operational-agent adoption should connect telemetry, task classification, skill/plugin use, Codex contributions, review/rework signals, baselines, owners, and business outcomes.

Top interest grade: 10.

## Principle candidates

Three candidates were evaluated and rejected as non-additive. No principles-doc patch was made.

- `2026-09-17-agent-scout-01-principle-01`: agent-system misalignment incidents should be disclosed and preserved as evidence before all mitigations are known, with criteria covering oversight evasion, unauthorized action, cross-agent coordination, memory corruption, external impact, uncertainty, and remediation status.
- `2026-09-17-agent-scout-01-principle-02`: operational-agent value should be evaluated by combining usage telemetry, task classification, tool and skill adoption, contribution/review signals, workflow baselines, owner judgment, and business outcomes.
- `2026-09-17-agent-scout-01-principle-03`: production agent runtime governance should combine trace-level anomaly detection, intent-aware policy, severity/probability thresholds, human triage, programmatic halt or block points, and closed-loop policy updates.

Existing Agent Principles and AI Evals Principles already cover these through whole-system identity, environment contracts, trace visibility, robustness and misuse, online/offline incident loops, evidence-backed progress, deterministic high-risk boundaries, reviewable change flow, complementary signals, experiments, and routing findings to the owning layer.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-09-17-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- PR: pending.
- Merge state: pending publish through the protected Foundation flow.
- Notification state: pending GitHub App PR comment after a PR exists.
- Requested owner action: review the PR after required checks pass, with attention to the two 10/10 findings and the rejected principle-candidate rationale.
