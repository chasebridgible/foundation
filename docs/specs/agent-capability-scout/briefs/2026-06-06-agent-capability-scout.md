# Agent Capability Scout Brief: 2026-06-06-agent-scout-01

Status: blocked until publish and GitHub App notification finish.
Run ID: 2026-06-06-agent-scout-01
Source registry version: 2026-06-05
Branch: codex/agent-capability-scout-20260606-01

## Sources Checked

- openai-news: fetched. Evidence: docs/specs/agent-capability-scout/evidence/2026-06-06-agent-scout-01/openai-news.md
- anthropic-news: fetched. Evidence: docs/specs/agent-capability-scout/evidence/2026-06-06-agent-scout-01/anthropic-news.md
- google-ai-developers: fetched. Evidence: docs/specs/agent-capability-scout/evidence/2026-06-06-agent-scout-01/google-ai-developers.md
- addy-osmani-blog: fetched. Evidence: docs/specs/agent-capability-scout/evidence/2026-06-06-agent-scout-01/addy-osmani-blog.md

## Top Findings

1. Interest 9: Addy Osmani's Orchestration Tax is a durable workflow lesson for Foundation: agent fan-out must be bounded by review, merge, and comprehension throughput, not by spawn capacity.
2. Interest 8: Anthropic's dynamic workflows expose a concrete multi-agent pattern: plan, run parallel subagents, verify outputs, and report only after verification, with mid-task harness context updates.
3. Interest 8: OpenAI's memory update reinforces Foundation's memory posture: long-running agents need freshness, continuity, preference adherence, provenance, reviewability, and stale-memory handling.
4. Interest 7: Google Colab CLI makes remote accelerated compute available to terminal-based agents with artifact recovery and replayable logs, useful but mostly tool-specific for Foundation.

## Principle Candidates

- Proposed: docs/principles/agent-principles.html now includes a review-throughput principle under Long-running actions. The candidate passed the standalone/additive gate because it turns the orchestration-tax finding into a model- and vendor-neutral rule for future agent work.

## Files Changed

- docs/principles/agent-principles.html
- docs/specs/agent-capability-scout/evidence/2026-06-06-agent-scout-01/
- docs/specs/agent-capability-scout/source-snapshots.jsonl
- docs/specs/agent-capability-scout/findings.jsonl
- docs/specs/agent-capability-scout/principle-candidates.jsonl
- docs/specs/agent-capability-scout/runs.jsonl
- docs/specs/agent-capability-scout/briefs/2026-06-06-agent-capability-scout.md
- docs/specs/agent-capability-scout/patches/2026-06-06-agent-scout-01-review-throughput.md

## Requested Owner Action

Review the proposed review-throughput principle. If the owner agrees it is routine doctrine, merge after checks and GitHub App notification pass; otherwise leave the PR open for owner judgment.

