---
name: backfill-user-flow-extraction
description: Extract concrete user flows from existing repo evidence during a Foundation spec backfill. Use inside Backfill Specs for user-facing slices before writing descriptive specs, especially when routes, screens, components, roles, permissions, or product docs imply user journeys.
---

# Backfill User Flow Extraction

Use this skill inside `backfill-specs` before authoring descriptive specs for user-facing slices.

## Purpose

Describe what a user is trying to accomplish and how the system is intended to support that journey. Keep the language user-centered; use code paths as evidence for user-visible intent.

## Flow Extraction Steps

For the current slice:

1. Read the inventory rows and evidence paths for the slice.
2. Identify users, roles, memberships, operators, admins, and unauthenticated visitors involved.
3. Identify entry points: routes, screens, notifications, deep links, commands, imports, exports, or background results that surface to a user.
4. Extract each concrete flow:
   - user
   - entry point
   - user intent
   - primary actions
   - visible states
   - system responses
   - success outcome
   - failure, retry, denial, empty, and recovery paths
   - evidence paths
   - proposed descriptive spec owner
5. Update the dated report with the flow list and remaining flow gaps.

## Granularity Rule

A flow should be small enough that another agent could render the intended experience and write concrete state/rule tables. If a flow contains multiple goals, roles, major states, or decisions, split it.

## Completion Rule

The slice's user-flow layer is complete when every user-facing inventory item maps to a concrete flow, to a parent flow with explicit child flows, or to an out-of-scope note in the report.
