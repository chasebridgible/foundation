# Agent Capability Scout brief - 2026-08-06

Run ID: `2026-08-06-agent-scout-01`
Status: complete, pending publish
Branch: `codex/agent-capability-scout-20260806-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. New visible items after the prior canonical scout included `Third-party cyber evaluations involving OpenAI models` (August 4, 2026), `New ways to learn and teach with ChatGPT Work and Codex` (August 4, 2026), `Apple is getting this wrong` (August 3, 2026), `Continuous voice interaction with GPT Live` (August 3, 2026), and `Building abundant intelligence` (July 31, 2026).
- `anthropic-news`: fetched. New visible item: `Mariano-Florentino (Tino) Cuellar to join Anthropic as Chief Global Affairs Officer` (August 4, 2026), which did not clear the meaningful-finding threshold.
- `google-ai-developers`: fetched. New visible items included `Scaling AI Agent Infrastructure with the MCP Stateless updates` (August 5, 2026), `A unified API for AI model routing` (August 4, 2026), and `Scaling real-time AI agents with session-aware load balancing` (August 3, 2026).
- `addy-osmani-blog`: fetched. No new personal blog item after `Software Factories, Light and Dark`, already recorded in prior scout state.

## Top findings

Top interest grade: 10/10.

- 10/10 - OpenAI third-party cyber eval incidents: repeated high-risk eval boundary failures show scope, isolation, internet access, lowered safeguards, monitoring, stop conditions, and escalation are part of eval correctness.
- 9/10 - Google MCP stateless update: agent protocols are moving resumability, routing metadata, async task identity, authorization scope, and deprecation into explicit infrastructure contracts.
- 8/10 - OpenAI education plugins: role-specific packages of apps, skills, instructions, workflows, approved tools, and selected context reduce capability overhang while preserving institutional control.
- 8/10 - Google session-aware load balancing: realtime agents need active-session and lifecycle-aware infrastructure signals, not only request throughput and CPU.
- 7/10 - Google API Gateway model routing: model selection is becoming a versioned, governed, inspectable API control-plane concern.

## Principle candidates

Three candidates were evaluated and rejected as non-additive:

- `2026-08-06-agent-scout-01-principle-01`: high-risk evals should explicitly negotiate scope, internet access, safeguard changes, credential handling, monitoring, stop conditions, and incident escalation.
- `2026-08-06-agent-scout-01-principle-02`: agent tool infrastructure should expose resume state, routing metadata, async task identity, authorization scope, and deprecation paths.
- `2026-08-06-agent-scout-01-principle-03`: role-specific adoption should package approved tools, bounded context, reusable skills, and starter workflows.

No principles-doc patch was made. Existing Agent Principles and AI Evals Principles already cover high-risk eval containment, environment contracts, whole-system identity, restartability, durable state, handoff, skills as workflow packages, permissions, human authority, and reviewable change flow.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-08-06-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: `pr-open`
- PR: pending
- Notification state: pending GitHub App PR comment after PR creation.
- Requested owner action: @chasebridgible review routine scout state after the PR is opened; no principles-doc judgment is required.
