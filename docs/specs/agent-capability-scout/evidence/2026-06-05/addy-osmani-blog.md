# Addy Osmani Blog Snapshot

Run ID: 2026-06-05-agent-scout-01
Fetched at: 2026-06-05T21:14:26Z
Source URL: https://addyosmani.com/blog/
Source ID: addy-osmani-blog

## Scope Check

Enabled source family: Addy Osmani.
Topic scope: Agent engineering, AI-assisted development, software quality, evals, and durable engineering workflow lessons.

## Retrieved Evidence

- The blog index listed "The Orchestration Tax" dated May 24, 2026, plus related agent posts on cognitive surrender, agent skills, long-running agents, agent harness engineering, agentic engine optimization, parallel agent limits, and code-agent orchestras.
- "The Orchestration Tax" argued that spawning agents is cheap while closing the loop remains bottlenecked by human judgment, code review, merge reconciliation, and context switching.
- The article recommended scaling the agent fleet to review rate, sorting isolated work from judgment-heavy work, batching reviews, making agents prove routine work with tests or screenshots, and protecting focused serial time.
- "Long-running Agents" described durable state outside the model window, explicit progress files, task lists, handoff notes, tests, and separate evaluator roles as core to recoverable multi-session agency.

## Scout Interpretation

The durable principle candidate is that parallel agent work must be sized against human review throughput, not against how many background tasks a UI can start. Foundation already warns against naive concurrency, but this source adds an actionable sizing rule for queues and multi-agent orchestration.
