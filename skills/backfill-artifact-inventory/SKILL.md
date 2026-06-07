---
name: backfill-artifact-inventory
description: Build and maintain the Artifact Inventory, Capability Map, split signals, and coverage ledger for a Foundation backfill. Use inside Backfill Specs before drafting, when resuming, or when coverage is unclear.
---

# Backfill Artifact Inventory

Use inside `backfill-repo`. Do not draft specs here.

## Inputs

- dated backfill report, if present
- file manifest and Artifact Inventory artifacts for the active run
- existing Capability Map and Job / Spec Queue, if present
- repo structure, routes/screens, APIs, schemas, services/jobs, integrations, infra, tests, docs

## Produce

1. Evidence inventory: stable ID, category, label, evidence path, finding, confidence, proposed owner, notes.
2. Capability Map rows using the Backfill Specs formula:
   actor + outcome + object + actions + states + rules + surfaces + contracts + failure/recovery + evidence.
3. Split signals for rows that are too broad.
4. Slice queue candidates derived from capability rows.

## Graph Metadata Support

Do not draft specs in this skill, but collect the fields that make later `graph-metadata` accurate: system boundaries, capability names, job/process candidates, actors, tools, evidence paths, metrics, gaps, and source anchors. Preserve exact evidence paths and row IDs so downstream capability, job, technical, and eval specs can create stable graph nodes and edges. If this pass revises existing specs, update their `graph-metadata` and run `npm run foundation:visible-business-graph:check -- --repo <repo>` before handoff.

## Inventory Scope

Derive evidence surfaces from the mapped Artifact Inventory first, then inspect source files only to resolve ambiguity. Cover:

- apps, packages, deployables, source roots
- routes, pages, screens, navigation, commands, public entry points
- components, process paths, forms, menus, empty states, permission surfaces
- APIs, endpoint groups, controllers, handlers, external contracts
- tables, models, migrations, schemas, fixtures, seed data
- services, workers, jobs, queues, schedulers, webhooks, event handlers
- auth, roles, permissions, ownership, billing/entitlement, audit
- integrations, providers, SDKs, imports/exports, AI/model calls
- infrastructure, deployment, environment, observability, operational scripts
- tests, evals, snapshots, generated artifacts, docs, plans, diagrams, tickets

## Split Rule

Split capability rows when actors, outcomes, objects, actions, states, permissions, contracts, recovery behavior, or verification targets differ. Broad rows may remain parent maps only when child capability rows carry the behavior.

## Done

The layer is done when every mapped Artifact Inventory row contributes to child/sole capability coverage, non-behavioral support note, out-of-scope reason, or named human decision, and graph-relevant evidence is specific enough for downstream specs to emit source-backed graph nodes.
