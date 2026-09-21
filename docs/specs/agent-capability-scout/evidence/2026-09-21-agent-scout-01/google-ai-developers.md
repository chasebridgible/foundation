# Google AI Developers Evidence - 2026-09-21 Agent Capability Scout

- Run ID: `2026-09-21-agent-scout-01`
- Source ID: `google-ai-developers`
- Source URL: https://developers.googleblog.com/en/search/?technology_categories=AI
- Retrieved at: `2026-09-21T14:53:17Z`
- Retrieval status: fetched

## Retrieval notes

The Google AI Developers source was checked through the web retriever. The enabled source exposed a new September 17 AI developer item after the September 17 scout baseline.

## Observed source state

Recent visible source items included:

- `Why client SDK generation belongs in the open`, September 17, 2026. Google says it partnered with Speakeasy to open-source an OpenAPI code-generation suite after a proprietary SDK provider shutdown created platform risk. The suite generates multi-language SDKs with strict typing, server-sent event streaming, retries, and pagination; an agent-native CLI generator; and a documentation MCP server generator that lets coding agents query live verified schemas instead of guessing outdated methods. Google frames deterministic generation as the right tool for formal API specs, with Antigravity AI agents accelerating custom SDK work around that deterministic core.
- `Agent Anomaly Detection, now in Private Preview on the Gemini Enterprise Agent Platform`, September 16, 2026, already recorded by the September 17 scout.
- `Build zero-trust AI agents that judge intent, not just syntax`, September 15, 2026, already rolled into the September 17 runtime-governance finding.
- Earlier ADK, harness-engineering, and Tunix posts already recorded by previous scouts.

## Finding evidence

One Google finding was created. The SDK-generation item matters because it treats API schemas, generated SDKs, CLIs, and MCP documentation servers as deterministic infrastructure that lets coding agents use live contracts instead of improvising HTTP glue or stale method names.

## Diff against prior successful run

The September 17 scout recorded Google's September 15 and September 16 runtime-governance items. The September 17 SDK-generation item is new to canonical scout state.

## Principle gate

One principle candidate was evaluated and rejected as non-additive. Agent Principles already cover tools that make correct work easier, workflow-packaged skills, explicit artifacts, deterministic scaffolding, and environment contracts; AI Evals Principles already cover whole-system identity and traceable evidence.
