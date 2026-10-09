# Agent Capability Scout Brief - 2026-10-09

Run ID: `2026-10-09-agent-scout-01`
Status: complete pending publish
Source registry version: `2026-06-05`

## Sources Checked

- `openai-news` - fetched. New Oct 7-8 OpenAI items produced three findings: false-front operations disclosure, GPT-6 Intelligent UI, and the GPT-6 October system card / Codex Auto-review eval material.
- `anthropic-news` - fetched. New Oct 8 usage-policy and Cyber Mission posts produced two findings. Claude Haiku 5.5 was reviewed but not promoted above the stronger governance and production-defense findings.
- `google-ai-developers` - fetched. New Oct 8 AQuA ambient quality agent and Oct 7 Developer Knowledge API posts produced two findings.
- `addy-osmani-blog` - fetched. No newer in-scope personal-blog item after `Brownfield Agentic Engineering`, already recorded by the Sep 21 scout.

## Top Interest Grade

Top grade: 10/10.

Reason: OpenAI's October system card and Google's AQuA post give concrete whole-system agent-evaluation patterns: sandbox/monitor obedience, warning-circumvention checks, dynamic safety trajectories, production trace sweeps, verified failure clusters, source-snapshot root-cause diagnosis, and replay/eval handoff.

## Findings

1. `2026-10-09-agent-scout-01-finding-03` - OpenAI GPT-6 October system card and Codex Auto-review evals, 10/10. It evaluates agents against monitor rejection, environment warnings, prompt-injection hierarchy, dynamic safety trajectories, factuality cases from flagged/high-stakes prompts, and preparedness thresholds.
2. `2026-10-09-agent-scout-01-finding-06` - Google AQuA ambient quality agent, 10/10. It turns live production conversations into sampled traces, checklist reviews, failure clusters, verifier-gated insights, source-snapshot diagnosis, line-cited fixes, and replay/eval handoff.
3. `2026-10-09-agent-scout-01-finding-01` - OpenAI false-front operations disclosure, 9/10. It shows AI-assisted influence operations using front entities, fake personas, internal reports, article placement, social commenting, open-source corroboration, impact scoring, and disclosure loops.
4. `2026-10-09-agent-scout-01-finding-02` - OpenAI GPT-6 Intelligent UI, 9/10. It frames adaptive, streamable UI composition as a trained and evaluated model behavior across layout, visuals, interaction, progressive answering, and safety context.
5. `2026-10-09-agent-scout-01-finding-04` - Anthropic 2026 Usage Policy update, 9/10. It updates policy around longer independent work, deceptive campaigns, weapons/control software, surveillance, high-risk human-in-the-loop requirements, autonomous physical actions, and safe-state behavior.
6. `2026-10-09-agent-scout-01-finding-05` - Anthropic Cyber Mission, 9/10. It routes frontier cyber-defense capability through trusted critical-infrastructure providers, OSS scanning, maintainer capacity, model-generated reports, and human-verified disclosure fallback.
7. `2026-10-09-agent-scout-01-finding-07` - Google Developer Knowledge API ecosystem, 8/10. It gives agents an official structured documentation API, CLI, MCP server, skill, chunk search, and grounded Q&A surface instead of brittle scraping or stale model memory.

## Principle Candidates

Seven principle candidates were evaluated and rejected as non-additive. No principles docs were patched.

- False-front operations: rejected because AI Evals Principles already cover misuse, traces, production incidents, online/offline feedback, and failure-derived assets.
- Intelligent UI: rejected because Agent Principles already cover the agent-computer interface, harness design, tools, artifacts, and evidence-based evaluation.
- GPT-6 system card / Auto-review evals: rejected because Agent Principles already require deterministic high-risk gates and AI Evals Principles already cover whole-system identity, environment contracts, trace visibility, robustness, and risk-based signal choice.
- Usage-policy update: rejected because Agent Principles already cover high-risk approvals, human authority, tool/permission contracts, and deterministic gates.
- Cyber Mission: rejected because existing principles already cover human review, incident loops, evidence-backed fixes, and routing failures to the owning layer.
- AQuA ambient quality agent: rejected because AI Evals Principles already cover production traces, online/offline loops, failure clustering, traceability, failure-derived datasets, and routing findings.
- Developer Knowledge API: rejected because Agent Principles already cover context engineering, source-backed retrieval, recognition over recall, skills, MCP-like tools, and durable context.

## Artifact Paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-10-09-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`

## Publish State

Pending branch push and PR creation on `codex/agent-capability-scout-20261009-01`.

## Requested Owner Action

Review the PR once opened. This is routine scout state with findings and rejected principle candidates only; no principles-doc patch needs owner judgment.
