---
name: business-intake-fill-loop
description: Turn client/business intake sources into reviewed Visible Business Graph substrate. Use when Codex needs to register source artifacts, extract answer rows, identify capabilities/jobs/actors/processes/tools/evidence/metrics/gaps, author or update target-repo HTML specs, generate a local business graph/canvas, or evaluate whether a client intake corpus is source-backed and graph-compatible.
---

# Business Intake Fill Loop

Use this skill after a target repo is connected to Foundation and the user provides intake artifacts such as transcripts, briefs, research notes, SOPs, exports, screenshots, or meeting notes. The goal is a source-backed business graph, not a summary.

Core contracts live in:

- `docs/fundamentals/business-intake.html`
- `docs/fundamentals/visible-business-foundation.html`
- `docs/specs/knowledge-and-data-layer.html`
- `docs/specs/visible-business-graph.html`
- `docs/specs/business-intake-fill-loop.html`
- `docs/specs/business-intake-fill-loop-technical.html`
- `docs/specs/business-intake-fill-loop-eval.html`

Read only the sections needed for the current task.

## Workflow

1. Read target `AGENTS.md`, Foundation `AGENTS.md`, this skill, and the target spec index if it exists.
2. Register every provided source before extracting claims. Preserve source path, source type, captured date, owner or origin, trust level, access boundary, freshness, and related lanes.
3. Create intake answer rows for the business intake lanes. Mark each row `unanswered`, `partial`, `answered`, `conflict`, `stale`, or `reviewed`; do not imply completeness from one source.
4. Extract graph signals from answer rows: capabilities, jobs, processes, actors, tools, evidence, metrics, risks, gaps, and decision rules.
5. Promote reviewed signals into target-owned HTML specs:
   - system spec for the business model and top-level goal
   - capability specs for stable outcomes
   - job specs for recurring work and process detail
   - technical specs for data, integration, automation, or tooling contracts
   - eval specs for acceptance and evidence checks
6. Keep `spec-metadata`, `graph-metadata`, visible prose, source references, and coverage tables aligned.
7. Build the derived graph and canvas from specs. Canvas JSON/HTML is never source of truth.
8. Evaluate the result against the provided sources. Revise if the graph contains unsupported claims, missing source refs, dangling edges, missing jobs, or hidden gaps.

## Source Rules

- Treat provided documents as evidence, not truth by themselves.
- Use stable source IDs such as `source.fastsigns.pilot-brief.2026-05-31`.
- Cite source IDs in visible prose and graph node attributes where material claims are made.
- Preserve contradictions and not-found findings as gaps.
- If a source contains web research, record the research source URLs as source attributes but do not browse unless the user asks for current verification.

## Promotion Rules

- Capabilities name durable business outcomes.
- Jobs name recurring work that makes capabilities real.
- Processes belong primarily in job specs.
- Actors can be people, roles, vendors, partners, customers, software, franchisors, or agents.
- Tools are operational systems, SaaS, spreadsheets, templates, scripts, or substrate artifacts.
- Evidence should include the source, metric, observation, artifact, or review that supports the claim.
- Gaps are first-class outputs. Do not bury unclear ownership, stale data, low adoption, missing metrics, or unresolved decision rules.

## Required Target Artifacts

For a new client/business repo, create or update:

- `AGENTS.md`
- `README.md`
- `docs/specs/index.html`
- source copies or source registry under `docs/sources/` or `docs/intake/`
- target system/capability/job/technical/eval specs under `docs/specs/`
- `docs/visible-business-graph/business-graph.json`
- `docs/visible-business-graph/canvas.html`
- optional `docs/visible-business-graph/expected-graph.json` when a deterministic eval fixture is useful

## Validation

Run from Foundation unless the target repo has equivalent scripts:

```bash
npm run foundation:visible-business-graph:check -- --repo <target-repo>
npm run foundation:visible-business-graph:build -- --repo <target-repo> --out <target-repo>/docs/visible-business-graph/business-graph.json
npm run foundation:visible-business-graph:render -- --graph <target-repo>/docs/visible-business-graph/business-graph.json --out <target-repo>/docs/visible-business-graph/canvas.html
```

When the target includes an expected fixture, also run:

```bash
npm run foundation:visible-business-graph:eval -- --repo <target-repo> --graph <target-repo>/docs/visible-business-graph/business-graph.json --canvas <target-repo>/docs/visible-business-graph/canvas.html --expected <target-repo>/docs/visible-business-graph/expected-graph.json
```

For Foundation skill/spec changes, run:

```bash
npm run spec:registry
npm run spec:check
npm run foundation:visible-business-graph:check -- --repo .
```

## Handoff

Report:

- source registry path and source IDs
- capability/job coverage status
- generated graph and canvas paths
- evaluation result and remaining gaps
- validation commands run
- Foundation skill/spec changes made during the intake
