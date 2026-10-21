# Agent Capability Scout — 2026-10-20

Run `2026-10-20-agent-scout-01` checked all four enabled sources against the October 16 checkpoint. No source was blocked.

## Meaningful findings

- **7/10 — Behavior-preserving modernization evals:** OpenAI's low-resource-language work uses shared interfaces and hidden byte-for-byte output checks to test whether coding changes preserve real behavior, rather than merely compiling or appearing plausible. Production deployment still requires expert review and business-rule testing.
- **7/10 — Non-blocking tool delivery:** Google's voice-agent guide treats long-running tool work as an execution plus interaction contract: choose streaming only for meaningful progress, support cancellation and idempotency, and explicitly schedule final delivery at an idle, interrupting, or silent boundary.

## No new broad finding

Anthropic's newer public-benefit-fund announcement is outside the agent-system scope. Addy Osmani's eligible personal-blog index has no item newer than the previous checkpoint.

## Principle gate

Both findings were separately tested against nearby Agent Principles and AI Evals Principles. Neither is standalone and additive: the existing doctrine already covers environment-grounded/replayable evaluation, regression coverage, harness and tool design, long-running action, structured tool contracts, and evidence-based completion. No principles document was changed.

Evidence snapshots and normalized records are in `docs/specs/agent-capability-scout/`. Publication and notification receipts below will record the actual GitHub outcome.
