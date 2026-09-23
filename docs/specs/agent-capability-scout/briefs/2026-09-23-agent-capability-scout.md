# Agent Capability Scout Brief - 2026-09-23

- Run ID: `2026-09-23-agent-scout-01`
- Started at: `2026-09-23T05:03:26Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260923-01`
- Status: complete and merged

## Sources checked

- `openai-news`: fetched. New September 22 items created three OpenAI findings: GPT-6 prompt caching, GPT-6 Sol/Luna, and third-party assessment principles.
- `anthropic-news`: fetched. New September 22 Claude Opus 5.5 item created one Anthropic finding.
- `google-ai-developers`: fetched. New September 22 Colab/Google AI plan item created one medium-interest Google finding.
- `addy-osmani-blog`: fetched. No newer unrecorded personal-blog post after the September 21 scout baseline.

## Top findings

1. `2026-09-23-agent-scout-01-finding-01` - OpenAI, `Better prompt caching for GPT-6`. Interest grade: 10/10. Persistent agents need cache-aware context architecture, stable tool definitions, diagnostics, breakpoints, and prewarming so long-running work stays fast, affordable, and inspectable.
2. `2026-09-23-agent-scout-01-finding-03` - OpenAI, third-party safety assessments. Interest grade: 10/10. Frontier agent systems need safety claims, safety cases, independent evidence access, safeguard assessment, remediation windows, and publication/redaction rules that make accountability compatible with sensitive information.
3. `2026-09-23-agent-scout-01-finding-04` - Anthropic, Claude Opus 5.5. Interest grade: 10/10. Long-running autonomous agents need safety evaluations over hard-to-reverse actions, boundary adherence, prompt injection, long tasks, impossible tasks, real incidents, action screening, auditable sandboxing, code review, and efficiency metrics.
4. `2026-09-23-agent-scout-01-finding-02` - OpenAI, GPT-6 Sol and Luna. Interest grade: 9/10. Agent stacks need cost-intelligence routing across model tiers, workflow benchmarks, mergeability and computer-use evals, deception/safety evals, and cache-preserving controls for reasoning effort and tool availability.
5. `2026-09-23-agent-scout-01-finding-05` - Google, Colab in Google AI plans. Interest grade: 6/10. Long-running experiment infrastructure benefits from background execution and premium accelerator access, though this is more infrastructure packaging than a new agent-system pattern.

Top interest grade: 10.

## Principle candidates

Four candidates were evaluated and rejected as non-additive. No principles-doc patch was made.

- `2026-09-23-agent-scout-01-principle-01`: long-running agents should treat prompt caching as architecture, preserving stable context, tool definitions, diagnostics, and prewarming rather than relying on accidental prefix reuse.
- `2026-09-23-agent-scout-01-principle-02`: agent stacks should route work by measured cost, workflow success, mergeability, computer-use reliability, and safety/deception evals, not raw model capability alone.
- `2026-09-23-agent-scout-01-principle-03`: independent agent-system assessments should start from explicit safety claims and safety cases, receive evidence access across training/eval/deployment, and publish actionable findings with remediation and redaction rules.
- `2026-09-23-agent-scout-01-principle-04`: long-running autonomous agent releases should evaluate hard-to-reverse actions, boundary adherence, prompt injection, long/impossible tasks, real-incident scenarios, action screening, sandbox auditability, and efficiency.

Existing Agent Principles and AI Evals Principles already cover these through whole-system identity, context engineering, environment and tool contracts, traceable/auditable runs, cost/resource behavior, robustness and misuse, independent evaluation, failure-derived assets, human authority, high-risk gates, and reviewable change flow.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-09-23-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- PR: https://github.com/chasebridgible/foundation/pull/144
- Merge state: merged at `2026-09-23T05:08:43Z` after the required `Spec registry and metadata` check passed.
- Notification state: GitHub App PR comment sent at https://github.com/chasebridgible/foundation/pull/144#issuecomment-5789411332.
- Requested owner action: review the merged scout brief if desired, with attention to the 10/10 OpenAI caching, OpenAI third-party-assessment, and Anthropic Opus 5.5 findings plus the rejected principle-candidate rationale.
