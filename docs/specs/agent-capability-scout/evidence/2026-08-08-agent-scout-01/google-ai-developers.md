# Evidence snapshot: google-ai-developers

Run ID: `2026-08-08-agent-scout-01`
Fetched at: `2026-08-08T05:03:53Z`
Source: https://developers.googleblog.com/en/search/?technology_categories=AI
Retrieval status: fetched through browser-accessible source page and article pages.

## Source page observation

The Google AI Developers search page showed these relevant visible items not previously normalized in canonical scout findings:

- `Agent Plugins package your skills, tools, and more` - AI, August 6, 2026.
- `Agent and Model Evaluations in Gemini Enterprise Agent Platform are now GA` - AI, July 31, 2026.
- `Enable on-demand expertise with Agent Skills in Genkit Go` - AI, July 31, 2026.

The August 5 MCP stateless update, August 4 model routing post, August 3 realtime-agent load-balancing post, and July 30 TPU microbenchmark post were already recorded in canonical 2026-08-06 or 2026-07-31 scout state.

## Relevant details

`Agent Plugins package your skills, tools, and more` describes Agent Plugins 1.0.0 as an open, vendor-neutral directory specification for packaging Agent Skills and MCP servers into portable plugins, with a technical steering group that includes Amazon, Cursor, Microsoft, OpenAI, and Vercel, and Google joining as a core maintainer. The article frames the problem as manifest and wrapper drift across clients. The v1 package is deliberately narrow: fixed locations for `skills/` and `mcp.json`, a minimal `plugin.json`, independent loading/failure for components, and client-specific extension namespaces. It explicitly leaves installation, distribution, permission models, sandboxing, trust, provenance, and UX to client layers. The post separates discovery, catalog description, packaging, and runtime execution as independently adoptable ecosystem layers. It says Agents CLI and Data Agent Kit support the format at launch.

`Agent and Model Evaluations in Gemini Enterprise Agent Platform are now GA` says the evaluation service uses one engine for local development experiments and live production traffic so drift points to agent behavior rather than metric inconsistency. It includes metrics for quality, safety, grounding, tool use, trajectories, reference-based tasks, adaptive rubrics, custom code-based metrics, LLM-as-judge metrics, versioned org-wide metric storage, server-side artifact retention, case generation, user simulators, environment simulators for slow or failing tools, continuous evaluation on production traces, drift alerts, failure clustering against a taxonomy, session logs, and local CI integration for ADK.

`Enable on-demand expertise with Agent Skills in Genkit Go` shows Genkit Go middleware loading Agent Skills on demand from `SKILL.md` bundles. The article emphasizes progressive disclosure: frontmatter descriptions are available for routing while full instructions, scripts, and references load only when the task matches. Its best-practice list recommends clear trigger descriptions, focused skills, deterministic tooling bundled with skills, and modular references.

## Scout interpretation

Agent Plugins is a high-value agent-ecosystem finding because packaging skills plus MCP servers as a small interoperable unit can reduce client wrapper drift while preserving independent runtime, discovery, permission, and trust layers. Gemini Enterprise evaluation GA is also high-value because it normalizes a full agent-quality loop from local evals to live traces, simulators, versioned metrics, issue clustering, and CI. Genkit Go skills are a meaningful but less novel finding for Foundation because Foundation already uses progressive skill loading and deterministic scripts; the current value is external validation that the pattern is becoming a portable runtime primitive.
