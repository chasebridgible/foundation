---
name: backfill-rendered-ux-spec
description: Add rendered and lightly interactive HTML-native UX examples to descriptive specs during a Foundation backfill. Use when a backfilled capability has user-facing UI, visible states, workflows, forms, comments, menus, filters, approvals, inline editing, or other inspectable interaction.
---

# Backfill Rendered UX Spec

Use inside `backfill-specs` after descriptive drafting for visible capabilities.

## Add To The Descriptive Spec

- capability ID, actor, outcome, and state model represented
- believable domain data and product copy
- ready, empty, loading, error, permission, partial, success, and completed states when relevant
- responsive behavior, or a reason it is not relevant
- primary action, warning, empty, error, confirmation, and recovery copy
- lightweight interaction for important state changes
- notes mapping rendered states to flow/state sections
- evidence links when useful

Use inline HTML/CSS/JS that works from disk.

## Nonvisual Slices

Add a short statement naming the user-visible, operator-visible, or technical contract that carries the intent.

## Done

Done when a reviewer can open the descriptive spec and inspect the important intended states, hierarchy, copy, and interactions. A happy-path-only demo is incomplete when the capability includes permissions, recovery, or failure states.
