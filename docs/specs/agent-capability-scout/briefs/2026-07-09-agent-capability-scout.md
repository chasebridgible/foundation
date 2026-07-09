# Agent Capability Scout brief - 2026-07-09

Run ID: `2026-07-09-agent-scout-01`
Status: complete pending publish closeout
Branch: `codex/agent-capability-scout-20260709-02`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. Two meaningful findings recorded from `ChatGPT is now a partner for your most ambitious work` and `Separating signal from noise in coding evaluations`.
- `anthropic-news`: fetched. One meaningful finding recorded from `Introducing a way to reflect on how you use Claude`. `The Making of Claude Code` remained visible but did not expose enough readable article text in the fetched source to support a detailed finding.
- `google-ai-developers`: fetched. One meaningful finding recorded from `Bridging the Domain Gap: AI Race Coach built with Antigravity and Gemini`.
- `addy-osmani-blog`: fetched. No new post-2026-07-07 item or previously unrecorded lesson cleared the meaningful-finding threshold.

## Top findings

1. `2026-07-09-agent-scout-01-finding-01` - OpenAI ChatGPT Work. Interest grade: 9/10. Mainstream long-running agents now combine cross-app/file context, scheduled tasks, browser and desktop action, human steering, approval gates, compliance visibility, access controls, and spend controls.
2. `2026-07-09-agent-scout-01-finding-02` - OpenAI coding-eval audit. Interest grade: 9/10. Agentic coding benchmarks can lose signal through broken tasks, strict hidden tests, underspecified prompts, low-coverage tests, and misleading prompts; scalable audit needs agent investigators plus independent human review.
3. `2026-07-09-agent-scout-01-finding-03` - Anthropic Claude reflection. Interest grade: 7/10. Human-agent products are adding metacognitive usage and fluency loops for delegation, description, discernment, diligence, breakpoints, and human-retained work.
4. `2026-07-09-agent-scout-01-finding-04` - Google AI Race Coach. Interest grade: 7/10. High-stakes domain agents need grounding in domain physics, telemetry contracts, stateful orchestration, local fallback or edge inference, and expert review before generated advice is trusted.

## Principle candidates

- `2026-07-09-agent-scout-01-principle-01`: rejected. The long-running cross-app work-agent lesson is durable, but existing Agent Principles already cover whole-harness design, context curation, externalized state, restartability, high-risk approval, deterministic gates, human authority, and inspectable handoff.
- `2026-07-09-agent-scout-01-principle-02`: rejected. The benchmark-quality lesson is durable, but existing AI Evals Principles already cover intent and risk contracts, environment and grader boundaries, representative refreshed suites, traceability, judge separation, failures becoming dataset assets, and distributional reliability.
- `2026-07-09-agent-scout-01-principle-03`: rejected. The human-agent reflection lesson is durable, but existing Agent Principles already cover borrowed confidence, delegation sharpening the operator, reviewable evidence, and human retained judgment.
- `2026-07-09-agent-scout-01-principle-04`: rejected. The high-stakes domain-agent lesson is durable, but existing Agent Principles and AI Evals Principles already cover deterministic scaffolding, production-like environments, risk-based signal choice, trace inspection, and high-risk human approval.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-09-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- Merge state before publish: `pr-open`
- PR: pending.
- Notification state: pending GitHub App PR comment after PR creation.
- Requested owner action: routine review; no principles-doc patch was made.
