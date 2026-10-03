# OpenAI News evidence

Run ID: `2026-10-03-agent-scout-01`
Source ID: `openai-news`
Fetched at: `2026-10-03T14:44:26Z`
Source URL: https://openai.com/news/
Retrieval status: fetched via web retriever

## Observed source state

The OpenAI News index listed these top cards on 2026-10-03:

- `A practical guide to building with GPT-6`, Product, Oct 2, 2026.
- `The eternal complement`, Intelligence Age, Oct 1, 2026.
- `How Albertsons Companies is reimagining retail from the inside out`, Company, Oct 1, 2026.
- `Disrupting a coordinated model-distillation campaign`, Security, Sep 30, 2026.
- `DevDay 2026 Recap`, Company, Sep 29, 2026.
- `Introducing GPT-6.1 Sol`, Product, Sep 29, 2026.
- `Addendum: GPT-6.1 Sol`, Safety, Sep 29, 2026.
- `Introducing dots`, Product, Sep 29, 2026.
- `Towards safety cases for frontier AI training`, Safety, Sep 28, 2026.

The prior successful scout run, `2026-10-01-agent-scout-01`, already recorded the Sep 29/Sep 30 OpenAI agent-platform findings. The Oct 2 GPT-6 model guide is the strongest new in-scope OpenAI item for this run.

## New meaningful items

### A practical guide to building with GPT-6

Evidence URL: https://openai.com/index/practical-guide-building-gpt-6/

Observed details:

- OpenAI frames the GPT-6 family guide around choosing models for different workloads, managing long-running work, and preparing production workflows for deployment.
- Production guidance includes cutting irrelevant context while preserving needed evidence, running independent tasks together, reusing shared context through prompt caching, keeping stable instructions and tool definitions before changing task details, tracking cache diagnostics, using compaction for longer conversations, monitoring behavior, checking data controls, and measuring task success, latency, and cost per successful task.
- Model selection guidance separates GPT-6 Astra, GPT-6.1 Sol, and GPT-6 Luna by task difficulty and cost profile, and says reasoning effort and speed tiers should be chosen by workload rather than fixed globally.
- Prompt and skill guidance tells builders to keep prompts, skills, and repository instructions consistent about deliverables, independent authority, and done criteria; keep skill descriptions short; load supporting details only when needed; update `AGENTS.md`; replace blanket approval rules with clear decision boundaries; and define persistence through implementation, running, inspection, and fixing failures.
- Long-running guidance calls out mid-turn steering, asynchronous tool calls, delegation to subagents, clarification while Codex works, steering active tasks when requirements change, and computer use for browser or desktop workflows when direct APIs are not available.
- Case examples emphasize evidence that reviewers can inspect, including test results, simulator recordings, reports that separate checked and unchecked areas, dashboard outputs, and domain-specific editorial review.

Scout assessment:

This is a high-value agent-system finding because it turns many recurring Foundation themes into an explicit production playbook: cache-aware context architecture, compaction, workload-based model/routing choices, skill and `AGENTS.md` maintenance, independent-work boundaries, long-running steering, async tools, subagent delegation, computer use, and evidence-backed done criteria. It is recorded as a finding, but the principle candidate is rejected as non-additive because existing Foundation principles already cover these behaviors.

## Below-threshold or already-recorded OpenAI items

- `The eternal complement` is a useful Intelligence Age essay about execution capacity, institutional intelligence, and reality-contact bottlenecks. It is broad context for agent work but not a concrete OpenAI agent, model, tool, eval, API, Codex, or platform change under the current source scope.
- `How Albertsons Companies is reimagining retail from the inside out` shows enterprise and commerce adoption, including ChatGPT Enterprise, custom OpenAI API applications, recommendations, promotional insights, and the Safeway shopping experience in ChatGPT. It was reviewed as useful adoption context but below the meaningful agent-system finding threshold because it adds less new durable architecture than recent enterprise-agent findings.
- The Sep 29/Sep 30 OpenAI items were already recorded by `2026-10-01-agent-scout-01`.
