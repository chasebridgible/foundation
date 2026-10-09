# Google AI Developers Evidence - 2026-10-09 Agent Scout

Run ID: `2026-10-09-agent-scout-01`
Source ID: `google-ai-developers`
Source URL: `https://developers.googleblog.com/en/search/?technology_categories=AI`
Retrieval status: fetched through web source access on 2026-10-09.

## Observed Source State

- The Google AI Developers index showed post-2026-10-07 AI items relevant to the scout scope:
  - `The Outer Loop, Insights First: An Ambient Quality Agent That Diagnoses Your Production Agent`, dated October 8, 2026.
  - `Supercharge your development with the Google Developer Knowledge API ecosystem`, dated October 7, 2026.
  - `ML Drift: Next-Gen GPU AI/ML Inference at the Edge`, dated October 8, 2026.
- The AQuA post describes a 24/7 ambient quality agent that runs beside production agents, reads Cloud Trace/Logging/BigQuery trajectories, samples up to 1,000 sessions, reviews each session with a nine-point checklist and optional goal.md, clusters failures by mechanism, verifies clusters against full transcripts, tracks insights as new/recurring/resolved, diagnoses root cause against immutable deploy-time source snapshots, cites line ranges, and never edits or opens PRs on its own.
- The post's travel-concierge example maps failures across subagents, session state, tool availability, source snapshots, dashboard inspection, root-cause chat, headless CLI diagnosis, replay extraction, post-fix verification, bounded verification costs, long-horizon compaction needs, and sandboxed counterfactual test-case direction.
- The Developer Knowledge API post describes a structured, frequently indexed official documentation API, CLI, agent skill, MCP server, chunk search, grounded Q&A, and cross-tool compatibility so agents can retrieve authoritative fresh documentation rather than scraping or relying on stale training cutoffs.
- The ML Drift edge inference item was reviewed as useful model-serving infrastructure but not promoted to a finding because it is less directly about agent orchestration, memory, evals, reliability, human review, or tool-use doctrine than the AQuA and Developer Knowledge API items.

## Finding Assessment

- Created finding `2026-10-09-agent-scout-01-finding-06` for Google's AQuA ambient quality agent at 10/10. Broad agent-system value: production agent quality becomes an outer-loop workflow with trace sampling, model review, failure clustering, verification, source-snapshot diagnosis, line-cited fixes, cost bounds, and replay/eval handoff.
- Created finding `2026-10-09-agent-scout-01-finding-07` for Google's Developer Knowledge API ecosystem at 8/10. Broad agent-system value: official documentation retrieval becomes a structured API, CLI, MCP, and skill surface for agents rather than brittle scraping or stale model memory.

## Principle Gate Notes

- The AQuA candidate was rejected as non-additive because AI Evals Principles already cover online/offline eval loops, production traces, failure clustering through explanations, traceability, whole-system identity, failure-derived datasets, and routing findings to the owning layer.
- The Developer Knowledge API candidate was rejected as non-additive because Agent Principles already cover context engineering, favoring recognition over recall, tool contracts, MCP/skill-like workflow packages, and durable source-backed context.
