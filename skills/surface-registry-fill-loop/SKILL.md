---
name: surface-registry-fill-loop
description: Fill or resume the Foundation Surface Registry layer by reading one complete Surface Registry-eligible upstream file, marking that file's canonical surface rows, checking, and repeating until eligible File Registry rows are covered.
---

# Surface Registry Fill Loop

Use this skill when a target repo is creating, refreshing, revising, checking, evaluating, or resuming a Foundation Surface Registry.

## Source Of Truth

Load only the context needed for the current step:

- target repo `AGENTS.md`
- Foundation `AGENTS.md`
- active target report and run log named by the target repo
- current target `file-registry-<run-id>.jsonl`
- current target `surface-registry-<run-id>.jsonl`
- Surface Registry specs when changing the process/schema or resolving checker/eval ambiguity:
  - `docs/specs/foundation-backfill-surface-registry.html`
  - `docs/specs/foundation-backfill-surface-registry-technical.html`
  - `docs/specs/foundation-backfill-surface-registry-test.html`

## Commands

- Initialize: `npm run foundation:surface-registry:init -- --repo <repo> --run-id <run-id>`
- Get next target: `npm run foundation:surface-registry:fill -- --repo <repo> --run-id <run-id> --next`
- Mark one file: `npm run foundation:surface-registry:fill -- --repo <repo> --run-id <run-id> --path <repo-relative-file> --surfaces-json '<json-array>'`
- Check during work: `npm run foundation:surface-registry:check -- --repo <repo> --run-id <run-id> --phase batch`
- Check handoff: `npm run foundation:surface-registry:check -- --repo <repo> --run-id <run-id> --phase handoff`
- Evaluate: `npm run foundation:surface-registry:eval -- --repo <repo> --run-id <run-id>`
- Refresh changed upstream files: `npm run foundation:surface-registry:refresh -- --repo <repo> --run-id <run-id>`
- Record report state: `npm run foundation:surface-registry:report -- --repo <repo> --run-id <run-id> --report <active-report>`

## Required Loop

1. Use `--next` to select the next `pending` or `needs-evidence` upstream file.
2. Read the complete source file named by the target.
3. Decide every surface exposed by or directly depended on by that one file.
4. Immediately mark that same file with `--path` and inline `--surfaces-json`.
5. Do not read ahead into other pending files before marking this file. The atomic unit is: select one file, read one file, mark one file, then repeat.
6. Run the batch checker often enough that structure failures are fixed before many more files are marked.
7. Repeat until no pending or failed eligible rows remain.
8. Run handoff check, eval, and report once the layer is terminal.

## Row Decisions

File Registry is exhaustive; Surface Registry is not. The Surface Registry queue is limited to files that can plausibly define, expose, configure, or materially document capabilities:

- code entry points and code modules: routes, services, scripts, migrations, models, components
- runtime/operator definition: package manifests, deployment workflows, infrastructure, runtime configuration
- active product/spec documentation that defines intended behavior

The File Registry row is a hint, not the authority. For eligible rows, the full file read decides the Surface Registry row.

- Use multiple rows when one file exposes multiple durable surfaces, such as several API endpoints, package scripts, tables, views, commands, jobs, or direct external dependencies.
- Use `support-classification` when the full file read shows no route, screen, API, command, job, table, workflow, infra resource, active behavior doc, or direct external dependency for this layer.
- Direct external dependencies are runtime, operator, data, or deployment dependencies used by the file.
- SQL migrations split by durable table or view when the file creates or changes more than one object.
- Route files split by durable endpoint or handler when the file exposes more than one API or route boundary. Do not collapse a route family into one row merely because the handlers live in one file.
- Infrastructure files split when resources represent distinct durable runtime, network, identity, storage, job, or deployment surfaces. Keep one row only when resources are tightly coupled into one boundary.
- Internal services are not automatically `api`/`exposed`: mark dormant, legacy, helper, or route-internal modules as `support-classification` unless the file itself exposes a durable API/tool/client boundary or direct external dependency.
- Helpers, UI primitives, type-only files, constants, local utilities, and inert evidence artifacts usually resolve to support or remain skipped by scope.
- Evidence stays short but concrete: name the handlers, resources, tables, commands, dependencies, or rules seen in the full-file read. Do not use generic evidence text that only says the file was read.

## Surface JSON Shape

`--surfaces-json` is an array of row specs for the one file just read. Common fields: `surfaceKind`, `label`, `exposedObject`, `operation`, `consumerHints`, `confidence`, and `evidence`. Add `actorHints`, `stateHints`, `ruleHints`, `dataObjects`, `externalSystems`, or `supportReason` when the file makes them clear.

```json
[
  {
    "surfaceKind": "api",
    "label": "GET /dashboard API",
    "exposedObject": "GET /dashboard",
    "operation": "returns dashboard payload",
    "consumerHints": ["client", "service"],
    "confidence": "high",
    "evidence": "Full file read shows fastify.get('/dashboard') returns the dashboard payload."
  }
]
```

The fill command writes stable row IDs, upstream IDs, upstream hashes, and `agent-read-full-file` evidence. It replaces all prior Surface Registry rows for that one upstream file, so include every surface for that file in the same mark command.
