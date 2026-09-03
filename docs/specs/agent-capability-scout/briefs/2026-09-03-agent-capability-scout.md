# Agent Capability Scout Brief - 2026-09-03

- Run ID: `2026-09-03-agent-scout-01`
- Started at: `2026-09-03T05:04:18Z`
- Source registry version: `2026-06-05`
- Branch: `codex/agent-capability-scout-20260903-01`
- Status: complete

## Sources checked

- `openai-news`: fetched. New relevant source items included Astra critical-capability safeguards, AI-native operational workflows, and governed healthcare/EHR connectors. Three OpenAI findings were created.
- `anthropic-news`: fetched. New relevant source items included alignment/security practice changes after evaluation incidents, Enterprise Frontier Safeguards, and supporting Fable 5.1/Mythos 5.1 capability and safeguard context. Two Anthropic findings were created.
- `google-ai-developers`: fetched. New relevant source item was the AI Agents Challenge architecture-pattern post. One Google finding was created.
- `addy-osmani-blog`: fetched. The latest personal blog posts remained the August posts already recorded by the August 24 scout. No Addy finding was created.

## Top findings

1. `2026-09-03-agent-scout-01-finding-01` - OpenAI, `Path to Astra: critical capabilities and frontier safeguards`. Interest grade: 10/10. The broadly useful lesson is that critical-capability agents need a stricter operating mode across training, evaluation, access, release, monitoring, incident-informed regression tests, user-visible pauses, and stop authority.
2. `2026-09-03-agent-scout-01-finding-04` - Anthropic, `Improving our alignment and security efforts`. Interest grade: 10/10. The broadly useful lesson is that evaluation and training environments themselves can induce or expose misalignment, so containment, monitoring, reward-hacking detection, rollback, review capacity, and exit criteria are part of agent reliability.
3. `2026-09-03-agent-scout-01-finding-02` - OpenAI, `How AI-native companies turn workflows into operating capability`. Interest grade: 9/10. The useful lesson is that agents become operational capability when workflows have named owners, outcome measures, context, permissions, evidence, stop points, packaging, and review loops.
4. `2026-09-03-agent-scout-01-finding-05` - Anthropic, `Developing Enterprise Frontier Safeguards with our customers`. Interest grade: 9/10. The useful lesson is that frontier-agent monitoring can split customer data custody, automated cross-session detection, and customer-owned human review.
5. `2026-09-03-agent-scout-01-finding-06` - Google, `4 engineering patterns behind the strongest AI Agents Challenge submissions`. Interest grade: 9/10. The useful lesson is that multi-agent systems need bounded tool surfaces, evented concurrency, same-bar fallback, deterministic pre-routing, and access-controlled reasoning services.
6. `2026-09-03-agent-scout-01-finding-03` - OpenAI, `Healthcare organizations can now connect EHR and additional industry data to ChatGPT`. Interest grade: 8/10. The useful lesson is that domain agents need authorized context, authoritative connectors, source-backed answers, domain-expert evals, role controls, and audit boundaries.

Top interest grade: 10.

## Principle candidates

Six candidates were evaluated and rejected as non-additive. No principles-doc patch was made.

- `2026-09-03-agent-scout-01-principle-01`: critical-capability agents should enter stricter operating modes across development, evaluation, access, monitoring, user-visible pauses, and stop authority.
- `2026-09-03-agent-scout-01-principle-02`: operational-agent workflows should start from a consequential value surface with owner, KPI, guardrails, context, tools, permissions, evidence, and stop points.
- `2026-09-03-agent-scout-01-principle-03`: regulated domain agents should bind answers to authorized context, authoritative source connectors, record identifiers, role controls, audit logs, and expert evaluation.
- `2026-09-03-agent-scout-01-principle-04`: training and evaluation environments should treat reward-hacking incentives, impossible tasks, sandbox leakage, standing access, and review-capacity limits as misalignment causes.
- `2026-09-03-agent-scout-01-principle-05`: enterprise frontier-agent monitoring should separate data custody, automated detection, and human review.
- `2026-09-03-agent-scout-01-principle-06`: multi-agent systems should expose bounded reasoning services, coordinate through typed events when latency matters, preserve validation bars across fallback, and route through deterministic checks before expensive inference.

Existing Agent Principles and AI Evals Principles already cover these as whole-harness design, context and memory discipline, process over prose, mechanical invariants, explicit tool and permission contracts, deterministic high-risk gates, human approval, reviewable change flow, whole-system evaluation, environment contracts, trace visibility, reward-hacking resistance, robustness and misuse coverage, incident feedback loops, and risk-based signal choice.

## Artifact paths

- Evidence: `docs/specs/agent-capability-scout/evidence/2026-09-03-agent-scout-01/`
- Source snapshots: `docs/specs/agent-capability-scout/source-snapshots.jsonl`
- Findings: `docs/specs/agent-capability-scout/findings.jsonl`
- Principle candidates: `docs/specs/agent-capability-scout/principle-candidates.jsonl`
- Runs: `docs/specs/agent-capability-scout/runs.jsonl`
- Merge receipts: `docs/specs/agent-capability-scout/merge-receipts.jsonl`
- Notifications: `docs/specs/agent-capability-scout/notifications.jsonl`

## Publish and notification state

- PR: https://github.com/chasebridgible/foundation/pull/130
- Merge state: PR 130 opened with `codex` and `codex-automation` labels; routine scout state with no principles-doc patch. It can merge when required GitHub checks pass.
- Notification state: GitHub App notification sent at https://github.com/chasebridgible/foundation/pull/130#issuecomment-5520804029.
- Requested owner action: @chasebridgible no action needed unless required checks fail or you want to review the rejected principle-candidate decisions.
