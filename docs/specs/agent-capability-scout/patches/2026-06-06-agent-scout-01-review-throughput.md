# Principle Patch: Review Throughput

Run ID: 2026-06-06-agent-scout-01
Finding ID: 2026-06-06-agent-scout-01-finding-04
Target doc: docs/principles/agent-principles.html
Review state: proposed

## Proposed Principle

Concurrency must respect review throughput. Do not scale agent fan-out beyond the human, test, and merge capacity that can inspect the results. An agent system should use queues, backpressure, smaller batches, or stricter acceptance gates before parallel activity outruns accountable review.

## Standalone Additive Eval

Pass. The rule is vendor-neutral, model-neutral, and not tied to a temporary feature. Existing Agent Principles already says parallelism requires ownership and merge rules, but this adds an operational limit: fan-out should be bounded by available review and merge throughput.

