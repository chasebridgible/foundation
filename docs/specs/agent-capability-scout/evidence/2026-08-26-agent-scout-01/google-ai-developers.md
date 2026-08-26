# Google AI Developers Evidence - 2026-08-26 Agent Capability Scout

- Run ID: `2026-08-26-agent-scout-01`
- Source ID: `google-ai-developers`
- Source URL: https://developers.googleblog.com/en/search/?technology_categories=AI
- Retrieved at: `2026-08-26T17:21:46Z`
- Retrieval status: fetched

## Observed source state

The Google Developers Blog AI search page fetched successfully. The latest visible AI results included:

- `Enterprise-Grade Precision for Long-Context Multimodal Embedding Inference on Cloud TPU` dated August 26, 2026.
- `How to Evaluate Live & Voice Agents in ADK` dated August 24, 2026.
- `Build zero-trust AI agents with Google's Agent Development Kit` dated August 17, 2026, already recorded by the August 18 scout.

## Finding evidence

`How to Evaluate Live & Voice Agents in ADK` moves live voice agents from demo behavior to repeatable eval evidence. The post uses graph-based live agents, a persistent audio stream, carried-forward session state and conversation history, scripted or simulated users, personas, explicit scenario goals, turn caps, synthesized audio turns, end-to-end rubrics, thresholds, judge models, transcript inspection in ADK Web, and CLI/CI execution. It also states that voice-agent correctness depends on timing, recovery, context retention, tool firing, and multi-turn behavior, not only individual response text.

`Enterprise-Grade Precision for Long-Context Multimodal Embedding Inference on Cloud TPU` is primarily AI infrastructure, but it has a lower-grade agent-system lesson for retrieval-heavy agents: serving long-context multimodal embeddings in production requires elastic capacity, fallback pools, pre-warmed compilation caches, request-state survival across chunked prefill, golden-reference parity thresholds, reproducible recipes, and measurable cross-hardware precision.

## Diff against prior successful run

The prior successful scout run, `2026-08-24-agent-scout-01`, did not include either Google item. The August 24 live/voice ADK eval article and the August 26 long-context embedding article were normalized as findings because both were previously unrecorded and relevant to agent evaluation or retrieval infrastructure.

## Principle gate

Two Google findings were evaluated as durable but non-additive. Existing AI Evals Principles already cover whole-system identity, environment contracts, traces when conduct matters, representative suites, online/offline loops, judge calibration, reproducibility, signal composition, and risk-based signal choice. Existing Agent Principles already cover context continuity, deterministic scaffolding, durable artifacts, tool contracts, and judging progress by evidence. No principles-doc patch was made.
