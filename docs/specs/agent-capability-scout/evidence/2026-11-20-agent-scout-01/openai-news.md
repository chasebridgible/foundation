# OpenAI News evidence

- Source ID: `openai-news`
- Retrieved: 2026-11-21T04:58:29Z
- Index URL: https://openai.com/news/
- Index SHA-256: `06d1a76d515ddc75e62be67d7141aad6c4f95454d9c73e05e825209124a49a78`
- New scoped item: [How OpenAI’s Performance Factory keeps ChatGPT fast](https://openai.com/index/how-openai-performance-factory-keeps-chatgpt-fast/) (2026-11-19)

OpenAI describes a recurring regression workflow that opens durable work from an alert, has an agent investigate and record its findings, sends a proposed fix to an engineer for review, and resumes after deployment to verify recovery against baseline. The broader factory keeps task state and configured transitions, dispatches only ready work, and wakes waiting tasks from events such as review comments, failed CI, or deployments rather than leaving an agent running.

Scout interpretation: dependable long-running agent workflows should make state, ownership, wait conditions, and completion verification explicit. Event-driven resumption conserves active execution while preserving a durable handoff through human review and deployment. This is a high-value applied architecture; it reinforces rather than expands Foundation’s existing durable-state, bounded-work, handoff, and verified-outcome doctrine.
