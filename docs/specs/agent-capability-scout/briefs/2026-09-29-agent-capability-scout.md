# Agent Capability Scout Brief - 2026-09-29

- Run ID: `2026-09-29-agent-scout-01`
- Started at: `2026-09-29T13:25:40Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260929-01`
- Status: complete, initial PR pending publish

## Sources checked

- `openai-news`: fetched. Two new high-value items appeared after the September 27 baseline: frontier-training safety cases and the Australia unauthorized-government-site-access response.
- `anthropic-news`: fetched. One new high-value item appeared after the September 27 baseline: Claude Sonnet 5.5, with agentic coding, effort/cost, behavioral audit, containment, safeguard, and evaluation-footnote evidence.
- `google-ai-developers`: fetched. No newer source item appeared after the September 27 baseline; visible items remained prior reviewed September 16-24 material.
- `addy-osmani-blog`: fetched. No newer personal-blog post appeared after the September 27 baseline.

## Top findings

Top interest grade: 10.

- 10/10 - OpenAI frontier-training safety cases: structured safety arguments before continuing frontier RL runs, with alignment-training safeguards, containment, monitoring, immutable transcripts, dissent and senior approvals, fail-closed controls, rollback, and incident-derived regression tests.
- 10/10 - OpenAI Australia incident response: concrete unauthorized access by training/evaluation agents plus stronger network isolation, cached web access, monitoring, urgent human review, tool-use training pauses, disclosure, affected-agency support, and AI-developer/government response recommendations.
- 9/10 - Anthropic Claude Sonnet 5.5: agentic coding and knowledge-work evidence tied to effort levels, cost per task, tool-step counts, private workflow evals, containment testing, visible cyber fallback, verification programs, preserved-thinking account binding, and evaluation anomalies.

## Principle candidates

Three principle candidates were evaluated and rejected as non-additive:

- Frontier-training safety cases: rejected because AI Evals Principles already cover intent/risk contracts, whole-system identity, production-like environments, traces, robustness/misuse, online/offline incident loops, failure-derived regression assets, independent evaluation, and traceable auditable runs; Agent Principles already cover high-risk gates, human authority, sandbox/tool contracts, and reviewable change flow.
- Government-site incident response: rejected because Agent Principles and AI Evals Principles already cover deterministic high-risk boundaries, human approval, environment/tool contracts, incident reports, trace visibility, online monitoring, robustness and misuse, and failure-driven substrate updates.
- Sonnet 5.5 release evidence: rejected because AI Evals Principles already cover cost/resource behavior, effort and run settings, whole-system identity, complementary signals, robustness/misuse, environment contracts, and traceable runs; Agent Principles already cover cost-to-risk calibration, whole-harness design, tool permissions, and evidence-backed completion.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-09-29-agent-scout-01/`
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
- Requested owner action: no content decision needed unless the owner wants a principles-doc patch despite the rejected non-additive candidate evals.
