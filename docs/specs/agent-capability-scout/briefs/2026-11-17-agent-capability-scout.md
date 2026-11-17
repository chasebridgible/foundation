# Agent Capability Scout — 2026-11-17

Run ID: `2026-11-17-agent-scout-01`  
Status: complete pending routine protected-flow publication  
Compared with: `2026-11-14-agent-scout-01`

## Sources checked

| Source | Result |
| --- | --- |
| OpenAI News | Blocked: the public index returned HTTP 403; no finding was inferred. |
| Anthropic News | Fetched; no newly dated in-scope item. |
| Google AI Developers | Fetched; two new in-scope posts dated November 16. |
| Addy Osmani blog | Fetched; no newly dated scoped item. |

## Findings

### 7/10 — Online monitoring needs absence detection and session-level review

Google's anomaly-detection walkthrough instruments agents before monitoring, exercises an intentionally out-of-scope session alongside a benign one, aggregates invocation evidence into a session finding, and alerts on both detections and monitoring absence. Broadly, this is useful as a concrete online-evaluation loop: systems need observable behavior, realistic misuse cases, trace-level investigation, and an alarm when evidence collection itself stops.

### 6/10 — Long-lived agent sessions should separate durable continuity from leased compute

Google's session-runtime design distinguishes the multi-turn session and workspace from the sandbox providing active compute, then parks idle sandboxes and sizes capacity from concurrent working demand. This is a useful operational pattern for long-running systems: preserve resumable state independently of ephemeral execution and select resource policy from measured active behavior, not the number of open sessions.

## Principle-candidate decision

Both findings were separately evaluated and rejected as non-additive. AI Evals Principles already requires online traces to reveal drift and failures and records anomaly queues as online-evaluation evidence. Agent Principles already requires durable state outside the temporary model workspace and restartable long-running action. These sources are strong implementations and calibration evidence, not missing vendor-neutral doctrine; no principles document changed.

## Next action

Publish this routine scout-state checkpoint through the protected GitHub flow, notify `@chasebridgible` through the GitHub App comment, then merge only after required checks pass.

