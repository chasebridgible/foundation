# Agent Capability Scout Brief - 2026-10-03

Run ID: `2026-10-03-agent-scout-01`
Status: complete pending publish
Source registry version: `2026-06-05`

## Sources Checked

- `openai-news` - fetched. The new Oct 2 GPT-6 family model guide cleared the meaningful finding threshold; Oct 1 OpenAI essay/adoption posts were reviewed below threshold or as weaker context.
- `anthropic-news` - fetched. New Oct 1/Oct 2 enterprise deployment and training items cleared the meaningful finding threshold.
- `google-ai-developers` - fetched. No newer unrecorded in-scope item after the Sep 30 infrastructure post already reviewed by the prior scout.
- `addy-osmani-blog` - fetched. No newer unrecorded personal-blog item after `Brownfield Agentic Engineering`, already recorded by the Sep 21 scout.

## Top Interest Grade

Top grade: 9/10.

Reason: OpenAI's GPT-6 family build guide and Anthropic's Frontier Academy both turn agent-system deployment into explicit operating practice: cache-aware context, skills, AGENTS.md, model routing, long-running steering, security review, simulated enterprise deployment, assessment, handoff, and production ownership.

## Findings

### High

1. `2026-10-03-agent-scout-01-finding-01` - 9/10 - OpenAI's GPT-6 family guide packages production agent practice around context/cost controls, prompt caching, compaction, model/reasoning/speed routing, skill and `AGENTS.md` updates, done criteria, mid-turn steering, async tools, subagent delegation, and computer use.
2. `2026-10-03-agent-scout-01-finding-02` - 9/10 - Anthropic's Claude Frontier Academy treats enterprise agent deployment as an assessed operating role, with realistic deployment simulations, security review, handoff, named production projects, and a 12-week residency leading real use cases.
3. `2026-10-03-agent-scout-01-finding-03` - 8/10 - Anthropic's Barclays scale-up shows agentic AI becoming governed operational infrastructure inside a regulated bank, combining developer adoption, RAG-backed knowledge assistance, 120,000-email/day routing, security controls, human oversight, and cyber/engineering expertise.

### Medium / Low

- None recorded as findings. OpenAI's Oct 1 Albertsons retail adoption post and Intelligence Age essay were reviewed as useful context but below this run's meaningful agent-system threshold.

## Principle Candidates

All considered candidates were rejected as non-additive; no principles docs were patched.

- Production agent build guide: rejected because existing Agent Principles and AI Evals Principles already cover whole-system harness design, curated context, durable skills, `AGENTS.md`-style local truth, model/tool/environment identity, cost/resource behavior, long-running steering, restartability, evidence-backed done criteria, and risk-calibrated evaluation.
- Enterprise deployed engineer training: rejected because existing Agent Principles already cover process over prose, skills as workflow packages, high-risk boundaries, human authority, handoff, evidence-based progress, and substrate improvement; AI Evals Principles already cover representative scenarios, human review for accountable judgment, traceability, and production-like environments.
- Governed enterprise AI operations: rejected because existing principles already cover explicit tool/environment contracts, human oversight, whole-system evaluation, production traces, online/offline feedback, high-risk gates, and accountable reviewable change flow.

## Artifact Paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-10-03-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`

## Publish State

Pending branch push and PR creation on `codex/agent-capability-scout-20261003-01`.

## Requested Owner Action

Review the PR once opened. This is routine scout state with no principles-doc patch, so it can merge after required checks pass.
