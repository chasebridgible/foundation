---
name: job-spec-interview
description: Conversationally create or revise job specs for the HTML-native spec system. Use when the user asks to create a job spec, define how a feature or business job should work, turn an idea into a spec, ask questions before writing a spec, or revise product/user/operator intent. If the user asks generically to "create a spec", use this skill to route whether they mean system, capability, job, technical, eval, or existing-spec revision.
---

# Job Spec Interview

Use this skill to turn fuzzy product, operator, or business intent into a strong job spec. A job spec is the contract for a body of work: what the job is, who or what it serves, what process performs it, what states and edge cases exist, what evidence proves it worked, and what would make the result unacceptable.

Technical and eval specs are later phases. Capture downstream notes, but do not let this skill become a technical-spec workflow.

## Routing

If the user asks to "create a spec" without specifying the kind, ask which path they want:

- System spec: whole-system intent, boundaries, capabilities, and evidence loop.
- Capability spec: reliable outcome, constraints, jobs, interfaces, and evidence.
- Job spec: contract for a body of work, including process, actors, context, states, rules, and evidence.
- Technical spec: implementation contract for an existing or planned system.
- Eval spec: verification contract and acceptance mapping.
- Existing spec revision: update a current spec.

If the request is about how something should look, feel, behave, or be performed, default to job spec and begin the interview.

## Operating Rules

- Ask focused batches of questions, usually 4-8 at a time. Avoid one-question-at-a-time unless the user asks for it.
- Maintain a running ledger with three buckets:
  - `Known`: clear facts the user has stated.
  - `Assumed`: reasonable defaults the agent may draft with if labeled.
  - `Unresolved`: decisions that would materially change product intent, user flow, state rules, acceptance, or visible behavior if guessed wrong.
- Do not block on every unknown. Block on material ambiguity.
- When the user is vague, either ask a sharper question or propose a labeled assumption. Do not silently convert guesses into product truth.
- Keep the current job template as the canonical structure for new work.
- Do not write files until the user explicitly approves with language like "build the spec", "write it", "go ahead", or "we're good".
- When building files, follow the repo's `spec-workflow` obligations: read the registry, use the relevant template or scaffold, update metadata and prose together, regenerate the registry, and run `npm run spec:check`.

## Interview Flow

### 1. Frame the Spec

Start by identifying the spec altitude:

- `System spec`: high-level system direction; may later split into capability and job specs.
- `Capability spec`: a reliable outcome the system must be able to produce.
- `Job spec`: a concrete body of work that supports a capability.
- `Flow or interaction job spec`: a detailed user/operator journey, process, or narrow behavior.

Ask for enough context to name the job, target actor or user, core promise, supporting capability, and rough boundary.

### 2. Discover User Intent

Gather:

- Primary user and job-to-be-done.
- Trigger or entry point.
- Desired outcome.
- Non-goals and explicit exclusions.
- What would make the feature feel wrong or unacceptable.

### 3. Shape the Experience

Gather:

- First screen or starting state.
- Layout and hierarchy.
- Primary and secondary actions.
- Copy, tone, labels, and confirmation language where it matters.
- Visual density, interaction style, and platform expectations.
- Responsive behavior when relevant.

Be opinionated about coverage categories, not about the design itself. If the user has no preference, propose a simple default and label it as an assumption.

### 4. Define States and Rules

Cover the states users can observe:

- Empty, loading, ready, partial, success, error, disabled, permission-denied, offline, and completed states when applicable.
- State transitions and what triggers them.
- Validation rules and limits.
- Role, permission, or ownership rules.
- Timing, ordering, animation, notification, or persistence rules when visible to users.

### 5. Capture Edge Cases and UX-Visible Mechanics

Ask about:

- Failure and recovery paths.
- Duplicate actions, retries, cancellation, undo, and stale data.
- What happens if required data is missing.
- Hidden mechanics that affect UX, such as optimistic updates, background sync, moderation, approval, payment, or notifications.

Keep purely internal implementation ideas as downstream handoff notes unless they change what users experience.

### 6. Readiness Gate

Before writing the spec, summarize:

- `Known`: the product facts that will drive the spec.
- `Assumed`: defaults the spec will use unless the user corrects them.
- `Unresolved`: material questions that still need an answer.

Then give a clear gate:

> I can draft the job spec now. The unresolved items above are either material blockers or can be drafted as labeled assumptions. Tell me whether to answer them first or build the spec with assumptions.

If unresolved items would make the feature fundamentally different, recommend answering them before building. If they are minor, offer to proceed with assumptions.

## Build Phase

When the user approves building the spec:

1. Read `docs/specs/index.html` and search for an existing owning spec.
2. If revising, load the relevant job spec sections and preserve its established structure.
3. If creating, use `npm run spec:new -- --type job ...` or copy `docs/specs/templates/job-spec-template.html`.
4. Fill `spec-metadata` before relying on prose:
   - Stable dotted `id`.
   - Accurate `title`, `type`, `status`, `lastUpdated`, `reviewCadence`, and `confidence`.
   - Parent, child, related spec, path, and coverage fields only when known.
5. Write the job prose from the interview ledger:
   - Job intent.
   - Capability supported.
   - Current reality.
   - Process.
   - Context, tools, and interfaces.
   - Evidence and evaluation.
   - Revision target.
6. Include downstream technical/eval handoff notes in the final response. Put them in the spec only when they are visible or part of the job contract.
7. Run `npm run spec:registry` if metadata changed.
8. Run `npm run spec:check`.
9. Report remaining assumptions, unresolved semantic-review risk, and suggested next phase.

## Depth Calibration

Use the same job spec shape at different depth:

- Concept specs may keep interface details lighter and emphasize promise, boundaries, and future child specs.
- Feature specs should describe complete user behavior and main states.
- Flow specs should make sequence, transitions, interruption, and recovery precise.
- Interaction specs should be exact about copy, state, timing, controls, and acceptance.

If a spec starts as a concept but the user supplies enough detail for a feature or flow, upgrade the altitude and say so.
