---
name: backfill-rendered-ux-spec
description: Add rendered and lightly interactive HTML-native UX examples to descriptive specs during a Foundation backfill. Use when a backfilled slice has user-facing UI, visible states, workflows, forms, comments, menus, filters, approvals, inline editing, or other inspectable interaction.
---

# Backfill Rendered UX Spec

Use this skill inside `backfill-specs` after drafting a user-facing descriptive spec and before adequacy review.

## Purpose

Make intended UX inspectable inside the HTML spec itself. The rendered section is a spec-native prototype that expresses intent.

## Required Content

For the current descriptive spec, add a rendered experience section that includes:

- representative layout using believable domain data and product copy
- ready, empty, loading, error, permission, and completed states when relevant
- responsive behavior or a stated non-responsive reason when layout matters
- copy for primary actions, warnings, empty states, errors, and confirmations
- lightweight interaction for stateful behavior such as comments, tabs, filters, menus, open/closed panels, inline editing, retries, approvals, selections, uploads, or exports
- short notes mapping rendered states to user-flow and state/rule sections
- evidence links to existing UI files, screenshots, routes, or docs when useful

Use inline HTML, CSS, and small JavaScript that works when the spec is opened directly from disk. Keep controls stable and simple.

## Nonvisual Slices

For backend-only, infrastructure, worker, or nonvisual slices, add a short statement naming the user-visible contract, operator surface, or technical behavior that carries the intent.

## Completion Rule

The rendered UX layer is complete when a reviewer can open the descriptive spec and inspect the important intended states, hierarchy, copy, and interactions from the spec itself. If a user-facing slice lacks rendered UX, mark the slice `needs-revision` before adequacy review.
