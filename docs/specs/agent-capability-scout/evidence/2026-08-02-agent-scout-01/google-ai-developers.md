# Google AI Developers Evidence - 2026-08-02 Agent Scout

- Run ID: `2026-08-02-agent-scout-01`
- Source ID: `google-ai-developers`
- Source URL: https://developers.googleblog.com/en/search/?technology_categories=AI
- Topic scope: Google AI developer, agent, model, tool, eval, and platform changes relevant to improving agent systems.
- Retrieved at: 2026-08-02T05:08:06Z
- Retrieval surface: Codex web tool. Shell network was unavailable in this environment; `git fetch` failed with DNS resolution for `github.com`.
- User-provided previous automation timestamp: 2026-07-31T05:03:48.543Z.
- Local comparison note: local Foundation state only contains scout artifacts through 2026-06-19 and the canonical checkout is 59 commits behind `origin/main`; the July 31 comparison state was not available locally because fetch is blocked.

## Current source observations

The Google AI Developers AI search page showed current relevant items including:

- `Announcing Agent Evaluation: Bringing full lifecycle support to Vertex AI`, dated July 31, 2026.
- `Build AI Agents with Agent Skills in Gemini CLI`, dated July 31, 2026.
- `Introducing LangExtract: A Gemini powered information extraction library`, dated July 30, 2026.
- `Introducing Opal: describe, create, and share your AI mini-apps`, dated July 24, 2026.

## Finding evidence: Agent Evaluation

The July 31 Agent Evaluation item describes a full-lifecycle evaluation service for agents, including curated datasets, custom datasets, trajectory-quality checks, response-quality checks, judge-model-backed criteria, safety, latency, token count, and tool-call validity. It also connects local evaluation with production tracing and monitoring through Gen AI Monitoring.

Scout relevance: this is a strong current signal that useful agent evals need to cover the whole agent lifecycle: task outcomes, trajectories, tools, safety, cost/latency, and production drift. This validates Foundation's AI eval posture and is high value for future agent harness and checker design.

## Finding evidence: Agent Skills in Gemini CLI

The July 31 Agent Skills item describes Skills as reusable instruction bundles for Gemini CLI, with `GEMINI.md` as the mandatory entry point, frontmatter metadata, progressive disclosure through linked files, and executable scripts for deterministic or repetitive work.

Scout relevance: this is a strong current signal that vendor ecosystems are converging on skills as workflow packages rather than free-form prompt notes. The finding mostly validates Foundation's existing skill doctrine: load the entry skill first, follow its workflow, use progressive disclosure, and include scripts/checks for repeatable work.

## Principle gate

Both Google candidate lessons were evaluated against `docs/principles/agent-principles.html` and `docs/principles/ai-evals-principles.html`. The eval lesson is already covered by whole-system, trace, offline/online, and production-failure principles. The skill lesson is already covered by progressive disclosure and skills-as-workflow-packages principles. No additive principles-doc patch qualifies from this Google source in this run.
