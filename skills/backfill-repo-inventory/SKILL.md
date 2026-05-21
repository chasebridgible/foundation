---
name: backfill-repo-inventory
description: Build and maintain the evidence inventory and coverage ledger for a Foundation repo backfill. Use inside Backfill Specs when mapping apps, routes, screens, components, APIs, schemas, services, workers, jobs, integrations, permissions, tests, docs, and infrastructure before drafting or completing specs.
---

# Backfill Repo Inventory

Use this skill inside `backfill-specs` before drafting and whenever a backfill resumes.

## Purpose

Create durable state that shows what exists in the repo and how each item is covered by specs. The inventory prevents broad domain summaries from being mistaken for complete backfill coverage.

The inventory also seeds the durable slice queue. A cold agent should be able to resume from the report without reconstructing repo state from memory.

## Inventory Scope

Inventory the repo by evidence category:

- apps, packages, deployable units, and major source roots
- routes, pages, screens, navigation, commands, and public entry points
- user-facing components, flows, forms, menus, empty states, and permission surfaces
- APIs, endpoint groups, controllers, resource handlers, and external contracts
- database tables, models, migrations, schemas, fixtures, and seed data
- services, workers, jobs, queues, schedulers, webhooks, and event handlers
- auth, roles, permissions, ownership rules, billing/entitlement boundaries, and audit paths
- integrations, providers, SDKs, import/export paths, AI/model calls, and third-party systems
- infrastructure, deployment, environment, observability, and operational scripts
- tests, evals, snapshots, generated artifacts, docs, plans, diagrams, and tickets

## Ledger Fields

Record inventory as a table in the dated backfill report. If the table becomes too large, create `docs/specs/backfill/repo-inventory-YYYYMMDD-NN.html` and link it from the report.

Each item needs:

- stable inventory ID
- category and label
- evidence path or source
- owning or proposed spec ID
- coverage layer: awaiting owner, queued, in-progress, parent-mapped, needs-revision, acceptable, blocked-by-human, or out-of-scope
- remaining detail or next action
- notes on evidence conflicts, stale docs, or inferred intent

## Slice Queue Fields

Group inventory rows into bounded slices. Each slice needs:

- stable slice ID
- bounded scope
- evidence rows included
- proposed parent spec and child spec owner
- slice kind: user-flow, permission-flow, data-lifecycle, API-contract, worker-job, integration, infrastructure, or parent-map
- status: queued, in-progress, needs-revision, revision-ready, acceptable, out-of-scope, or blocked-by-human
- owner skill for the next action
- current score, if evaluated
- exit criterion for moving the slice forward
- blocking gaps and human decisions

Prefer smaller behavior-bearing slices over broad domains. Broad domains become parent specs unless they truly contain no separable behavior.

## Completion Rule

Backfill is complete when relevant inventory items are mapped to acceptable slices, covered by child behavior specs where needed, parent-mapped with an explicit reason, blocked by a named human decision, or marked out of scope. Parent specs cover vocabulary and boundaries; behavior-bearing items get child coverage or a report note explaining the parent-owned behavior.
