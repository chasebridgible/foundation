# Agent Capability Scout Brief - 2026-09-13

- Run ID: `2026-09-13-agent-scout-01`
- Started at: `2026-09-13T07:56:58Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260913-02`
- Status: complete pending publish

## Sources checked

- `openai-news`: fetched through browser retriever after direct `curl` returned Cloudflare HTTP 403. New visible Sep 11 card was `Rapidly scaling online storage to serve over 1 billion ChatGPT users`; reviewed as infrastructure context, not a new agent-system finding.
- `anthropic-news`: fetched. No newer unrecorded in-scope item after the Sep 10 misuse report already recorded by the September 11 scout.
- `google-ai-developers`: fetched. New Sep 11 item `Autonomous LLM post-training with Tunix on TPUs` created one Google finding.
- `addy-osmani-blog`: fetched. Enabled personal blog source still exposed the August/July posts already handled by earlier scouts. No Addy finding was created.

## Top findings

1. `2026-09-13-agent-scout-01-finding-01` - Google, `Autonomous LLM post-training with Tunix on TPUs`. Interest grade: 10/10. Automated model-improvement agents need a human-authored experiment arena with boundary conditions, narrow editable surfaces, objective metrics, commit-or-revert semantics, durable logs, accelerator observability, and bounded multi-day progress.

Top interest grade: 10.

## Principle candidates

One candidate was evaluated and rejected as non-additive. No principles-doc patch was made.

- `2026-09-13-agent-scout-01-principle-01`: automated model-improvement agents should operate inside explicit experiment arenas with human-owned objectives and constraints, narrow editable surfaces, objective metrics, commit/revert semantics, durable result logs, and bounded multi-day progress.

Existing Agent Principles and AI Evals Principles already cover this as whole-harness engineering, workflow-packaged skills, explicit artifacts, durable memory, bounded long-running units, human authority, intent/risk contracts, environment contracts, deterministic checks, failure-derived datasets, experiments against known data, and distributional reliability.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-09-13-agent-scout-01/`
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
- Requested owner action: review the PR after required checks pass, with attention to the Google Tunix autonomous post-training finding and the rejected principle-candidate rationale.
