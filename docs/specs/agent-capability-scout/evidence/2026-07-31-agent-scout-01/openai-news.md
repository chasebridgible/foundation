# Evidence snapshot: openai-news

Run ID: `2026-07-31-agent-scout-01`
Fetched at: `2026-07-31T14:22:13Z`
Source: https://openai.com/news/
Retrieval status: fetched through browser-accessible source page and article pages.

## Source page observation

The OpenAI News page showed new visible items after the prior 2026-07-29 scout:

- `Advancing the price-performance frontier with GPT-5.6` - Product, July 30, 2026.
- `How enabling two settings tripled our scores on the ARC-AGI-3 benchmark` - Research, July 29, 2026.
- `Accelerating scientific discovery with ChatGPT for Academic Researchers` - Company / Research / Release, July 29, 2026.
- `How GPT-5.6 fuses frontier intelligence with frontier efficiency` - Engineering, July 29, 2026.

The prior 2026-07-29 run had already recorded `Scientific computing in the age of agentic AI` and `How AI is expanding what people do at work`.

## Relevant details

`How enabling two settings tripled our scores on the ARC-AGI-3 benchmark` reports that ARC-AGI-3 scores changed substantially when the harness retained reasoning and used compaction instead of discarding reasoning and rolling truncation. The post frames the result as a harness-design lesson: evals measure API settings, prompting, and harness behavior alongside the model. It reports a public-set score change from 13.3% with the official harness to 38.3% with retained reasoning and compaction, with fewer output tokens.

`Advancing the price-performance frontier with GPT-5.6` ties model selection to workflow outcome, risk, urgency, and scale. It says Luna and Terra prices dropped, Fast mode changed latency/cost tradeoffs for Sol, and routine multi-step/tool-using work can move to lower-cost models when quality standards are explicit. It also describes a coding workflow split where a stronger model resolves uncertainty and defines a plan, while a cheaper model implements well-specified changes, runs tests, and evaluates results.

`How GPT-5.6 fuses frontier intelligence with frontier efficiency` gives agent-harness details: deferred discovery for integrations, skills, plugins, and MCP tools; default tool-output caps; append-only model-visible history; deterministic tool ordering; runtime settings outside tool definitions; prompt-cache reuse; context-bloat reduction; and reuse of work across agent loops.

`Accelerating scientific discovery with ChatGPT for Academic Researchers` announced access for researchers, research workspaces with privacy protections, tools and skills for scientific workflows, connectors, training, and feedback loops. It is relevant as a domain-agent adoption signal, but the stronger post-July-29 lessons for Foundation come from the ARC-AGI harness and GPT-5.6 harness-efficiency posts.

## Scout interpretation

The ARC-AGI result is a high-value eval finding because it makes harness memory and compaction part of the measured system, not an implementation footnote. The GPT-5.6 efficiency material is a high-value operating finding because it normalizes outcome-tiered model routing and context/tool presentation as first-class agent-system design levers. The academic-researcher release is noted but not promoted to a finding because the July 29 scientific-computing report already covered the deeper research-agent workflow lesson.
