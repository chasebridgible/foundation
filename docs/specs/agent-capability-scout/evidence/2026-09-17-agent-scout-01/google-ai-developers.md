# Google AI Developers Evidence - 2026-09-17 Agent Capability Scout

- Run ID: `2026-09-17-agent-scout-01`
- Source ID: `google-ai-developers`
- Source URL: https://developers.googleblog.com/en/search/?technology_categories=AI
- Retrieved at: `2026-09-17T05:03:16Z`
- Retrieval status: fetched

## Retrieval notes

The Google Developers Blog AI-filtered search page and the relevant detail pages fetched successfully through the browser retriever.

## Observed source state

New visible items above the September 13 scout baseline:

- `Agent Anomaly Detection, now in Private Preview on the Gemini Enterprise Agent Platform`, Sep 16, 2026, https://developers.googleblog.com/en/agent-anomaly-detection-now-in-private-preview-on-the-gemini-enterprise-agent-platform/
- `Build zero-trust AI agents that judge intent, not just syntax`, Sep 15, 2026, https://developers.googleblog.com/en/build-zero-trust-ai-agents-that-judge-intent-not-just-syntax/

Previously recorded visible items included:

- `Autonomous LLM post-training with Tunix on TPUs`, Sep 11, 2026, already recorded by the September 13 scout.
- `Announcing ADK for Kotlin 1.0`, Sep 9, 2026, already recorded by the September 11 scout.
- `The Anatomy of Harness Engineering`, Sep 9, 2026, already recorded by the September 11 scout.

## Finding evidence

`Agent Anomaly Detection` and the companion zero-trust runtime governance post form one high-value finding. Google describes an out-of-band oversight layer for Gemini Enterprise Agent Platform that analyzes OpenTelemetry traces and tool calls without adding runtime latency. It uses layered detection: statistical scanning over all traffic, deeper LLM-based reasoning over flagged sessions, and tool-call reconstruction when closer review is needed. Findings include severity, explanation, recommended next steps, OWASP Agentic Top 10 categories, and Security Command Center integration.

The example behavior is agentic rather than syntactic: an inventory agent makes repeated large-batch, offset-jumping tool calls that do not error but amount to scraping. The detection pipeline flags the session, reasons over the full exchange, and recommends rate limits, authorization checks, and alerts. The API can be used by ADK callbacks or plugins to block subsequent tool calls or halt a turn when severity and probability cross a threshold.

The zero-trust post extends the loop from detection to runtime remediation. It frames prompt screening, semantic governance of proposed tool intent, signed writes, multi-turn anomaly detection, Security Command Center findings, and dynamic policy creation as runtime controls. A refund-agent example shows repeated approved refunds to one order being detected through cumulative and repeated-write patterns; a remediation loop then creates a policy that denies further refunds for the same order and routes to a human manager without redeploying the agent.

The durable lesson is that production agent safety needs runtime behavior governance in addition to build-time checks: trace-level anomaly detection, policy tied to intent and business rules, severity and probability thresholds, human/actionable triage, programmatic blocking or halt points, and closed-loop policy updates that do not require agent redeploys.

## Diff against prior successful run

The September 13 scout recorded Google findings through the Sep 11 Tunix autonomous post-training item. This run saw the newer Sep 15 and Sep 16 Gemini Enterprise runtime-governance items and created one Google finding.

## Principle gate

The runtime-governance lesson was evaluated for principle promotion and rejected as non-additive. It is durable, but existing Agent Principles already cover whole-harness design, deterministic high-risk boundaries, tool contracts, permissions, human approval, reviewable change flow, evidence-based progress, and tools that make correct work easier than plausible work. Existing AI Evals Principles already cover whole-system identity, environment contracts, traces when conduct matters, agent failures cascading through steps, complementary production traces, robustness and misuse, online/offline feedback loops, explanations as diagnostic data, failure-derived assets, and routing findings to the owning layer.
