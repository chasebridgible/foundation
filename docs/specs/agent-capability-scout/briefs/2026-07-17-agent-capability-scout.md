# Agent Capability Scout brief - 2026-07-17

Run ID: `2026-07-17-agent-scout-01`
Status: complete pending publish closeout
Branch: `codex/agent-capability-scout-20260717-01`
Source registry version: `2026-06-05`

## Sources checked

- `openai-news`: fetched. One meaningful finding recorded from `GPT-Red: Advancing AI safety research through automated red teaming`.
- `anthropic-news`: fetched. One meaningful finding recorded from `Advancing physical AI with UST and Claude`.
- `google-ai-developers`: fetched. Three meaningful findings recorded from `Prompt-to-Leaderboard`, `Grounding with Parallel Web Search`, and `Conductor`.
- `addy-osmani-blog`: fetched. One meaningful finding recorded from `Own the Outer Loop`.

## Top findings

1. `2026-07-17-agent-scout-01-finding-01` - OpenAI GPT-Red. Interest grade: 9/10. Agentic red-team harnesses can turn misuse discovery into a repeatable eval loop with adversarial search, realistic tool use, policy labels, failure clustering, and regression assets.
2. `2026-07-17-agent-scout-01-finding-02` - Google Prompt-to-Leaderboard. Interest grade: 9/10. Agent instructions are becoming portable build artifacts that can be transpiled, versioned, evaluated, and ranked across harnesses.
3. `2026-07-17-agent-scout-01-finding-03` - Google Grounding with Parallel Web Search. Interest grade: 8/10. Current-web agents need grounding contracts with citations, provider choice, cached evidence, and auditability.
4. `2026-07-17-agent-scout-01-finding-04` - Addy Osmani Own the Outer Loop. Interest grade: 8/10. Humans retain leverage by owning objectives, constraints, samples, review slices, risk boundaries, and accountable acceptance while agents do more execution.
5. `2026-07-17-agent-scout-01-finding-05` - Anthropic UST and Claude. Interest grade: 8/10. Physical-domain agents need simulation, sensor or digital-twin context, expert review, and audit controls before live operational use.
6. `2026-07-17-agent-scout-01-finding-06` - Google Conductor. Interest grade: 7/10. Persistent IDE-side specs and plans reduce drift between conversation, roadmap, and implementation.

## Principle candidates

- `2026-07-17-agent-scout-01-principle-01`: rejected. The GPT-Red adversarial-eval lesson is durable, but existing AI Evals Principles already cover robustness and misuse, production-like environments, traceable runs, failure assets, and risk-based signal choice.
- `2026-07-17-agent-scout-01-principle-02`: rejected. The prompt-transpilation lesson is durable, but existing Agent Principles already cover process over prose, mechanical invariants, skills as workflow packages, reviewable operating-rule changes, and learning artifacts.
- `2026-07-17-agent-scout-01-principle-03`: rejected. The grounding-contract lesson is durable, but existing Agent and AI Evals principles already cover provenance, evidence-backed progress, traceability, whole-system evals, and environment contracts.
- `2026-07-17-agent-scout-01-principle-04`: rejected. The outer-loop lesson is durable, but existing Agent Principles already cover human judgment, accountability, high-risk approvals, review throughput, borrowed confidence, and delegation sharpening the operator.
- `2026-07-17-agent-scout-01-principle-05`: rejected. The physical-domain agent lesson is durable, but existing Agent and AI Evals principles already cover deterministic scaffolding, high-risk approval, production-like environments, trace inspection, robustness, and expert review.

No principles-doc patch was made.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-07-17-agent-scout-01/`
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
