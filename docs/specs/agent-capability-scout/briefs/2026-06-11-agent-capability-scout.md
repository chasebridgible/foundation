# Agent Capability Scout Brief - 2026-06-11

Run ID: `2026-06-11-agent-scout-01`
Status: `complete`
Branch: `codex/agent-capability-scout-20260611-06`
Source registry version: `2026-06-05`

## Sources Checked

- `openai-news`: fetched. New scoped item: Codex used for black-hole simulation algorithm exploration.
- `anthropic-news`: fetched. New scoped item: Claude Fable 5 and Claude Mythos 5 launch.
- `google-ai-developers`: fetched. New scoped item: DiffusionGemma developer guide.
- `addy-osmani-blog`: fetched. No newer post than the previously recorded Loop Engineering item.

## Top Interest Grade

Top grade: **8/10**

Anthropic's Fable/Mythos launch is the highest-interest item because it combines long-horizon autonomy, persistent file-based memory, production-scale coding, and capability-gated safeguards. This is a strong calibration signal for Foundation harness and eval design, but it does not require a new principles-doc patch because existing Agent Principles already cover restartability, durable memory, whole-system evaluation, high-risk gates, and human approval boundaries.

## Findings

### High

1. `2026-06-11-agent-scout-01-finding-01` - Anthropic Fable/Mythos long-horizon autonomy and safeguards.
   - Interest: 8/10
   - Reason: high broad value for future long-running agent harnesses and risk-aware routing.

### Medium

1. `2026-06-11-agent-scout-01-finding-02` - OpenAI Codex used as a candidate-generator inside a rigorous scientific verification loop.
   - Interest: 7/10
   - Reason: reinforces inspectable, testable agent workflow design for hard domains.
2. `2026-06-11-agent-scout-01-finding-03` - Google DiffusionGemma parallel denoising and revise-before-commit architecture.
   - Interest: 7/10
   - Reason: useful architecture signal for planning, repair, structured output, and constraint solving.

### Low

None.

## Principle Candidates

Rejected:

- `2026-06-11-agent-scout-01-principle-01` proposed: "Long-horizon agents need memory, evaluation, and risk routing sized to their autonomy."
- Standalone additive eval: fail.
- Rationale: useful and durable, but existing Agent Principles already cover restartability, durable state, whole-system evaluation, deterministic high-risk gates, human approval, and reviewable change flow.

No principles-doc patch was made.

## Artifact Paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-06-11-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Merge And Notification State

Merged state: PR 63 merged at `2026-06-11T10:59:14Z` after the required `Spec registry and metadata` check passed. The GitHub App notification was sent to PR 63, and this run is routine scout state with no principles-doc patch.
