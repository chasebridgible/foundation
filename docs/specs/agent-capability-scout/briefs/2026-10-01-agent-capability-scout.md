# Agent Capability Scout Brief - 2026-10-01

Run ID: `2026-10-01-agent-scout-01`
Status: complete pending publish
Source registry version: `2026-06-05`

## Sources Checked

- `openai-news` - fetched. New Sep 29/Sep 30 items were present after the previous Sep 29 scout baseline.
- `anthropic-news` - fetched. No newer unrecorded in-scope item after the Sep 28 Claude Sonnet 5.5 item already recorded by the prior scout.
- `google-ai-developers` - fetched. One new Sep 30 TPU video-diffusion infrastructure item was reviewed as below the meaningful agent-system threshold.
- `addy-osmani-blog` - fetched. No newer unrecorded personal-blog item after `Brownfield Agentic Engineering`, already recorded by the Sep 21 scout.

## Top Interest Grade

Top grade: 10/10.

Reason: OpenAI's adversarial-distillation incident and dots launch both expose major agent-system operating lessons: protected reasoning and compaction/replay boundaries for one, and persistent proactive agent governance for the other.

## Findings

### High

1. `2026-10-01-agent-scout-01-finding-01` - 10/10 - OpenAI's adversarial-distillation incident shows protected reasoning, compaction/replay artifacts, streamed outputs, partner deployments, abuse clustering, and cross-provider incident response becoming first-class agent-platform security concerns.
2. `2026-10-01-agent-scout-01-finding-02` - 10/10 - OpenAI dots productizes persistent proactive agents with distinct environments, connected apps, cross-channel context, background research, progress visibility, custom rules, Auto-review, approvals, handoffs, and controls outside the agent-modifiable workspace.
3. `2026-10-01-agent-scout-01-finding-03` - 9/10 - OpenAI's DevDay recap shows agent platforms consolidating around managed runtimes, reusable environments, shared artifacts, plugin/event automations, computer-use APIs, review workflows, and team collaboration surfaces.
4. `2026-10-01-agent-scout-01-finding-04` - 9/10 - GPT-6.1 Sol pairs lower-cost capable agent execution with safety evidence around realistic work, monitorability, evaluation awareness, reward hacking, concealed uncertainty, context economics, speed, and Codex-like deployment simulations.

### Medium / Low

- None recorded as findings. Google's Sep 30 Sparse VideoGen TPU article was useful AI infrastructure context but did not clear the agent-system finding threshold.

## Principle Candidates

All considered candidates were rejected as non-additive; no principles docs were patched.

- Reasoning-artifact protection: rejected because existing Agent Principles and AI Evals Principles already cover whole-system harness design, memory provenance, environment/tool contracts, high-risk boundaries, trace visibility, robustness/misuse, incident loops, and failure-derived regression cases.
- Persistent proactive agent governance: rejected because existing principles already cover whole-system harness design, memory, long-running restartability, permissions, approval gates, handoff, inspectability, proactive-agent evals, and traceable runs.
- Agent platform as operating substrate: rejected because Agent Principles already explicitly frames useful agency as the joint system, not a prompt alone, and covers substrate, artifacts, harness, memory, review, and inspectability.
- Agent model routing by safety/resource evidence: rejected because AI Evals Principles already covers whole-system identity, traces, cost/resource behavior, robustness/misuse, distributional reliability, online/offline evals, and routing results to the owning layer.

## Artifact Paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-10-01-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`

## Publish State

Pending branch push and PR creation on `codex/agent-capability-scout-20261001-01`.

## Requested Owner Action

Review the PR once opened. This is routine scout state with no principles-doc patch, so it can merge after required checks pass.
