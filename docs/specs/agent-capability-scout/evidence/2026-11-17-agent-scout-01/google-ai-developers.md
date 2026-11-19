# Google AI Developers evidence — 2026-11-17

- Index source: https://developers.googleblog.com/en/search/?technology_categories=AI
- Retrieved: 2026-11-17T11:04:56Z
- Index hash: `sha256:abb2c9b0929f6b5e8908b0d8a4b58132092a0c231bbb4956a8a7aef8d77c5bb6`
- Result: fetched; two newly indexed in-scope posts dated November 16, 2026.

## Agents are sessions, not requests

- Article: https://developers.googleblog.com/en/agents-are-sessions-not-requests-size-gke-node-pools-for-ai-agent-sessions/
- Article hash: `sha256:94acfda63c885a664216e04f3335f6035fa15e6557e0624022c4514d18fd963d`
- Evidence: The article distinguishes durable multi-turn session state from the isolated sandbox that supplies compute. It recommends parking idle sandboxes while preserving the session and workspace, sizing a warm pool against simultaneous active work rather than all open sessions, and measuring prompt rate before choosing the design. It also notes gateways should add credentials according to sandbox identity rather than storing keys in the agent environment.

## Securing Your Agents: A Hands-On Guide to Agent Anomaly Detection

- Article: https://developers.googleblog.com/en/securing-your-agents-a-hands-on-guide-to-agent-anomaly-detection/
- Article hash: `sha256:0316fca02154cb4fa3af14cfffde356f79299a13e2bbe9290e9cdc80d541f68d`
- Evidence: The guide makes an intentionally overprivileged support agent observable through telemetry, drives a benign and an out-of-scope session separately, inspects a detection that combines individually medium invocations into a high-severity session finding, and routes detected events plus monitoring absence into alerts. It explicitly cautions that model-backed detector probabilities can vary, so the evidence is a production-monitoring pattern rather than a self-certifying verdict.

