# Google AI Developers Evidence - 2026-09-13 Agent Capability Scout

- Run ID: `2026-09-13-agent-scout-01`
- Source ID: `google-ai-developers`
- Source URL: https://developers.googleblog.com/en/search/?technology_categories=AI
- Retrieved at: `2026-09-13T07:56:58Z`
- Retrieval status: fetched

## Retrieval notes

The Google Developers Blog AI-filtered search page fetched successfully through direct terminal retrieval. The new Sep 11 item detail page also fetched successfully.

## Observed source state

New item visible above the September 11 scout baseline:

- `Autonomous LLM post-training with Tunix on TPUs`, Sep 11, 2026, https://developers.googleblog.com/en/autonomous-llm-post-training-with-tunix-on-tpus/

Previously recorded visible items included:

- `Announcing ADK for Kotlin 1.0: Building Production-Ready AI Agents in Kotlin, Android, and Beyond`, Sep 9, 2026.
- `The Anatomy of Harness Engineering: How to Evaluate, Iterate, and Guard AI Coding Agents`, Sep 9, 2026.
- `Driving Developer Excellence: Inside the Program Sprints`, Sep 4, 2026.
- `4 engineering patterns behind the strongest AI Agents Challenge submissions`, Sep 2, 2026.

## Finding evidence

`Autonomous LLM post-training with Tunix on TPUs` is a meaningful new finding. The post describes turning manual LLM post-training into an autonomous research loop: a human writes a Markdown specification that defines the loop, boundary conditions, evaluation criteria, and constraints; a clean self-contained training script gives the agent a controlled execution target; the agent modifies the script, launches training jobs, monitors losses and benchmark metrics, keeps winning commits, reverts regressions, and records results.

The FunctionGemma SFT case used bounded allowed changes such as LoRA settings, optimizer, learning-rate schedule, batch size, gradient clipping, and seeds while disallowing dataset, epoch, and model-architecture changes. The RL case ran about forty experiments over two to three days on Cloud TPU and optimized a simplified objective metric combining numerical and format accuracy.

The durable lesson is that automated model-improvement agents need an explicit experiment arena rather than open-ended autonomy: human-owned objectives and constraints, narrow editable surfaces, objective metrics, commit/revert semantics, durable result logs, accelerator/runtime observability, and bounded multi-day progress. This is broadly useful for Foundation because it connects long-running agent operation, eval contracts, artifact discipline, and self-improvement loops in one concrete harness.

## Diff against prior successful run

The September 11 scout recorded Google findings for the Sep 9 harness-engineering and ADK Kotlin items. This run saw the newer Sep 11 Tunix autonomous post-training item and created one Google finding.

## Principle gate

The Tunix lesson was evaluated for principle promotion and rejected as non-additive. It is durable, but existing Agent Principles already cover whole-agent-system engineering, workflow-packaged skills, explicit artifacts, durable memory, bounded long-running units, evidence-based progress, tools that constrain correct work, human authority, and reviewable change flow. Existing AI Evals Principles already cover intent/risk contracts, observed behavior, environment contracts, traces, deterministic checks, failure-derived datasets, experiments against known data, and distributional reliability.
