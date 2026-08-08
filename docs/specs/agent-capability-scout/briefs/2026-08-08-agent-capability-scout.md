# Agent Capability Scout brief - 2026-08-08

Run ID: `2026-08-08-agent-scout-01`
Status: complete, publish pending
Branch: `codex/agent-capability-scout-20260808-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. New visible items after the prior canonical scout included `Responding to the next frontier of critical cyber capabilities` (August 7, 2026), `Improving GPT-5.6 Sol in ChatGPT-and expanding access to GPT-5.6 Luna for free users` (August 6, 2026), `OpenAI and APA advance responsible AI for youth` (August 6, 2026), and `How the world is putting ChatGPT to work` (August 6, 2026).
- `anthropic-news`: fetched. New visible item: `Improving Fable 5's biology safeguards` (August 7, 2026).
- `google-ai-developers`: fetched. New or previously unrecorded visible items included `Agent Plugins package your skills, tools, and more` (August 6, 2026), `Agent and Model Evaluations in Gemini Enterprise Agent Platform are now GA` (July 31, 2026), and `Enable on-demand expertise with Agent Skills in Genkit Go` (July 31, 2026).
- `addy-osmani-blog`: fetched. No new personal blog item after `Software Factories, Light and Dark`, already recorded in prior scout state.

## Top findings

Top interest grade: 10/10.

- 10/10 - OpenAI critical-cyber capability response: capability thresholds should tighten the agent operating environment, including tool access, network access, monitoring, sandboxing, outside testing, and third-party eval controls.
- 9/10 - Google Agent Plugins: portable agent capability packages are standardizing skills plus MCP servers while keeping discovery, catalog, package, runtime, permission, and client-extension layers explicit.
- 9/10 - Gemini Enterprise agent/model evals GA: local experiments, live traces, simulators, versioned metrics, drift alerts, issue clustering, session logs, and CI are becoming one agent-quality loop.
- 8/10 - Anthropic biology safeguards: high-risk restrictions can be iteratively calibrated through written classifier rules, expert feedback, updated data, measured false-positive reduction, and continued dual-use boundaries.
- 7/10 - Genkit Go Agent Skills: progressive disclosure, focused skills, deterministic scripts, and modular references are moving into application middleware.
- 7/10 - GPT-5.6 Sol ChatGPT behavior update: factuality, focused answers, reasoning-effort controls, and teen-safety evals are useful model-behavior signals, but Work and Codex are unchanged.
- 6/10 - OpenAI Signals work-use data: adoption continues moving from answer seeking toward task completion, informing workflow modeling but not directly changing Foundation harness design.

## Principle candidates

Four candidates were evaluated and rejected as non-additive:

- `2026-08-08-agent-scout-01-principle-01`: high-risk capability thresholds should tighten tool access, network access, sandboxing, monitoring, external review, and third-party eval controls.
- `2026-08-08-agent-scout-01-principle-02`: portable agent packages should keep skills, tools, manifests, discovery, execution, permissions, provenance, and client extensions in explicit layers.
- `2026-08-08-agent-scout-01-principle-03`: agent evaluation platforms should carry consistent local/live metrics, versioned registries, simulators, trace review, drift alerts, failure clustering, and CI across the lifecycle.
- `2026-08-08-agent-scout-01-principle-04`: high-risk safeguards should be calibrated with written policy, expert review, representative data, false-positive reduction, false-negative protection, and trusted access paths.

No principles-doc patch was made. Existing Agent Principles and AI Evals Principles already cover whole-system harness design, skills as workflow packages, durable state, progressive disclosure, deterministic high-risk gates, whole-system eval identity, environment contracts, risk-tiered evaluation, traceability, production feedback, and failure-driven regression updates.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-08-08-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: `pr-open`
- PR: https://github.com/chasebridgible/foundation/pull/107
- Notification state: GitHub App PR comment sent: https://github.com/chasebridgible/foundation/pull/107#issuecomment-5224656557
- Requested owner action: @chasebridgible review routine scout state when convenient; no principles-doc judgment is required.
