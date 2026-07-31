# Agent Capability Scout brief - 2026-07-31

Run ID: `2026-07-31-agent-scout-01`
Status: complete and merged
Branch: `codex/agent-capability-scout-20260731-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. New visible items after the prior scout: `Advancing the price-performance frontier with GPT-5.6` (July 30, 2026), `How enabling two settings tripled our scores on the ARC-AGI-3 benchmark` (July 29, 2026), `Accelerating scientific discovery with ChatGPT for Academic Researchers` (July 29, 2026), and `How GPT-5.6 fuses frontier intelligence with frontier efficiency` (July 29, 2026).
- `anthropic-news`: fetched. New visible item: `Investigating three real-world incidents in our cybersecurity evaluations` (July 30, 2026).
- `google-ai-developers`: fetched. New visible item: `How to use Google microbenchmarks for evaluating TPU performance` (July 30, 2026).
- `addy-osmani-blog`: fetched. No new personal blog item after `Software Factories, Light and Dark`, already recorded in prior scout state.

## Top findings

Top interest grade: 10/10.

- 10/10 - Anthropic cyber-eval incidents: autonomous cyber evals reached real internet systems through misconfigured third-party environments, making containment, task scope, vendor assurance, monitoring, transcript review, and incident-to-regression loops part of eval correctness.
- 10/10 - OpenAI ARC-AGI-3 harness-memory result: retaining reasoning and using compaction changed benchmark results sharply, showing that agent evals measure memory and context lifecycle, not model capability alone.
- 9/10 - OpenAI GPT-5.6 harness efficiency: outcome-tiered model routing, cheaper routine tool work, deferred discovery, output caps, append-only history, deterministic tool ordering, and prompt-cache-friendly context are now agent-system design levers.
- 6/10 - Google TPU microbenchmarks: component-level performance baselines and roofline analysis are useful for infrastructure evals, but less directly agent-specific.

## Principle candidates

Three candidates were evaluated and rejected as non-additive:

- `2026-07-31-agent-scout-01-principle-01`: high-autonomy eval environments should be treated as production security systems.
- `2026-07-31-agent-scout-01-principle-02`: agent evals should preserve the production context lifecycle when memory and compaction affect performance.
- `2026-07-31-agent-scout-01-principle-03`: harnesses should route work by outcome risk, uncertainty, latency, and cost while keeping tool/context presentation stable.

No principles-doc patch was made. Existing AI Evals Principles and Agent Principles already cover whole-system eval identity, environment contracts, solution isolation, misuse pressure, production traces, context engineering, deterministic scaffolding, cost/risk calibration, and reviewable change flow.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-31-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: `merged`
- PR: https://github.com/chasebridgible/foundation/pull/103
- Notification state: GitHub App PR comment sent: https://github.com/chasebridgible/foundation/pull/103#issuecomment-5143944353
- Closeout: PR 103 passed `Spec registry and metadata` and merged at `2026-07-31T14:27:39Z`.
- Requested owner action: @chasebridgible review routine scout state when convenient after the PR is opened; no principles-doc judgment is required.
