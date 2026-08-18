# Source snapshot: google-ai-developers

Run ID: `2026-08-18-agent-scout-01`
Fetched at: `2026-08-18T05:02:38Z`
Source: https://developers.googleblog.com/en/search/?technology_categories=AI
Retrieval status: fetched via Codex web open

## Visible latest items

- `Build zero-trust AI agents with Google's Agent Development Kit` - AI, August 17, 2026.
- `Introducing Credentio: Open Source C++ Library for C2PA Content Credentials from Google` - Mobile, August 13, 2026; already recorded in the 2026-08-14 scout.
- `HeyGen x Google Cloud: Bringing Avatar IV to TPUs` - AI, August 13, 2026; already recorded in the 2026-08-14 scout.
- `Why Go is an Ideal Language for AI-Assisted Software Engineering` - AI, August 11, 2026; already recorded in the 2026-08-12 scout.
- `Mastering Edge AI on Raspberry Pi with LiteRT and Gemma` - Web, August 11, 2026; inspected from listing only and below the scout's broad agent-system threshold.
- `Agent Plugins package your skills, tools, and more` - AI, August 6, 2026; already recorded in the 2026-08-08 scout.

## New item inspected

`Build zero-trust AI agents with Google's Agent Development Kit` uses an autonomous customer-support and returns agent to show why live database access, internal APIs, and dynamic code execution move an agent past ordinary app security. The source says an attacker prompt could push an agent with a generic database connection and unisolated code runner into unauthorized refunds, credential leakage, or host compromise.

The article states that system prompts are soft constraints and that zero-trust agent architecture should enforce hard security guarantees outside the model context. It proposes three layers: hardware-backed cryptographic signatures for every database mutation, kernel-level isolation for dynamically generated code with no network egress and strict resource limits, and deterministic semantic gateways that validate prompts, model outputs, and tool calls against business rules and exfiltration patterns.

The source also ties those boundaries to regression testing and production mapping: security policies should be treated as software contracts in CI/CD, with tests for jailbreak signatures, secret exfiltration, out-of-bounds transactions, and valid updates. The production mapping uses managed identity, key management, confidential compute, gVisor sandboxing, API gateways, Cloud Armor, and VPC Service Controls so compromised agent workloads cannot freely exfiltrate data across the project boundary.

## Scoped assessment

This is a high-value agent-system finding because it independently validates a hard-boundary design pattern for agents that can mutate production state: prompts are not security controls, agent identity must be non-repudiable at write boundaries, generated code needs runtime isolation, semantic policy gates should be deterministic and regression-tested, and production perimeters should limit blast radius. The principle candidate was rejected because Foundation's current Agent Principles already require mechanical invariants, deterministic scaffolding for high-risk boundaries, whole-system harness design, permissions, approval gates, and evidence-backed checks.

## Finding evidence

Created finding `2026-08-18-agent-scout-01-finding-02`.
