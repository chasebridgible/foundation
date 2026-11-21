# Google AI Developers evidence

- Source ID: `google-ai-developers`
- Retrieved: 2026-11-21T04:58:29Z
- Index URL: https://developers.googleblog.com/en/search/?technology_categories=AI
- Index SHA-256: `3161047e0d05efbe9a881784aa0ca5907e2d95b32c4eb7b2882869e55f189f38`
- New scoped item: [Check what your AI agents do before they do it, with Semantic governance policies](https://developers.googleblog.com/en/check-what-your-ai-agents-do-before-they-do-it-with-semantic-governance-policies/) (2026-11-20)

Google describes a gateway that evaluates every proposed tool call before execution against the original user intent and plain-language organization policies. A call must pass both checks; denied calls are replaced before execution, while every verdict and rationale is recorded. The source explicitly distinguishes this inline control from permissions, prompt/response screening, and asynchronous anomaly detection, and recommends dry-run review before enforcement because the judge is probabilistic.

Scout interpretation: authority-sensitive tool use benefits from an external, pre-execution policy boundary with auditable decisions, but probabilistic policy judges need calibrated rollout and defense-in-depth. This reinforces Foundation’s deterministic high-risk gates, explicit approval boundaries, and inspectable receipts rather than adding a standalone principle.

The same index includes a November 20 cross-cloud anomaly-detection item. It extends a monitoring implementation already logged on November 17, so it is not normalized as a separate meaningful change in this run.
