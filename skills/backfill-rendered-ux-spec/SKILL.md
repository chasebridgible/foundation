---
name: backfill-rendered-ux-spec
description: Add rendered and lightly interactive HTML-native UX examples to job specs during a Foundation backfill. Use when a backfilled capability has user-facing UI, visible states, workflows, forms, comments, menus, filters, approvals, inline editing, or other inspectable interaction.
---

# Backfill Rendered UX Spec

Use inside `backfill-specs` after job drafting for visible capabilities.

## Add To The Job Spec

- capability ID, actor, outcome, and state model represented
- believable domain data and product copy
- ready, empty, loading, error, permission, partial, success, and completed states when relevant
- responsive behavior, or a reason it is not relevant
- primary action, warning, empty, error, confirmation, and recovery copy
- lightweight interaction for important state changes
- notes mapping rendered states to flow/state sections
- evidence links when useful
- `graph-metadata` updates when the rendered UX adds, removes, or clarifies job, process, actor, tool, evidence, metric, or gap nodes

Use inline HTML/CSS/JS that works from disk.

## Graph Metadata

Rendered UX examples are evidence for job/process behavior, not a separate source of truth. When adding or revising rendered UX inside a job spec, keep `graph-metadata` aligned with the prose and rendered states: add evidence nodes for the rendered example only when it is useful evidence, link them with `evidenced-by`, and preserve source section IDs that point back to the job spec sections. Run `npm run foundation:visible-business-graph:check -- --repo <repo>` after spec edits.

## Nonvisual Slices

Add a short statement naming the user-visible, operator-visible, or technical contract that carries the intent.

## Done

Done when a reviewer can open the job spec and inspect the important intended states, hierarchy, copy, and interactions. A happy-path-only demo is incomplete when the capability includes permissions, recovery, or failure states.
