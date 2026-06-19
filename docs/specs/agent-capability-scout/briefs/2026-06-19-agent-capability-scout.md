# Agent Capability Scout Brief - 2026-06-19

Run ID: `2026-06-19-agent-scout-01`
Status: `complete`
Branch: `codex/agent-capability-scout-20260619-02`
Source registry version: `2026-06-05`

## Sources Checked

- `openai-news`: blocked. The bounded fetch returned a Cloudflare challenge page instead of the news listing, so no safe OpenAI finding was recorded.
- `anthropic-news`: fetched. No new broad-value scoped lesson beyond deployment, policy, or market activity already represented in prior scout findings.
- `google-ai-developers`: fetched. New scoped item: Agentic Resource Discovery standardizes publishing, discovering, and verifying agent capabilities across domains.
- `addy-osmani-blog`: fetched. New scoped item: The New Software Lifecycle.

## Top Interest Grade

Top grade: **9/10**

Addy Osmani's "The New Software Lifecycle" is the highest-interest item because it sharpens a durable agent-systems rule: the harness, context architecture, and verification loop matter more than the model alone, and specification plus evaluation stay load-bearing even as implementation compresses.

## Findings

### High

1. `2026-06-19-agent-scout-01-finding-01` - Addy Osmani's "The New Software Lifecycle".
   - Interest: 9/10
   - Reason: major broad value for Foundation because it compresses several durable engineering realities into one operating lesson: agent capability comes from harness design, context routing is a first-class architectural and economic decision, and verification rather than demos separates engineering from vibe coding.

2. `2026-06-19-agent-scout-01-finding-02` - Google AI Developers: Agentic Resource Discovery specification.
   - Interest: 8/10
   - Reason: high broad value because cross-org agent systems need a durable discovery-and-trust layer for tools, skills, and other agents instead of bespoke connector knowledge hidden inside one harness.

### Medium

None.

### Low

None.

## Principle Candidates

Rejected:

- `2026-06-19-agent-scout-01-principle-01` proposed: "Treat harness and context architecture as the primary engineering surface; model choice is only one component."
- Standalone additive eval: fail.
- Rationale: the lesson is strong and durable, but existing Agent Principles and AI Evals Principles already cover engineering the whole agent system, keeping the always-loaded layer short, evaluating the whole system rather than the model, and closing progress through evidence instead of demos or confidence.

No principles-doc patch was made.

## Artifact Paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-06-19-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Run manifest: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Merge And Notification State

Merge state: PR 75 merged at `2026-06-19T15:10:08Z` after the required `Spec registry and metadata` check passed. The merged run is routine scout state with no principles-doc patch.

Notification state: the GitHub App notification was sent to PR 75 as `automated-worker-notifications[bot]` at `https://github.com/chasebridgible/foundation/pull/75#issuecomment-4752707588` and mentioned `@chasebridgible`.
