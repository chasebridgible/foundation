# Addy Osmani Blog snapshot

Run ID: 2026-06-15-agent-scout-01
Source ID: addy-osmani-blog
Fetched at: 2026-06-15T05:03:29Z
URL: https://addyosmani.com/blog/
Retrieval status: fetched

## Current source state

The Addy Osmani blog showed these relevant current items:

- 2026-06-14: "Agentic Code Review"
- 2026-06-07: "Loop Engineering"
- 2026-05-16: "The Orchestration Tax"
- 2026-05-05: "Don't Outsource the Learning"
- 2026-04-28: "Agent Skills"
- 2026-04-19: "Long-running Agents"

The scoped new agent-system signal is the 2026-06-14 "Agentic Code Review" post.

## Evidence notes

The post argues that agent-generated code makes writing cheap while human understanding and accountable review remain expensive. It frames review as the new bottleneck, especially because agent-authored changes may arrive without a human author who already understands the rationale. It recommends tiering review by blast radius, requiring evidence before review, keeping agent PRs small, reading test changes carefully, keeping CI strict, treating AI review as a sensor rather than a verdict, and keeping a human owner on high-cost merge decisions.

The post also distinguishes low-risk solo work from high-risk long-lived systems. It says review depth should change with blast radius, code lifetime, and the number of people who must understand the change. It describes a shift from "human in the loop" line-by-line review to "human on the loop" sampling, auditing, escalation, and high-risk judgment.

## Scout interpretation

This is the top finding for the run. It is a broad, durable agent-system lesson because agent loops can now generate and review more output than humans can understand, making risk-tiered evidence gates and explicit human ownership central to trustworthy software change. The principle-candidate gate was evaluated separately, but the candidate was rejected because Foundation already contains the same durable rules across review throughput, small verifiable units, cost-to-risk calibration, borrowed confidence, human accountability, and reviewable change flow.
