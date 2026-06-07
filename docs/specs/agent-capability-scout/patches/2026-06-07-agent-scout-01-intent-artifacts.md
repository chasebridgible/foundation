# Proposed Agent Principle Patch: Intent Artifacts

Run ID: 2026-06-07-agent-scout-01
Finding ID: 2026-06-07-agent-scout-01-finding-04
Target doc: docs/principles/agent-principles.html
Review state: proposed

## Proposed Principle

Externalize load-bearing intent, not only state. Goals, constraints, rationale, non-negotiables, and decision records should live in artifacts that agents can read. If the reason a system behaves a certain way exists only in a human head, cold-start agents will guess at it, multiply drift, and make fluent changes against the wrong target.

## Standalone Additive Eval

Pass. Existing Agent Principles already says state belongs in durable artifacts and that progress should be judged against intent. This candidate adds the missing agent-specific rule that intent itself is a separate artifact class: the durable why behind specs, AGENTS.md, ADRs, constraints, and learning loops.

## Evidence

- docs/specs/agent-capability-scout/evidence/2026-06-07-agent-scout-01/addy-osmani-blog.md

