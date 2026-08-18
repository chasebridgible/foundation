# Agent Capability Scout brief - 2026-08-18

Run ID: `2026-08-18-agent-scout-01`
Status: complete; merged
Branch: `codex/agent-capability-scout-20260818-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. New meaningful finding recorded for `The Defender's Window`.
- `anthropic-news`: fetched. No new visible item after the already-recorded August 14 Claude text watermarking finding.
- `google-ai-developers`: fetched. New meaningful finding recorded for zero-trust AI agents with ADK.
- `addy-osmani-blog`: fetched. No new personal blog item after `Software Factories, Light and Dark`, already recorded in the 2026-07-21 run.

## Top findings

Top interest grade: 10/10.

- 10/10 - OpenAI Defender's Window: security agents should operate as staged defensive programs with approved evidence access, organization-specific skills and playbooks, continuous invariant probing, backlog triage, CI/pre-merge review, verified patches, regression tests, gradual autonomy, and human ownership of high-impact decisions.
- 9/10 - Google zero-trust AI agents: production-state-mutating agents need hard boundaries outside the LLM context, including write identity, sandboxed dynamic code execution, deterministic semantic gateways, policy regression tests, and blast-radius-limited production perimeters.

## Principle candidates

Two candidates were evaluated and rejected as non-additive. No principles-doc patch was made.

- Security-agent operating loops: rejected because Agent Principles already cover whole-agent-system design, mechanical invariants, scoped context, durable procedures and skills, deterministic high-risk gates, human authority, evidence-based progress, reviewable change flow, and bounded review capacity; AI Evals Principles already cover whole-system identity, production-like environments, traces, robustness, incident feedback, and regression suites.
- Non-prompt production-state security boundaries: rejected because Agent Principles already cover prompt limits, mechanical scaffolding, deterministic high-risk gates, permissions, approvals, and whole-harness design; AI Evals Principles already cover environment contracts, tool/runtime identity, side effects, misuse pressure, traceability, and regression cases.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-08-18-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: `merged`
- PR: https://github.com/chasebridgible/foundation/pull/117
- Notification state: GitHub App PR comment sent: https://github.com/chasebridgible/foundation/pull/117#issuecomment-5323863183
- Requested owner action: none expected if required checks pass. This run is routine scout state and no principles-doc patch was made.
