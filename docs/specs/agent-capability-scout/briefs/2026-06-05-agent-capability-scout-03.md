# Agent Capability Scout Brief

Run ID: `2026-06-05-agent-scout-03`
Date: 2026-06-05
Trigger: one-time fresh-context manual delegation
Branch: `codex/agent-capability-scout-20260605-03`

## Status

Research and write-through artifacts were completed for all enabled sources in `docs/specs/agent-capability-scout/source-registry.json`. This is a first-run baseline on current `main`; prior canonical run rows were empty, so findings were graded only when the current source evidence was clear.

## Source Results

| Source | Status | Evidence |
| --- | --- | --- |
| `openai-news` | fetched | `docs/specs/agent-capability-scout/evidence/2026-06-05-agent-scout-03/openai-news.md` |
| `anthropic-news` | fetched | `docs/specs/agent-capability-scout/evidence/2026-06-05-agent-scout-03/anthropic-news.md` |
| `google-ai-developers` | fetched | `docs/specs/agent-capability-scout/evidence/2026-06-05-agent-scout-03/google-ai-developers.md` |
| `addy-osmani-blog` | fetched | `docs/specs/agent-capability-scout/evidence/2026-06-05-agent-scout-03/addy-osmani-blog.md` |

## Top Findings

High:

- Grade 8: OpenAI's production-trace-to-eval-to-PR loop for tax agents is a concrete self-improvement pattern: practitioner corrections become structured rows, repeated patterns become eval targets, and Codex inspects traces, evals, repo, and skills before proposing changes.
- Grade 8: Google Colab CLI exposes remote accelerator execution as a terminal-native, artifact-returning tool for agents, making remote compute delegation more inspectable.
- Grade 8: Addy Osmani's long-running-agent and orchestration posts strongly validate Foundation's durable state, event-log, handoff, generation/evaluation split, and human review bottleneck principles.

Medium:

- Grade 7: OpenAI's Codex plugins, Sites, and annotations point toward role/workflow-specific agent packages with reviewable generated artifacts.
- Grade 7: Anthropic's Opus 4.8 material emphasizes long-running reliability, cleaner tool use, uncertainty surfacing, and lifecycle-aware risk/eval signals.

Low:

- None recorded.

## Principle Candidates

No principles document was patched. One high-durability candidate was considered from Addy Osmani's long-running/orchestration material, but the standalone additive gate failed because the lesson is already covered by existing Foundation agent principles: durable state outside the context window, restartable long runs, whole-harness reliability, evidence/eval closeout, and human judgment authority.

## Artifacts

- `docs/specs/agent-capability-scout/runs.jsonl`
- `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- `docs/specs/agent-capability-scout/findings.jsonl`
- `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- `docs/specs/agent-capability-scout/notifications.jsonl`
- `docs/specs/agent-capability-scout/evidence/2026-06-05-agent-scout-03/`

## Merge And Notification State

Pre-publish checkpoint state: GitHub PR and notification receipts are pending until the first artifact commit is pushed and a PR exists. Receipt rows will be updated after the PR comment is posted.

## Requested Owner Action

Review the PR and calibrate whether the grade-8 findings should drive a follow-up Foundation experiment. No doctrine patch is proposed in this run.
