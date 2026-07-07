# Source snapshot: google-ai-developers

Run ID: `2026-07-07-agent-scout-01`
Fetched at: `2026-07-07T17:49:32Z`
Source URL: https://developers.googleblog.com/en/search/?technology_categories=AI
Retrieval status: fetched
Source scope: Google AI developer, agent, model, tool, eval, and platform changes relevant to improving agent systems.

## Observed current source state

The Google Developers AI search page was reachable and showed these relevant recent items:

- `We terminated a TPU mid-training and it recovered in seconds: Introduction to elastic training with MaxText` - Jul 6, 2026.
- `Why we built ADK 2.0` - Jul 1, 2026.
- `ML Development in VS Code with Google Cloud Power: Workbench Extension Now Available` - Jul 1, 2026.
- `Build agentic full-stack apps with Genkit` - Jul 1, 2026.
- `Driving the Agent Quality Flywheel from Your Coding Agent` - Jun 30, 2026.
- `Build reliable multi-agent applications with ADK Go 2.0...` - Jun 30, 2026.

The MaxText elastic training article is not primarily an agent-system item, but it has an adjacent reliability lesson: long-running infrastructure work benefits from catchable failures, a live controller, committed checkpoints, and in-place recovery instead of full restart. It was not recorded as a finding because the source scope is agent systems and the lesson is infrastructure-specific.

The ADK 2.0 article argues that production agents should not use LLMs for all routing, scheduling, and error handling. It separates deterministic workflow control from LLM reasoning, uses graph workflows for predefined business logic, bounds context passed to specialized agent nodes, and routes strict compliance or predictable failure states through code.

The Genkit Agents article packages full-stack agent plumbing: server- or client-managed state, snapshots, branching, streamed custom state and artifacts, shared wire protocol, interruptible tools with validated resume payloads, detached work that outlives a request, specialist delegation, session artifact strategies, and a developer UI for inspecting runs.

## Scout interpretation

Two Google findings were recorded:

1. ADK 2.0 reinforces a production pattern: deterministic control owns predictable business process execution while LLM agents are reserved for genuinely ambiguous nodes.
2. Genkit's Agents API gives a concrete full-stack shape for agent state, resumability, human approval, long-running detached turns, artifacts, streamed UI state, and specialist delegation.
