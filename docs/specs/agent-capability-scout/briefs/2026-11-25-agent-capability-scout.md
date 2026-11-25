# Agent Capability Scout — 2026-11-25

Run ID: `2026-11-25-agent-scout-01`  
Status: complete pending routine protected-flow publication  
Compared with: `2026-11-23-agent-scout-01` recorded scout state

## Sources checked

| Source | Result |
| --- | --- |
| OpenAI News | Fetched; no newly dated scoped item. |
| Anthropic News | Fetched; no newly dated scoped item. |
| Google AI Developers | Fetched; one new 6/10 finding. |
| Addy Osmani blog | Fetched; no newly dated scoped item. |

## Finding

### 6/10 — Keep evidence locators attached to retrieved context

Google's new managed Agent Retrieval flow returns document page ranges or video timestamps with source-file URIs, while managing ingestion updates and unchanged-content handling. This is a useful broadly applicable pattern: claims formed from retrieved context can be reviewed at the exact supporting location rather than relying on the model's recollection or a generic corpus reference.

## Principle-candidate decision

The candidate was separately evaluated and rejected. The lesson is durable enough to log, but is not additive: Agent Principles already require stable links, typed source-backed memory, and provenance, while AI Evals Principles already requires evidence-grounded evaluation. No principles document changed.

## Next action

Publish this routine scout-state checkpoint through the protected GitHub flow, notify `@chasebridgible` with the PR path, then merge only after required checks pass.
