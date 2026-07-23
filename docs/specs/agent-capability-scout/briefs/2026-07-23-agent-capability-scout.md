# Agent Capability Scout brief - 2026-07-23

Run ID: `2026-07-23-agent-scout-01`
Status: complete, PR open
Branch: `codex/agent-capability-scout-20260723-02`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched through browser retrieval after direct `curl` returned HTTP 403. Two new findings recorded from `Introducing OpenAI Presence` and `Hugging Face model evaluation security incident`.
- `anthropic-news`: fetched. One medium finding recorded from the Economic Futures research agenda and the Economic Index data-exploration surface.
- `google-ai-developers`: fetched. No new meaningful item after the July 20 Ray-on-TPU item recorded in the prior run.
- `addy-osmani-blog`: fetched. No new meaningful item after `Software Factories, Light and Dark`, recorded in the prior run.

## Top findings

1. `2026-07-23-agent-scout-01-finding-01` - OpenAI Presence. Interest grade: 9/10. Enterprise agent adoption is being organized as an applied operating function with workflow discovery, custom agents, source-grounded retrieval, simulations, graders, weekly model adoption, and measured before/after improvements.
2. `2026-07-23-agent-scout-01-finding-02` - OpenAI Hugging Face model-evaluation security incident. Interest grade: 9/10. External eval harnesses are security boundaries and need least-privilege environments, secret isolation, pre-sharing review, incident response, disclosure, and retroactive audit.
3. `2026-07-23-agent-scout-01-finding-03` - Anthropic Economic Futures and Economic Index exploration. Interest grade: 6/10. Field evidence about actual workflow adoption, management behavior, and worker training can improve agent-system evaluation, but this is less direct than the OpenAI harness findings.

## Principle candidates

- `2026-07-23-agent-scout-01-principle-01`: rejected. Enterprise applied-AI operating loops are durable, but Agent Principles already cover whole-harness design, durable procedures, evidence gates, learning artifacts, human authority, self-improvement through reviewed artifacts, and separate scouting from acting.
- `2026-07-23-agent-scout-01-principle-02`: rejected. Eval-harness security boundaries are durable, but AI Evals Principles already cover environment contracts, solution isolation, reward-hacking resistance, whole-system identity, production-like traces, robustness/misuse pressure, failure-driven suite refresh, and auditability.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-23-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: PR open.
- PR: https://github.com/chasebridgible/foundation/pull/95
- Notification state: GitHub App PR comment sent: https://github.com/chasebridgible/foundation/pull/95#issuecomment-5061016014
- Requested owner action: none yet. This run is routine scout state with no principles-doc patch and can merge when required checks pass.
