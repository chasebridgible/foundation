# Evidence Snapshot: addy-osmani-blog

Run ID: 2026-06-07-agent-scout-01
Source ID: addy-osmani-blog
Source URL: https://addyosmani.com/blog/
Fetched at: 2026-06-07T10:05:00Z
Retrieval status: fetched

## Observed Source State

Addy Osmani's blog index listed "The Intent Debt" on Jun 5, "The Orchestration Tax" on May 24, "Don't Outsource the Learning" on May 16, "Agent Skills" on May 3, "Long-running Agents" on Apr 28, "Agent Harness Engineering" on Apr 19, and other recent AI engineering posts.

The newly normalized Addy finding for this run is "The Intent Debt." The article distinguishes technical debt in code, cognitive debt in people, and intent debt in missing artifacts that preserve goals, constraints, and rationale. Its agent-system lesson is that agents can refactor code and recover some comprehension from source, but they cannot reconstruct true intent when the rationale was never written down. The article argues that every cold-start agent session pays the cost of unexternalized intent and that high agent parallelism multiplies that cost.

The article recommends writing specs for intent rather than implementation, using AGENTS.md as an intent ledger rather than mere config, capturing decisions as they happen, and making learning loops write intent back into durable artifacts.

## Comparison With Prior Successful Run

The 2026-06-06 run listed "The Intent Debt" on the Addy blog index but normalized "The Orchestration Tax" as the top finding and proposed the review-throughput principle. Today's run fetched and evaluated the Intent Debt article body, producing a distinct principle candidate about externalizing load-bearing intent for agents.

## Evidence References

- https://addyosmani.com/blog/ lines 8-17, 31-45
- https://addyosmani.com/blog/intent-debt/ fetched 2026-06-07 with curl; title and article body observed
