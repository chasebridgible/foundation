# Google AI Developers Evidence — 2026-10-14 Agent Scout

Run ID: `2026-10-14-agent-scout-01`
Source ID: `google-ai-developers`
Source URL: <https://developers.googleblog.com/en/search/?technology_categories=AI>
Retrieval status: fetched through official web source access on 2026-10-15 UTC.

## Observed Source State

- `Optimizing a 200,000-line Python codebase overnight with Gemini 4 Argon` (October 13) reports an 11-hour autonomous optimization run over Google ADK's roughly 205,000 lines and 17,000 tests. Its second, review-ready run used progressively loaded `.agents/skills`, a goal preserved across compactions, a request for an unmerged PR with before/after numbers, baseline and independent holdout benchmarks, full test execution, and maintainer review that accepted two of six proposed changes.
- `Announcing MCP support in Apigee hybrid: agentic tools that run in your own cluster` (October 14) describes generating MCP tools from OpenAPI specifications while keeping runtime traffic inside the customer's Kubernetes cluster. It filters discovery and execution by API product and tool quota, inherits API authentication/policies, records tool-level performance, and carries W3C trace context from agent request through gateway to backend.
- The earlier AQuA, Developer Knowledge API, and EmbeddingGemma items remain recorded in prior checkpoints.

## Finding Assessment

- Both October 13/14 items are new, in-scope, and meaningful. They produce two findings: durable unattended-work controls and production-grade locality/governance/observability for MCP tool surfaces.

## Principle Gate Notes

- The long-run candidate was evaluated against Agent Principles' context, long-running work, harness, evaluation, authority, and handoff sections plus AI Evals Principles' environment, independent judgment, representative suites, traceability, and experiments. It is useful evidence but non-additive.
- The MCP candidate was evaluated against Agent Principles' harness/tool contracts, permissions, and authority plus AI Evals Principles' whole-system identity, environment, trace inspection, and run traceability. It is useful evidence but non-additive.
