# Agent Capability Scout — 2026-11-20

Run ID: `2026-11-20-agent-scout-01`  
Status: complete pending routine protected-flow publication  
Compared with: `2026-11-19-agent-scout-01`

## Sources checked

| Source | Result |
| --- | --- |
| OpenAI News | Fetched; one new 8/10 finding. |
| Anthropic News | Fetched; no newly dated scoped item. |
| Google AI Developers | Fetched; one new 7/10 finding; a related monitoring update was already represented by the prior run. |
| Addy Osmani blog | Fetched; unchanged from the prior successful snapshot. |

## Findings

### 8/10 — Resume long-running work from durable state and real events

OpenAI’s Performance Factory turns an alert into a stateful task that agents investigate, humans review, deployments advance, and later agents verify against the production baseline. Its ready-work dispatch and event subscriptions avoid keeping agents active while work waits on an external change. This is broadly valuable because it joins long-running execution, explicit handoff, and verified closure into one operating loop.

### 7/10 — Evaluate authority at the proposed-action boundary

Google’s semantic governance layer evaluates each proposed tool call against user intent and policy before it can execute, records the verdict and rationale, and uses dry-run review before enforcing its probabilistic judge. This is useful because access permissions alone do not establish that a specific action remains in scope.

## Principle-candidate decision

Both candidates were separately evaluated and rejected. The Performance Factory finding reinforces existing Agent Principles for bounded work, durable state, event-driven resumption, handoffs, and verified outcomes. The governance finding reinforces existing Agent Principles for deterministic high-risk boundaries, enforced gates, and inspectable receipts. Neither is additive standalone doctrine, so no principles document changed.

## Next action

Publish this routine scout-state checkpoint through the protected GitHub flow, notify `@chasebridgible` with the PR path, then merge once required checks pass.
