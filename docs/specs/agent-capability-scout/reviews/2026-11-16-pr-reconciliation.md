# Agent principles PR reconciliation — November 16, 2026

This review reconciles Foundation's accumulated agent research with its canonical principles. It preserves useful research, incorporates five refined doctrine changes, identifies a duplicate proposal, and makes the difference between historical evidence, accepted content, and merged policy explicit.

The owning workflow is Foundation's [Agent Capability Scout](../../foundation-agent-capability-scout.html). Shared principles remain in Foundation; this review does not change Orderly Systems product contracts or authorize production actions.

## Result and document links

Before this consolidation, the repository had **191 PRs: 181 merged, 10 open, and none closed without merging**. Nine open PRs belonged to the scout research backlog. All nine had merge conflicts against current main. The tenth, [#176](https://github.com/chasebridgible/foundation/pull/176), is an incomplete Texas hydrant research draft and is outside this principles reconciliation.

The [complete PR inventory](./2026-11-16-pr-inventory.json) records every PR and its reviewed head. Review depth was complete patches for the nine scout PRs, complete path history for the two principles documents, and scope assessment of the unrelated draft; this is not a full implementation audit of every unrelated historical PR.

The consolidated branch contains **73 runs, 206 findings, 165 principle candidates, and 292 source snapshots**. Its candidate dispositions are **eight accepted and 157 rejected**: three accepted principles already existed on main, and five are refined additions or clarifications in this proposal. These counts describe the reconciled records, not 165 changes to doctrine.

| Document | Current merged version | Reconciled proposal |
| --- | --- | --- |
| Agent Principles | [Main file](https://github.com/chasebridgible/foundation/blob/main/docs/principles/agent-principles.html) | [Proposed file](https://github.com/chasebridgible/foundation/blob/codex/agent-principles-reconciliation-20261116-01/docs/principles/agent-principles.html) |
| AI Evals Principles | [Main file](https://github.com/chasebridgible/foundation/blob/main/docs/principles/ai-evals-principles.html) | [Proposed file](https://github.com/chasebridgible/foundation/blob/codex/agent-principles-reconciliation-20261116-01/docs/principles/ai-evals-principles.html) |

**Approval limitation:** a formal GitHub `APPROVE` review was attempted on #65 and failed with HTTP 422 because the authenticated account, `chasebridgible`, also authored the PR. All nine research PRs have that author. Content approval in this report therefore does not mean GitHub has recorded an approving review. Review comments record the dispositions; the consolidation is submitted as a new PR. No PR is merged or closed as part of this reconciliation, and the original PRs remain open.

## Disposition of every open research PR

| PR | Decision | What the consolidation preserves or changes |
| --- | --- | --- |
| [#47 — Run agent capability scout](https://github.com/chasebridgible/foundation/pull/47) | Preserve research; reject duplicate doctrine addition | Review-throughput guidance is already on main through #51. Preserve the evidence and run history without adding the same principle twice. Convert its historical HTML brief to Markdown so it fits the existing checker contract; do not change checker scripts to accommodate a one-off format. |
| [#48 — Run agent capability scout](https://github.com/chasebridgible/foundation/pull/48) | Accept corrected feedback-triage principle | Preserve the research, refine the production-feedback rule, and resolve its run-ID collision using the provenance mapping below. |
| [#49 — Record agent capability scout run 03](https://github.com/chasebridgible/foundation/pull/49) | Content approved as archival research | Preserve the checkpoint, evidence, findings, and rejected candidate. Useful evidence does not require another principles paragraph. |
| [#65 — Run agent capability scout for June 12](https://github.com/chasebridgible/foundation/pull/65) | Content approved as archival research | Preserve the no-new-findings checkpoint and explicit source-access failure. A blocked fetch is not evidence that nothing changed. |
| [#66 — Run agent capability scout for June 13](https://github.com/chasebridgible/foundation/pull/66) | Content approved as archival research | Preserve the access-governance finding, rejected candidate, and blocked-source record. It does not introduce a new durable rule. |
| [#74 — Run agent capability scout for June 17](https://github.com/chasebridgible/foundation/pull/74) | Accept refined simulation guidance | Require representative deployment simulation while retaining targeted tests for rare, high-consequence failures. |
| [#179 — Record November 1 capability scout](https://github.com/chasebridgible/foundation/pull/179) | Accept after narrowing | Retain the monitoring insight; narrow the broad evaluation prohibition to the specific risk of rewarding concealment or monitor evasion. |
| [#184 — Record November 7 capability scout](https://github.com/chasebridgible/foundation/pull/184) | Accept as a clarification | Make the behavioral effect of ambient repository context explicit within existing freshness/context doctrine. Maintenance must stay within authorized scope. |
| [#189 — Record November 12 capability scout](https://github.com/chasebridgible/foundation/pull/189) | Accept refined enforcement rule | Require unavoidable controls outside the agent's ability to bypass or modify. Deny the protected action when authorization cannot be established, without treating that as a reason to stop unrelated authorized work. |

These decisions assess the content after reconciliation. They do not certify the conflicted original branches as ready to merge independently. The consolidated PR is the coherent integration path.

## The five principle changes

### 1. Classify production feedback before promoting it into agent work

The accepted lesson from #48 is that feedback needs triage before it becomes an instruction to change the system. A report can reveal a defect, an unclear requirement, a preference, missing context, a policy issue, or an evaluation gap. Those cases have different owners and remedies.

The revised rule connects feedback to evidence, the intended outcome, and the smallest responsible layer before creating implementation work. Prioritization considers severity and recurrence without waiting for a serious failure to repeat. A repeatable failure should become a regression case where appropriate. A preference or ambiguous request should not silently become global doctrine. This makes the existing self-improvement loop actionable while preserving its review boundary.

### 2. Match deployment simulations to real operating conditions, and test rare risks separately

#74 adds specificity to existing environment and distributional-evaluation principles. Simulation should represent relevant users, tasks, tools, permissions, state, and failure conditions closely enough to support the deployment decision being made. Results should state the assumptions and gaps that limit generalization.

Representative sampling alone can miss rare but severe failures. The refined version keeps targeted adversarial and high-consequence cases alongside ordinary workload evaluation. A simulation's success rate therefore supports a bounded claim; it does not replace stress testing or prove safety in every live environment.

### 3. Evaluate monitoring without rewarding concealment

#179's useful contribution concerns the incentives created by monitoring and evaluation. A system can appear better monitored because unwanted conduct becomes harder to detect, rather than because the conduct improves.

The narrower rule calls for independent behavioral evidence and explicit checks for evasion or concealment. It avoids a blanket prohibition on using monitoring information in evaluation or improvement. Monitoring, regression tests, and training can still inform each other; acceptance must distinguish improved conduct from reduced visibility. This belongs in AI Evals Principles because the primary issue is what evidence warrants trust.

### 4. Treat ambient context as a behavioral control surface

#184 makes an existing freshness concern more concrete. Repository notes, examples, defaults, stale instructions, and nearby artifacts can steer an agent even when nobody explicitly asks it to follow them. Context maintenance therefore affects behavior, not just documentation quality.

The accepted clarification asks agents to notice conflicting or stale context and handle it through authorized maintenance or an explicit follow-up. It does not grant permission to clean up every adjacent file or expand the mission. The November 8 candidate's historical rejection remains in the record: that run correctly recognized overlap with existing doctrine. This review accepts a narrower clarification without rewriting the history of that judgment.

### 5. Enforce high-risk authority at unavoidable execution points

#189 strengthens the existing requirement for mechanical invariants and deterministic high-risk gates. Controls must sit where a consequential action actually executes, check the relevant authority there, and remain outside the acting agent's ability to disable or bypass them.

Authority must be re-checked as work proceeds, and revocation must be honored. When required authorization is missing or cannot be verified, the protected action is denied. That failure does not automatically invalidate independent, authorized work. This wording preserves useful autonomy while giving security-sensitive actions a concrete enforcement boundary instead of relying on a prompt's recommendation.

## What had already changed on main

The history audit inspected all 28 commits touching `docs/principles`, the individual Agent Principles and AI Evals histories, and the substantive PR patches. Agent Principles has six main-path changes; AI Evals has eight. The latest merged changes to those files were #77 on June 20 and #80 on June 23 respectively. Later merged scout activity mostly accumulated corroborating evidence and rejected non-additive proposals.

| Merged PR | Lasting change |
| --- | --- |
| [#11](https://github.com/chasebridgible/foundation/pull/11) | Established AI Evals Principles: written intent and risk, observed failures, outcomes and traces, complementary signals, independent judgment, calibrated judges, representative suites, reproducible runs, robustness, production feedback, failure datasets, and controlled experiments. |
| [#12](https://github.com/chasebridgible/foundation/pull/12) | Expanded the evaluation set from 17 to 20 principles. Added whole-system identity, the distinction between capability and reliability, and the environment as part of the evaluated system. Strengthened uncertainty, resource metrics, run settings, and reward-hacking resistance. |
| [#44](https://github.com/chasebridgible/foundation/pull/44) | Created Agent Principles as the broad operating doctrine and positioned AI Evals as its specialist layer. Covered harnesses, executable procedures, context discipline, durable memory, bounded progress, restartability, roles, authority, evidence, and handoffs. |
| [#51](https://github.com/chasebridgible/foundation/pull/51) | Added concurrency constrained by accountable review capacity. Queues, backpressure, smaller batches, and acceptance gates prevent agent production from overwhelming review. |
| [#56](https://github.com/chasebridgible/foundation/pull/56) | Added preservation of load-bearing intent: goals, constraints, rationale, decisions, and non-negotiables must survive cold starts alongside task state. |
| [#67](https://github.com/chasebridgible/foundation/pull/67) | Added useful bounded progress during committed work time and separation of deliverables from evidence, rejections, routing, coverage, and handoff artifacts. |
| [#73](https://github.com/chasebridgible/foundation/pull/73) | Introduced shift-clock terminology and an accountability scoreboard for findings, verification, source checks, and cleanup. |
| [#77](https://github.com/chasebridgible/foundation/pull/77) | Added work ethic: explicit completion standards, initiative within the mission, early blocker communication, repeatable process, evidence, responsible follow-through, attention, and feedback. Replaced punitive clock/scoreboard language with useful corrective signals. |
| [#80](https://github.com/chasebridgible/foundation/pull/80) | Added evaluation of proactive insight selection: what the agent notices, its evidence, and whether notifying, asking, drafting, or remaining silent is appropriate. |

Adjacent changes matter for understanding the architecture. [#18](https://github.com/chasebridgible/foundation/pull/18) added reversible experiments and causal measurement to Business Principles. [#31](https://github.com/chasebridgible/foundation/pull/31) aligned related doctrine around Intent → Context → Execution → Evidence → Evaluation → Revision. AI Evals edits in #30, #31, #33, and #40 were terminology, links, or navigation, rather than additional substantive eval principles.

The three scout principles already incorporated through #51, #56, and #80 still appeared as `proposed` in the original main candidate ledger. This reconciliation records their accepted disposition so a reader does not mistake them for unresolved doctrine proposals.

## Evidence integrity and integration repairs

PR #48 reused `2026-06-05-agent-scout-01`, colliding with #47. Its canonical run and cross-references are mapped to **`2026-06-05-agent-scout-02`**. Raw evidence bytes remain unchanged, including historical labels containing the old run ID. The provenance mapping explains that discrepancy; it is not an attempt to pretend the original capture used the new identity.

All nine research checkpoints are reconciled against current main rather than merged as stale snapshots. Original observations, blocked-source outcomes, and historical rejected candidates remain distinguishable from this review's acceptance decisions. The #47 brief conversion fits the existing Markdown artifact contract without broadening the validator or spec registry for historical HTML. CI gains the existing scout check so future changes validate research-state integrity alongside the existing spec checks.

## Recommended reading

Start with these sources for the five changes accepted here. Source links were checked during this review. Vendor accounts substantiate the described mechanisms, not independent proof of every performance claim.

- **[Building self-improving tax agents with Codex — OpenAI](https://openai.com/index/building-self-improving-tax-agents-with-codex/).** The practical feedback loop behind #48: classify practitioner corrections, create eval targets and bounded tasks, run regression checks, and review the change.
- **[Predicting model behavior before release by simulating deployment — OpenAI](https://openai.com/index/deployment-simulation/).** The source for #74's realistic traces/tools/state rule. Read the sampling, distribution-shift, and tail-risk limitations with the method.
- **[How we detect frontier model misalignment — OpenAI](https://openai.com/index/how-we-detect-frontier-model-misalignment/).** The source for #179: layered monitoring, independent evidence, replay, intervention, and evasion tests. Especially useful for understanding incentives to conceal evidence.
- **[Agent Distraction — Google](https://developers.googleblog.com/en/agent-distraction/).** The source for #184 and the most immediately actionable repo-maintenance reading. Stale comments and instructions can cause scope drift; cleanup still follows current intent and review.
- **[Control Room — OpenAI](https://openai.com/index/control-room/).** The source for #189's enforceable stop/revocation architecture. Its inference-stop guarantee is distinct from terminating an entire workload process.

For the wider operating model, read the first two below, then choose the implementation examples relevant to current work. Scout interest grades describe usefulness to Foundation; they are not independent scientific confidence scores.

1. **[The Orchestration Tax — Addy Osmani](https://addyosmani.com/blog/orchestration-tax/).** The clearest explanation of this backlog's underlying constraint: launching agents is cheap, but understanding and accepting their work consumes scarce review capacity. Direct source for #51.
2. **[The Intent Debt — Addy Osmani](https://addyosmani.com/blog/intent-debt/).** Explains why code cannot reliably reconstruct the original reasons for decisions. Useful for better specs, decision records, and agent onboarding; direct source for #56.
3. **[The New Software Lifecycle — Addy Osmani](https://addyosmani.com/blog/new-sdlc-vibe-coding/).** A broad account of harness design, static versus dynamic context, and verification. Recorded in #75 as valuable reinforcement of existing doctrine; its model/harness percentage is framing, not a universal measured law.
4. **[Measuring What Matters with Jules — Google](https://developers.googleblog.com/en/measuring-what-matters-with-jules/).** Direct source for #80. Shows how historical bug clusters and pre-fix repositories can evaluate proactive insight selection. The reported benchmark results are preliminary.
5. **[Agentic Code Review — Addy Osmani](https://addyosmani.com/blog/agentic-code-review/).** Practical advice for evidence requirements, small changes, risk-based scrutiny, and human accountability. Recorded in #68; its cited industry statistics include vendor research and deserve that context.
6. **[Agentic Autonomy Levels — Addy Osmani](https://addyosmani.com/blog/agentic-autonomy-levels/).** Separates one agent's scope of action from orchestration across many agents. Useful for choosing autonomy based on risk, reversibility, verification, and accepted outcomes. Recorded in #86.
7. **[The Outer Loop, Insights First — Google AQuA](https://developers.googleblog.com/en/the-outer-loop-insights-first-an-ambient-quality-agent-that-diagnoses-your-production-agent/).** A concrete self-improvement workflow: sample production traces, cluster failures, verify hypotheses, diagnose against deployed source, and feed fixes into regression work. Recorded in #160; implementation evidence for existing principles.
8. **[Evaluating AI agents: moving past the vibe check — Google](https://developers.googleblog.com/en/evaluating-ai-agents-moving-past-the-vibe-check/).** A practical progression from critical user journeys to inspected traces, calibrated checks, stable comparison datasets, and cost/latency regression gates. Recorded in #168.
9. **[Optimizing a 200,000-line Python codebase overnight — Google](https://developers.googleblog.com/optimizing-a-200000-line-python-codebase-overnight-with-gemini-4-argon/).** A long-run case study combining progressive skills, persistent goals, independent benchmarks, tests, and a review boundary. Maintainers accepted two proposals and rejected four. Recorded in #166; a useful example rather than a guarantee about unattended work.

## Validation and remaining boundary

Local validation passed after the initially unavailable environment recovered:

- `npm run foundation:agent-capability-scout:check`: 22 pass, zero warnings or failures.
- `npm run spec:check`: 116 specs; registry, capability-language, graph, generated-artifact, and self-map checks passed.
- `git diff --check`: passed.
- All 102 imported historical JSONL rows are accounted for, with only the documented identity, brief-path, candidate-decision, and receipt corrections.
- All 37 imported raw evidence files match their originating PR bytes; all 36 imported source-snapshot SHA-256 values match. The extra evidence file is a notification artifact, not a source snapshot.
- Candidate/finding/source references, artifact paths, four-source coverage per imported run, unique identities, and preservation of existing main records passed independent checks.

The spec tools derive repository identity from the checkout directory name. Validation ran from an isolated directory named `foundation`; the registry was not rewritten for a temporary worktree name. The final GitHub CI result is recorded on the consolidation PR.

The audit also found **eight pre-existing snapshot-hash mismatches** on main: all four sources for the June 19 run and all four for June 23. Their archived bytes match the original main blobs, so this consolidation did not introduce the discrepancy. Recorded and actual hashes are preserved in the [baseline integrity audit](./2026-11-16-baseline-hash-audit.json). Historical evidence and hash receipts remain unchanged; their integrity claim requires investigation, not silent rehashing. This does not affect the verified imports.

The proposed principles become merged Foundation doctrine only after the consolidation PR passes the protected change flow. Until then, the main-file links above remain the current merged source of truth, and the branch links expose the reviewable result.
