---
name: backfill-technical-spec-author
description: Author contract-first, architecture-flexible technical specs from repo evidence and descriptive intent during a Foundation backfill. Use inside Backfill Specs after descriptive intent is drafted to map flows to required contracts, current implementation evidence, architecture constraints, implementation latitude, data models, APIs, services, jobs, permissions, integrations, timing, failures, and operational contracts.
---

# Backfill Technical Spec Author

Use this skill inside `backfill-specs` after the descriptive intent for a slice is drafted.

## Standard

The technical spec explains how the intended behavior is supported by system contracts. It should be specific enough that a future build agent can implement the slice from the specs alone, while treating the old repo as evidence for intent and architecture.

Technical specs are contract-first, architecture-flexible by default. Separate required contracts from current implementation evidence. Mark an architecture choice as a constraint when production data, external API contracts, platform/runtime requirements, compliance/security obligations, operational needs, performance requirements, or human direction make that choice part of the intended system.

## Authoring Steps

For the current slice:

1. Read the descriptive spec, slice inventory, evidence paths, parent spec, and dated report.
2. Map user flows to technical contracts:
   - triggers and entry points
   - APIs, routes, controllers, handlers, or resource groups
   - data models, fields, invariants, schemas, migrations, and ownership
   - services, workers, jobs, queues, events, and schedulers
   - auth, roles, permissions, membership, entitlement, and audit behavior
   - integrations, providers, imports, exports, AI/model calls, and external systems
   - timing, ordering, idempotency, concurrency, retries, and lifecycle rules
   - failure modes, recovery, observability, and operator impact
3. Add an architecture classification section:
   - required contracts: behavior any implementation must preserve
   - current evidence: how the existing repo appears to satisfy the contract
   - architecture constraints: implementation choices that are required and why
   - implementation latitude: choices a future build agent may change while preserving the contract
4. Use target-owned spec IDs and `status: draft`.
5. Link sibling descriptive specs and evidence paths.
6. Record inferred architecture, constraints, latitude, and review questions in the report.

## Completion Rule

The technical layer is complete when every behavior-bearing inventory item in the slice maps to a required contract, current evidence, a justified architecture constraint, implementation latitude, a parent-owned boundary, or an out-of-scope note.
