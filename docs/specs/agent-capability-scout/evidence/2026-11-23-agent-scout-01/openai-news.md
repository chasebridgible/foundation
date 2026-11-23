# OpenAI News evidence — 2026-11-23

- Index source: https://openai.com/news/
- Retrieved: 2026-11-23T13:37:07Z
- Result: fetched; one new in-scope engineering article dated November 18, 2026.

## Inside the Codex sandbox

- Article: https://openai.com/index/inside-the-codex-sandbox/
- Article date: 2026-11-18
- Evidence: OpenAI describes a defense-in-depth command-execution design in which a user-selected permission profile constrains filesystem and network access. The workspace default permits source edits while keeping Git and Codex configuration read-only and disables direct network access. The article stresses that sandboxing limits a large class of harmful behavior but does not replace model alignment or other controls; it also shows that descendants inherit the sandbox constraints and that untrusted MCP server commands should be explicitly wrapped rather than assumed safe.

Scout interpretation: useful reinforcement that agent authority needs executable, inherited capability boundaries, with separate layers for intent alignment and containment. Foundation already requires deterministic high-risk gates, an inspectable whole-system harness, and explicit permissions, so this is not an additive standalone principle.
