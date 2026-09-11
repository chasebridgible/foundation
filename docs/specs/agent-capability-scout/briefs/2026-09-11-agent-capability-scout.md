# Agent Capability Scout Brief - 2026-09-11

- Run ID: `2026-09-11-agent-scout-01`
- Started at: `2026-09-11T05:02:45Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260911-01`
- Status: complete pending publish

## Sources checked

- `openai-news`: fetched through the browser retriever. New September 10 source items included `Introducing the Agents API`, `Build more natural voice experiences with GPT-Live-1 in the API`, and the antimicrobial researcher Codex/ChatGPT case study. Two OpenAI findings were created.
- `anthropic-news`: fetched. New September 10 source item was `Detecting and countering misuse of AI: September 2026`. One Anthropic finding was created.
- `google-ai-developers`: fetched. New September 9 source items were ADK for Kotlin 1.0 and harness-engineering behavioral evals. Two Google findings were created.
- `addy-osmani-blog`: fetched. The latest personal blog posts remained the August items already recorded by the August 24 scout. No Addy finding was created.

## Top findings

1. `2026-09-11-agent-scout-01-finding-01` - OpenAI, `Introducing the Agents API`. Interest grade: 10/10. Production agents are now being packaged as managed harness infrastructure: durable sessions, context compaction, tool search, programmatic tool calling, sandbox/environment choice, skills/plugins, artifacts, parallel subagents, and inspectable harness code.
2. `2026-09-11-agent-scout-01-finding-03` - Anthropic, `Detecting and countering misuse of AI: September 2026`. Interest grade: 10/10. AI-enabled cyber operations now compose multi-agent scaffolding, autonomous execution/orchestration, and fragmented benign-looking work across sessions, making campaign-level misuse evaluation more important than single-request checks.
3. `2026-09-11-agent-scout-01-finding-04` - Google, `The Anatomy of Harness Engineering`. Interest grade: 9/10. Agent evals need fast behavioral checks over intermediate actions plus macro benchmarks and batch signals, so prompt, tool-schema, and model changes can be improved without hidden regressions.
4. `2026-09-11-agent-scout-01-finding-02` - OpenAI, `GPT-Live-1 in the API`. Interest grade: 8/10. Voice agents need a real-time interaction layer that preserves interruption, timing, silence, background noise, and long-session context while delegating deeper work to backend tools and reasoning models.
5. `2026-09-11-agent-scout-01-finding-05` - Google, ADK Kotlin 1.0. Interest grade: 8/10. Production mobile and server agents are converging on typed tool contracts, dynamic skill loading, persistence, artifacts, observability, and explicit human approval for sensitive tools.

Top interest grade: 10.

## Principle candidates

Five candidates were evaluated and rejected as non-additive. No principles-doc patch was made.

- `2026-09-11-agent-scout-01-principle-01`: production agent APIs should expose harness contracts for durable sessions, context compaction, tool discovery, environment selection, artifacts, and subagent orchestration instead of hiding them behind a model call.
- `2026-09-11-agent-scout-01-principle-02`: real-time voice agents should separate conversational timing from backend reasoning/tool work and evaluate interruption, silence, background speech, and self-corrected tool requests as first-class behavior.
- `2026-09-11-agent-scout-01-principle-03`: misuse safeguards should evaluate campaign composition across sessions, not only direct harmful requests, because fragmented benign-looking work can assemble into harmful capability.
- `2026-09-11-agent-scout-01-principle-04`: coding-agent evals should pair macro benchmarks with local behavioral checks over intermediate actions and batch stability signals.
- `2026-09-11-agent-scout-01-principle-05`: production agent frameworks should make typed tool contracts, dynamic skill loading, persistence, artifacts, observability, and explicit approval available as platform primitives.

Existing Agent Principles and AI Evals Principles already cover these as whole-harness engineering, durable memory, tool/environment contracts, role separation, high-risk gates, human authority, traceable whole-system evals, behavioral traces, complementary signals, failure-driven assets, and risk-based signal choice.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-09-11-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Prior blocked state: this branch starts from `origin/codex/agent-capability-scout-20260909-01`, preserving the September 9 artifact checkpoint that was pushed but blocked before PR creation.
- PR: pending.
- Merge state: pending publish through the protected Foundation flow.
- Notification state: pending GitHub App PR comment after a PR exists.
- Requested owner action: review the PR after required checks pass, with special attention to the carried-forward September 9 blocked checkpoint plus today's new findings.
