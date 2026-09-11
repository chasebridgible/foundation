# Google AI Developers Evidence - 2026-09-11 Agent Capability Scout

- Run ID: `2026-09-11-agent-scout-01`
- Source ID: `google-ai-developers`
- Source URL: https://developers.googleblog.com/en/search/?technology_categories=AI
- Retrieved at: `2026-09-11T05:02:45Z`
- Retrieval status: fetched

## Retrieval notes

The Google Developers Blog AI search page loaded through the browser retriever. It exposed two September 9, 2026 in-scope agent-system posts above September 4 and September 2 items already handled by recent scout runs.

## Observed source state

New September 9, 2026 items visible on the AI-filtered Developers Blog search page:

- `Announcing ADK for Kotlin 1.0: Building Production-Ready AI Agents in Kotlin, Android, and Beyond`, Mobile.
- `The Anatomy of Harness Engineering: How to Evaluate, Iterate, and Guard AI Coding Agents`, AI.

Previously recorded items remained visible:

- `Driving Developer Excellence: Inside the Program Sprints`, September 4, 2026.
- `4 engineering patterns behind the strongest AI Agents Challenge submissions`, September 2, 2026.
- `How to Evaluate Live & Voice Agents in ADK`, August 24, 2026.
- `Build zero-trust AI agents with Google's Agent Development Kit`, August 17, 2026.

## Finding evidence

`The Anatomy of Harness Engineering: How to Evaluate, Iterate, and Guard AI Coding Agents` is the strongest Google finding. It argues that end-to-end benchmarks are useful but often too slow and too coarse to diagnose why an agent changed. It recommends behavioral evaluations as fast, local, unit-style checks over observable intermediate actions, such as whether an agent asks a clarifying question, runs a validator, calls web search for live information, or modifies the expected file. It positions evals as a second-phase guardrail once an agent can dogfood meaningful work, and says the evaluation suite's core job is to protect against holistic regressions from prompt tweaks, tool schema changes, or model upgrades. The article recommends a small loop: pick one recent failure mode, assert on the relevant action with strict or flexible checks depending on task complexity, and use batch evaluations to track aggregate behavior under nondeterminism. It explicitly says behavioral micro-evals complement macro benchmarks rather than replacing them.

The durable lesson is that harness evaluation should inspect behavior inside the trajectory, not only final task score. This is directly valuable to Foundation's checker/eval design because it strengthens the case for local deterministic checks, trace assertions, failure-derived cases, and distributional batch signals around agent workflows.

`Announcing ADK for Kotlin 1.0` is also in scope. The article describes ADK Kotlin with Kotlin Symbol Processing for zero-reflection, type-safe function calling; agent loops that discover and load skills and skill resources; generated tools; human-in-the-loop workflows; context compaction; tracing and observability; and Android-first extensions for local models, cloud reasoning, Room session persistence, AppSearch semantic memory, and file-backed artifacts. The examples include an incident-triage agent that loads an SOP skill, inspects telemetry, posts an update, and advises rollback; and a financial assistant whose `transferFunds` tool requires explicit user approval and resumes after a UI confirmation.

The durable lesson is that production agent frameworks are converging on typed tool contracts, dynamic skill loading, local persistence, explicit artifact stores, human confirmation for sensitive actions, and platform-native memory. This is useful for Foundation, but mostly reinforces existing harness and authority principles rather than creating a new doctrine gap.

## Diff against prior successful run

The September 7 scout recorded OpenAI findings; the September 9 blocked branch recorded no Google finding because the visible Google items were still the September 4 and September 2 posts already handled. This run saw two September 9 Google posts and created two findings.

## Principle gate

Two Google lessons were evaluated for principle promotion. Both failed the additive gate. Existing AI Evals Principles already name observed behavior before measurement, outcomes first with traces when conduct matters, whole-system identity, complementary signals, deterministic facts checked with deterministic code, failure-driven assets, experiments against known datasets, and distributional reliability. Existing Agent Principles already cover whole-harness design, workflow-packaged skills, explicit tool contracts, deterministic scaffolding, human approval at high-risk boundaries, durable artifacts, and reviewable change flow.
