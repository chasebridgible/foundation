---
name: agentic-workflow-design
description: Use when an agent-based workflow, skill, queue, validator, eval, handoff process, or multi-step activity is being created or revised, and the work must be repeatable, context-safe, and quality-gated across agent runs. Use when the task changes how agents choose work, preserve context, evaluate output, revise output, or hand off state.
---

# Agentic Workflow Design

Use this skill to revise the durable process an agent will follow. The output is usually better specs, skills, AGENTS rules, validators, tests, command constraints, or handoff state, not the domain artifact produced by that process.

Owning capability: `foundation.compound-improvements-safely.capability`.
Owning job: `foundation.backfill-specs.job`.

## Stable Principle

Agentic work must be decomposed into durable, reviewable loops whose unit of progress is small enough that quality can be evaluated before the agent moves on.

## Use When

- An agent workflow, skill, queue, validator, eval, handoff process, or multi-step activity is being created or revised.
- Agents need to choose work from durable state rather than chat memory.
- Output quality depends on repeated select, produce, evaluate, revise, and handoff loops.
- Prior runs showed agents skipping steps, summarizing too broadly, closing coarse slices, or producing acceptable-but-not-outstanding output.
- The task changes how agents preserve context, evaluate output, revise output, or hand off state.

Do not use this skill for ordinary code changes, one-off bug fixes, copy edits, or normal spec authoring unless the task changes the agent workflow itself.

## Design Workflow

1. Name the owning Foundation capability and job spec.
2. Identify the artifact, queue, state model, or correctness gate the workflow owns.
3. Choose the atomic unit of progress.
4. Define the exact loop: select next unit, read bounded context, produce one artifact update, check, evaluate, revise to outstanding, record handoff, continue.
5. Define outstanding for this workflow in observable terms.
6. Decide what is enforced by AGENTS, the skill, specs, commands, validators, tests, and report state.
7. Add tests or checks that fail when agents can close coarse, stale, unreviewed, or under-evaluated work.
8. Update the owning job, technical, and eval specs before or alongside skill and validator changes.

## Atomicity Fit

Pick the smallest useful unit, not the smallest imaginable unit.

- Use one-file, one-row, or one-slice loops when agents can skip, summarize too broadly, lose context, or close work without proving quality.
- Use slice-level loops when the slice is already bounded, source-backed, and independently checkable.
- Use suite-wide tests when per-unit test execution adds cost or noise without better quality.
- Allow batch processing only when each item still has traceable output, deterministic validation, and no item can hide behind aggregate success.

State the chosen unit explicitly. Prefer wording like "exactly one Context Pack row is reviewed at a time" over vague instructions like "work through the rows."

## Outstanding Gate

Do not define completion as merely acceptable when the process needs high-quality agent output. Define the outstanding gate as observable criteria.

A unit is outstanding only when:

- deterministic checks pass for the current artifact fingerprint or state version;
- row, slice, or unit-level eval has no blocking findings;
- eval warnings are resolved rather than carried forward as hidden risk;
- no revision targets remain for that unit;
- vague placeholders and generic evidence are gone;
- uncertainty is either resolved or named as a blocker, gap, or human decision;
- the downstream agent can continue without rediscovering core context from source.

If this standard is too expensive for a workflow, lower the workflow scope or atomicity before lowering the quality gate.

## Spec Revision Targets

Revise the durable contracts, not only the local prompt.

- Job spec: intended outcome, atomic unit, agent journey, states, handoff gate.
- Technical spec: artifacts, schemas, commands, validators, freshness, failure modes.
- Eval spec: outstanding criteria, row/unit receipts, revision target semantics, anti-shortcut cases.
- Skill: exact agent procedure, context boundary, exit criteria.
- AGENTS.md: short routing rule or invariant only when broadly applicable.
- Tests/validators: proof that shortcuts, stale state, and under-reviewed work fail.

## Handoff

Report:

- owning capability and job spec;
- atomic unit chosen and why;
- loop definition;
- outstanding gate;
- enforcement locations changed;
- tests or checks added;
- remaining workflow risks or calibration needs.
