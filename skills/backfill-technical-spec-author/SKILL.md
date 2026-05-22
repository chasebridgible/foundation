---
name: backfill-technical-spec-author
description: Author contract-first, architecture-flexible technical specs from capability rows, descriptive intent, and repo evidence during a Foundation backfill. Use inside Backfill Specs after descriptive intent is drafted to map capabilities to required contracts, current evidence, constraints, latitude, data, APIs, services, jobs, permissions, integrations, timing, failures, and observability.
---

# Backfill Technical Spec Author

Use inside `backfill-specs` after descriptive intent exists. Technical specs explain the contracts required to preserve intended behavior while keeping implementation latitude explicit.

## Inputs

- capability matrix rows for the slice
- descriptive spec
- evidence paths and inventory rows
- parent spec and dated report

## Write

Use target-owned spec IDs and `status: draft`. For each behavior-bearing capability, map:

- trigger and entry point
- durable state, event, side effect, or observable result
- APIs/routes/controllers/handlers/resource groups
- data models, fields, invariants, schemas, migrations, ownership
- services/workers/jobs/queues/events/schedulers
- auth, roles, permissions, entitlement, audit
- integrations, providers, imports/exports, AI/model calls
- timing, ordering, idempotency, concurrency, retries, lifecycle
- failure, recovery, observability, operator impact
- verification targets for later test specs/evals

## Architecture Classification

Separate:

- required contracts: behavior any implementation must preserve
- current evidence: how the existing repo appears to satisfy the contract
- architecture constraints: required implementation choices and why
- implementation latitude: choices a future build may change

Promote architecture to a constraint only when production data, external contracts, platform/runtime needs, security/compliance, operational needs, performance, or human direction require it.

## Done

Done when every attached capability row has technical section anchors for required contracts, evidence, constraints, latitude, failures/recovery, observability, and verification targets. If a cold build agent cannot tell what must be preserved versus what may change, mark the slice `needs-revision`.
