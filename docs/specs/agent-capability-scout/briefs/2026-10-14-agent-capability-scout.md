# Agent Capability Scout Brief - 2026-10-14

Run ID: `2026-10-14-agent-scout-01`
Status: complete pending publish
Source registry version: `2026-06-05`

## Sources Checked

- `openai-news` - fetched. No new scout-relevant finding after the October 13 checkpoint; the visible high-value agent, safety, and platform lessons were already recorded.
- `anthropic-news` - fetched. New midterms safeguards and Singapore-office posts were reviewed, but neither cleared the broad agent-system finding threshold.
- `google-ai-developers` - fetched. Two new meaningful findings: an unattended, review-gated 11-hour coding-agent workflow and production-grade MCP tool hosting inside a customer's own cluster.
- `addy-osmani-blog` - fetched. No newer in-scope personal-blog item after the recorded September baseline.

## Top Interest Grade

Top grade: 9/10.

Reason: Google's overnight ADK work makes a long autonomous run inspectable and reviewable by combining bounded on-demand context, a persistent goal across compactions, baseline and hidden holdout measurements, full tests, an unmerged PR boundary, and maintainer subtraction. Its Apigee hybrid MCP release makes the tool boundary similarly operational: local traffic, least-privilege discovery and execution, existing API governance, per-tool telemetry, and end-to-end traces.

## Findings

1. `2026-10-14-agent-scout-01-finding-01` - Google `Optimizing a 200,000-line Python codebase overnight with Gemini 4 Argon`, 9/10. A persistent goal plus progressively loaded repo skills, independent holdout benchmarks, full tests, an unmerged PR, and maintainer review let an 11-hour autonomous code run explore broadly while keeping human judgment at the promotion boundary.
2. `2026-10-14-agent-scout-01-finding-02` - Google `Announcing MCP support in Apigee hybrid`, 9/10. OpenAPI-derived tools can remain inside the operator's cluster while inheriting API authentication and policy, filtering discovery by entitlement, enforcing tool quotas, exposing per-tool telemetry, and forwarding distributed trace context across the agent-to-backend path.

## Principle Candidates

Two candidates were evaluated and rejected as non-additive. No principles docs were patched.

- Unattended long-run promotion: rejected because the existing Agent and AI Evals principles already require bounded context, restartable long work, harness contracts, evidence gates, human authority, independent judgment, representative/holdout evaluation, traceability, and experiments.
- Governed local MCP tools: rejected because the existing Agent and AI Evals principles already require tool/permission contracts, containment, whole-system and environment identity, trace inspection, and auditable runs.

## Artifact Paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-10-14-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`

## Publish State

Pending branch push and PR creation on `codex/agent-capability-scout-20261014-01`.

## Requested Owner Action

Review the PR once opened. This is routine scout state with two findings and two rejected principle candidates only; no principles-doc patch needs owner judgment.
