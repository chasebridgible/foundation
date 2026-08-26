# Agent Capability Scout Brief - 2026-08-26

- Run ID: `2026-08-26-agent-scout-01`
- Started at: `2026-08-26T17:21:46Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260826-01`
- Status: complete

## Sources checked

- `openai-news`: fetched. New or previously unrecorded relevant items included the Admin plugin for ChatGPT Work and Codex, GPT-5.6 in Kiro, full-stack AI economics, and Jalapeno inference results. Three OpenAI findings were created.
- `anthropic-news`: fetched. The new August 25 wellbeing-evaluation grant announcement was relevant to sensitive long-conversation eval design. One Anthropic finding was created.
- `google-ai-developers`: fetched. New relevant items included native live/voice agent evaluation in ADK and long-context multimodal embedding inference on TPU. Two Google findings were created.
- `addy-osmani-blog`: fetched. The latest Addy personal blog items remained the August posts already recorded by the August 24 scout. No new Addy finding was created.

## Top findings

1. `2026-08-26-agent-scout-01-finding-01` - OpenAI, `Introducing the Admin plugin for ChatGPT Work and Codex`. Interest grade: 9/10. The post is broadly valuable because it turns workspace administration into permission-aware conversational operations with structured read/write actions, existing-role enforcement, recurring automations, exception routing, approval surfaces, and confirmed change results.
2. `2026-08-26-agent-scout-01-finding-05` - Google, `How to Evaluate Live & Voice Agents in ADK`. Interest grade: 9/10. The post is broadly valuable because voice-agent correctness depends on multi-turn timing, state, tool execution, recovery, simulated spoken users, turn caps, end-to-end rubrics, transcript inspection, and CI-ready eval loops.
3. `2026-08-26-agent-scout-01-finding-04` - Anthropic, `Funding better evaluations of AI's impact on wellbeing`. Interest grade: 8/10. The post is useful because sensitive conversational-agent evaluation needs longitudinal context, expert calibration, independent open benchmarks, and safeguards that evolve with model use.
4. `2026-08-26-agent-scout-01-finding-02` - OpenAI, `Advancing price-performance for developers with GPT-5.6 in Kiro`. Interest grade: 8/10. The post is useful because it reinforces spec-driven development agents grounded in requirements, designs, codebase context, team standards, review checkpoints, and property-based testing.
5. `2026-08-26-agent-scout-01-finding-03` - OpenAI, full-stack AI economics and Jalapeno inference results. Interest grade: 7/10. The source is meaningful because multi-step agent latency, routing, context management, serving software, hardware, power, and workload economics decide which longer workflows become practical.
6. `2026-08-26-agent-scout-01-finding-06` - Google, long-context multimodal embedding inference on TPU. Interest grade: 6/10. The source is useful infrastructure context for retrieval-heavy agents, especially around parity thresholds, request-state survival, elastic serving, and reproducible recipes.

Top interest grade: 9.

## Principle candidates

Six candidates were evaluated and rejected as non-additive. No principles-doc patch was made.

- `2026-08-26-agent-scout-01-principle-01`: permission-aware operational agents should bind analytics, supported actions, existing roles, reviewable changes, and structured result confirmation.
- `2026-08-26-agent-scout-01-principle-02`: spec-driven development agents should ground long-running coding work in requirements, designs, team standards, checkpoints, and property-based verification.
- `2026-08-26-agent-scout-01-principle-03`: agent economics should be evaluated as useful work per dollar across model routing, context policy, latency, serving stack, and workload fit.
- `2026-08-26-agent-scout-01-principle-04`: wellbeing and similarly sensitive conversational evals should include longitudinal context, expert calibration, independent benchmarks, and evolving safeguards.
- `2026-08-26-agent-scout-01-principle-05`: live and voice agents should be evaluated with multi-turn simulated users, audio, state continuity, tool execution, timing/recovery rubrics, transcript inspection, and CI hooks.
- `2026-08-26-agent-scout-01-principle-06`: retrieval-heavy agent infrastructure should preserve semantic parity, request state, fallback capacity, and reproducible recipes across serving backends.

Existing Agent Principles and AI Evals Principles already cover these as whole-harness design, permission and approval boundaries, durable context, deterministic scaffolding, representative eval suites, whole-system identity, traceable runs, risk-based signal choice, production traces, and cost/resource behavior.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-08-26-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state: pending PR.
- Notification state: pending GitHub App PR comment.
- Requested owner action: @chasebridgible review is not required unless you want to recalibrate the interest grades; this is routine scout state with no principles-doc patch.
