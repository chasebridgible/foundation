# Source Snapshot: OpenAI News

- Run ID: `2026-09-23-agent-scout-01`
- Source ID: `openai-news`
- Source URL: https://openai.com/news/
- Fetched at: `2026-09-23T05:03:26Z`
- Retrieval status: fetched via browser-accessible source page and article pages

## Observed source state

The OpenAI News index showed three new September 22, 2026 items above the September 21 baseline:

- `Better prompt caching for GPT-6`
- `Introducing GPT-6 Sol and Luna`
- `Priorities and principles for effective third party assessments`

The same index also showed September 21 company/academy items that were reviewed as below the agent-system finding threshold for this run.

## Evidence notes

`Better prompt caching for GPT-6` says GPT-6 persistent agents can run for hours across complex tasks while carrying forward shared instructions, tools, and context. It describes better default prompt caching, discounts for reused shared prefixes, a caching dashboard, diagnostics for cache misses, explicit cache breakpoints, changing reasoning effort without breaking cache, stable tool definitions and ordering, `allowed_tools`, late appended developer messages, and prewarming shared context.

`Introducing GPT-6 Sol and Luna` says the new models bring frontier capabilities to lower-cost tiers and includes agent-facing evaluations across AutomationBench, Agents' Last Exam, FrontierCode, DeepSWE, OSWorld 2.0, factuality on de-identified flagged conversations, coding deception, reviewer bypass, warning circumvention, and unauthorized interaction. It also says GPT-6 caching improvements help long conversations and agents reuse context while preserving cache across reasoning-effort and tool-availability changes.

`Priorities and principles for effective third party assessments` defines safety claims and safety cases, calls for independent assessment across training, evaluation, internal deployment, and external deployment, names assessment of safeguards including misalignment monitors and cyber/biological/chemical misuse defenses, and stresses independence, expertise, security, actionable findings, remediation windows, evidence-grounded publication, redaction policies, and shared standards.

## Finding threshold decision

Three OpenAI findings were promoted:

- Prompt caching controls for long-running agents, grade 10.
- GPT-6 Sol/Luna cost-intelligence and eval packaging for agent routing, grade 9.
- Third-party safety assessment contracts, grade 10.
