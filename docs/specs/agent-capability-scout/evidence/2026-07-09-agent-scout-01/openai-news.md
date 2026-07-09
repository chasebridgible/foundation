# Source snapshot: openai-news

Run ID: `2026-07-09-agent-scout-01`
Fetched at: `2026-07-09T17:25:32Z`
Source URL: https://openai.com/news/
Retrieval status: fetched
Source scope: OpenAI agent, model, tool, eval, API, Codex, and platform changes relevant to improving agent systems.

## Observed current source state

The OpenAI news index was reachable and showed these relevant recent items:

- `ChatGPT is now a partner for your most ambitious work` - Product, Jul 9, 2026.
- `GPT-5.6: Frontier intelligence that scales with your ambition` - Product, Jul 9, 2026.
- `Separating signal from noise in coding evaluations` - Research, Jul 8, 2026.
- `Introducing GPT-Live` - Product, Jul 8, 2026.
- `GPT-Live System Card` - Safety, Jul 8, 2026.
- `Core dump epidemiology: fixing an 18-year-old bug` - Engineering, Jun 30, 2026.

The ChatGPT Work article describes a long-running work agent that can take action across apps and files, break larger goals into smaller steps, carry context through multi-step workflows, use scheduled tasks, work across web/mobile/desktop, use connected plugins, browser, local desktop computer use, and create/update docs, sheets, slides, Sites, dashboards, and workflow artifacts. It also names control and governance surfaces: user approval, tool-access choices, admin-managed connected tools, browser/network restrictions, compliance API visibility, usage/spend controls, and auto-review for important connected-tool or API actions.

The coding-evaluations article audits SWE-Bench Pro and reports that roughly 30% of public-split tasks appear broken. The audit uses an automated data-quality pipeline, human-supervised Codex investigator agents with repo and environment access, repeated deeper agent passes, researcher review, and a five-reviewer human annotation campaign. It identifies failure categories including overly strict tests, underspecified prompts, low-coverage tests, and misleading prompts, and retracts the prior recommendation to adopt SWE-Bench Pro.

The GPT-5.6, GPT-Live, and system-card items are relevant product or model updates, but the visible source index and article text did not add a separate broadly useful Foundation lesson beyond the ChatGPT Work and coding-eval findings recorded for this run.

## Scout interpretation

Two OpenAI findings were recorded:

1. ChatGPT Work is a major mainstream signal that app-connected, long-running, scheduled, cross-surface agents need first-class runtime contracts for context, tool access, user steering, approvals, compliance visibility, and spend controls.
2. The coding-eval audit is a major eval-system signal: benchmark realism is not enough when task prompts, hidden tests, solution isolation, and grader behavior are broken; scalable agent-assisted audit plus independent human review becomes part of eval maintenance.
