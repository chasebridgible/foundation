---
name: backfill-repo-inventory
description: Build and maintain the evidence inventory and coverage ledger for a Foundation repo backfill. Use inside Backfill Specs when mapping apps, routes, screens, components, APIs, schemas, services, workers, jobs, integrations, permissions, tests, docs, and infrastructure before drafting or completing specs.
---

# Backfill Repo Inventory

Use this skill inside `backfill-specs` before drafting and whenever a backfill resumes.

## Purpose

Create durable state that shows what exists in the repo and how each item is covered by specs. The inventory prevents broad domain summaries from being mistaken for complete backfill coverage.

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
- coverage layer: awaiting owner, parent-mapped, flow-mapped, descriptive-drafted, technical-drafted, adequacy-reviewed, approved, or out-of-scope
- remaining detail or next action
- notes on evidence conflicts, stale docs, or inferred intent

## Completion Rule

Backfill is complete when relevant inventory items are mapped to owner specs, covered by child behavior specs where needed, adequacy-reviewed, or marked out of scope. Parent specs cover vocabulary and boundaries; behavior-bearing items get child coverage or a report note explaining the parent-owned behavior.
