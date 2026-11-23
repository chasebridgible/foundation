# Agent Capability Scout — 2026-11-23

Run ID: `2026-11-23-agent-scout-01`  
Status: complete pending routine protected-flow publication  
Compared with: `2026-11-19-agent-scout-01` and `2026-11-17-agent-scout-01` recorded scout state

## Sources checked

| Source | Result |
| --- | --- |
| OpenAI News | Fetched; one new 8/10 finding. |
| Anthropic News | Fetched; no newly dated scoped item. |
| Google AI Developers | Fetched; one new 7/10 finding. |
| Addy Osmani blog | Fetched; no newly dated scoped item. |

## Findings

### 8/10 — Constrain what an agent can actually do

OpenAI's Codex sandbox design uses user-controlled filesystem and network permission profiles, inherited restrictions for descendant processes, and explicit wrapping for untrusted server commands. This is broadly valuable because authority must be executable at the action surface, but containment still needs to be layered with alignment and other controls for residual risk.

### 7/10 — Calibrate semantic action gates before enforcing them

Google's semantic governance policies judge each proposed tool call against intent and natural-language rules, then recommend dry-run logging and verdict review before enforcement because the semantic verdict is probabilistic. This is useful because semantic checks can complement but must not replace deterministic access control, prompt screening, or monitoring.

## Principle-candidate decision

Both candidates were separately evaluated and rejected. The Codex sandbox finding reinforces existing Agent Principles for harnesses, mechanical invariants, deterministic high-risk boundaries, and authority. The semantic-governance finding reinforces existing AI Evals Principles for LLM-judge calibration, complementary signals, and realistic trace evaluation. Neither provides an additive standalone principle, so no principles document changed.

## Next action

Publish this routine scout-state checkpoint through the protected GitHub flow, notify `@chasebridgible` with the PR path, then merge only after required checks pass.
