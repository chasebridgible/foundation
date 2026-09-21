# Agent Capability Scout Brief - 2026-09-21

- Run ID: `2026-09-21-agent-scout-01`
- Started at: `2026-09-21T14:53:17Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260921-01`
- Status: complete pending publish

## Sources checked

- `openai-news`: fetched. No newer unrecorded in-scope item after the September 17 scout baseline.
- `anthropic-news`: fetched. New September 17-18 items created three Anthropic findings: frontier-lab development measurements, Life Sciences Verification Program, and embedded evaluation.
- `google-ai-developers`: fetched. New September 17 SDK-generation item created one Google finding.
- `addy-osmani-blog`: fetched. Newly visible September 14 `Brownfield Agentic Engineering` item created one Addy finding.

## Top findings

1. `2026-09-21-agent-scout-01-finding-01` - Anthropic, `Measurements for understanding the pace of AI development inside frontier labs`. Interest grade: 10/10. Frontier-agent organizations need public, repeatable metrics for AI-led R&D, agent-monitor coverage, review latency, escalation rates, and safety-resource allocation.
2. `2026-09-21-agent-scout-01-finding-02` - Anthropic, Life Sciences Verification Program. Interest grade: 9/10. High-risk domain agents need verified access, scoped use cases, offline misuse monitoring, retained evidence, and administrator remediation paths.
3. `2026-09-21-agent-scout-01-finding-03` - Addy Osmani, `Brownfield Agentic Engineering`. Interest grade: 9/10. Brownfield coding agents need hidden constraints made visible, characterization tests, smaller change zones, compatibility preservation, and strong review before speed compounds risk.
4. `2026-09-21-agent-scout-01-finding-04` - Anthropic, embedded evaluation with Accenture. Interest grade: 8/10. Independent evaluators become more useful when they can inspect the model-development operating process, not only finished releases.
5. `2026-09-21-agent-scout-01-finding-05` - Google, open SDK generation. Interest grade: 8/10. Agent-facing APIs should compile formal schemas into deterministic SDKs, CLIs, and MCP documentation servers.

Top interest grade: 10.

## Principle candidates

Five candidates were evaluated and rejected as non-additive. No principles-doc patch was made.

- `2026-09-21-agent-scout-01-principle-01`: frontier agent organizations should publish operating metrics for AI-led R&D, monitor coverage, review latency, escalation rates, and safety-resource allocation.
- `2026-09-21-agent-scout-01-principle-02`: high-risk domain agents should pair verified access with scoped use cases, retained evidence, offline monitoring, and administrator remediation.
- `2026-09-21-agent-scout-01-principle-03`: brownfield coding agents should make hidden constraints visible, characterize current behavior, shrink change zones, and require strong tests before accelerating modernization.
- `2026-09-21-agent-scout-01-principle-04`: independent frontier-agent evaluators should inspect training, deployment decisions, incidents, safety commitments, and blind spots from inside the operating process.
- `2026-09-21-agent-scout-01-principle-05`: agent-facing APIs should compile formal schemas into deterministic SDKs, terminal tools, and MCP documentation.

Existing Agent Principles and AI Evals Principles already cover these through whole-system identity, environment contracts, trace visibility, robustness and misuse, online/offline incident loops, evidence-backed progress, deterministic high-risk boundaries, explicit tool and permission contracts, reviewable change flow, complementary signals, and routing findings to the owning layer.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-09-21-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- PR: pending.
- Merge state: pending publish through the protected Foundation flow.
- Notification state: pending GitHub App PR comment after a PR exists.
- Requested owner action: review the PR after required checks pass, with attention to the 10/10 Anthropic measurement finding and the rejected principle-candidate rationale.
