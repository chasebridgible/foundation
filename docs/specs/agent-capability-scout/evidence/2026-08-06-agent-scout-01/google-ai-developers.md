# Evidence snapshot: google-ai-developers

Run ID: `2026-08-06-agent-scout-01`
Fetched at: `2026-08-06T05:04:52Z`
Source: https://developers.googleblog.com/en/search/?technology_categories=AI
Retrieval status: fetched through browser-accessible source page and article pages.

## Source page observation

The Google AI Developers search page showed new visible items after the prior canonical 2026-07-31 scout:

- `Scaling AI Agent Infrastructure with the MCP Stateless updates` - AI, August 5, 2026.
- `A unified API for AI model routing` - AI, August 4, 2026.
- `Scaling real-time AI agents with session-aware load balancing` - AI, August 3, 2026.

The July 31 Agent Evaluation GA and Agent Skills in Genkit Go items appear in the visible page state. A prior unmerged August 2 branch had already noted those, but they are not canonical on `origin/main`; this run avoids duplicating them as today's primary findings and focuses on post-July-31 source changes that were not in canonical merged state.

## Relevant details

`Scaling AI Agent Infrastructure with the MCP Stateless updates` describes the 2026-07-28 MCP specification moving the protocol core to stateless requests. Protocol version, client capabilities, and client info move into request metadata. Standard HTTP headers expose protocol version, method, and tool or resource name so gateways can route, rate-limit, audit, and reject header/body mismatches without body inspection. The post also highlights cache TTLs for tool/resource lists, multi round-trip requests that return serialized `requestState` for clarification or confirmation, a first-class tasks extension for async work, explicit resource indicators for token scoping, richer tool schemas, and formal deprecation windows.

`A unified API for AI model routing` describes Google Cloud API Gateway model routing in public preview. Developers define model-routing rules in OpenAPI 3.x, expose stable OpenAI-compatible endpoints, route to Gemini, Claude, or OpenAI OSS-GPT backends on a shared host, and pair the gateway with Gemini Enterprise Agent Platform egress for governance. The routing layer can centralize endpoint stability, token tracking, rate limits, schema transcoding, and backend model selection.

`Scaling real-time AI agents with session-aware load balancing` argues that QPS and CPU utilization are insufficient for realtime agents because long-lived bidirectional streams carry committed session state, audio buffers, partial transcripts, active tool calls, and model context. The post recommends application-level active-session tracking, hybrid capacity calculations using committed sessions plus utilization, benchmarks that vary session counts, duration, arrival patterns, idle/active ratios, cancellation and disconnect rates, backend counts, and metrics such as overloaded assignments, startup latency, time-to-first-stream, dropped sessions, and forced-disconnect behavior.

## Scout interpretation

The MCP stateless update is a high-value agent infrastructure finding because it turns resumability, routing, authorization scope, async tool work, and deprecation into explicit protocol contracts. Model routing is a meaningful platform finding because it moves model choice into a versioned gateway/API contract rather than bespoke proxy code. Session-aware load balancing is a high-value realtime-agent reliability finding because it shows production agent infrastructure must measure committed conversational state and lifecycle failures, not just request throughput.
