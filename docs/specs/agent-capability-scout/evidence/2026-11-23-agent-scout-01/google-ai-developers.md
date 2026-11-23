# Google AI Developers evidence — 2026-11-23

- Index source: https://developers.googleblog.com/en/search/?technology_categories=AI
- Retrieved: 2026-11-23T13:37:07Z
- Result: fetched; two new in-scope posts dated November 19–20, 2026 were reviewed.

## Semantic governance policies

- Article: https://developers.googleblog.com/en/check-what-your-ai-agents-do-before-they-do-it-with-semantic-governance-policies/
- Article date: 2026-11-20
- Evidence: Google describes a policy engine that reviews each proposed tool call against user intent and natural-language business constraints before execution. It differentiates inline semantic judgement from access controls, prompt/response screening, and asynchronous anomaly detection. Because the verdict is model-driven and may vary, the rollout sequence is dry-run logging, verdict review, then enforcement; the article also calls for clear tool descriptions and policy limits that use the same terms.

Scout interpretation: a semantic action gate should be calibrated in shadow mode and layered with deterministic access boundaries, rather than treated as a replacement for either. This is a meaningful operational pattern, but Agent Principles already requires deterministic gates for high-risk boundaries and AI Evals Principles already requires explicit LLM-judge calibration, so it is not an additive standalone principle.

## Multi-turn tool-use training

- Article: https://developers.googleblog.com/en/multi-turn-agentic-reinforcement-learning-with-tunix-and-gemma-4-on-google-tpus/
- Article date: 2026-11-19
- Evidence: The walkthrough represents a multi-turn tool environment with bounded steps, deterministic seeded board state across rollout groups, explicit valid-action parsing, and trajectory-level reward. It is a useful implementation example, but it does not identify a distinct Foundation workflow lesson beyond existing environment-contract and trajectory-evaluation doctrine.
