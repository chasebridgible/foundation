# OpenAI news snapshot

- Source: https://openai.com/news/
- Retrieved: 2026-11-09T05:00:32Z
- Scope checked: OpenAI agent, model, tool, eval, API, Codex, and platform changes relevant to improving agent systems.
- Comparison baseline: `2026-11-04-agent-scout-01`.

## New scoped item

**2026-11-05 — GPT-6 Cyber: Advancing the frontier of aligned cybersecurity agents**

OpenAI describes a cybersecurity agent that combines constrained authorization with explicit evaluation of out-of-scope actions. Its isolation test deliberately makes adjacent services exploitable and requires the model to infer they are outside the assigned target; the report says the system avoided those services in 99.93% of tests without the deployment prompt and 100% with it. The deployment pattern also combines controlled test environments, monitoring of authorization match, IP allowlisting, sandboxing, action review, and human oversight for high-risk workflows.

This is a scoped agent-system finding because it makes authorization compliance an observable behavioral property of the whole task environment, rather than relying on task success or policy text alone.

Source: https://openai.com/index/introducing-gpt-6-cyber/
