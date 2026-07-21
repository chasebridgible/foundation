# Google AI Developers evidence - 2026-07-21

Run ID: `2026-07-21-agent-scout-01`
Source ID: `google-ai-developers`
Fetched at: `2026-07-21T05:06:34Z`
Source URL: https://developers.googleblog.com/en/search/?technology_categories=AI
Detail URL: https://developers.googleblog.com/en/run-ray-on-tpu-part-1-the-foundations/
Retrieval status: fetched

## Observed source state

- Google Developers Blog AI search listed `Run Ray on TPU, Part 1: The foundations`, dated July 20, 2026.
- The post says Ray 2.55 adds first-class TPU support so Ray task, actor, Train, Data, and Serve workloads can use TPUs through official APIs.
- The key technical constraint is topology: multi-host TPU jobs must land on one intact slice or collective operations can hang.
- Google describes GKE provisioning and labeling TPU slices, then Ray Core using those labels through `slice_placement_group()` to reserve a whole slice atomically.
- The practical contract is that users declare topology while the infrastructure encodes placement constraints, avoiding custom placement code in normal Ray AI library usage.

## Scout assessment

This is a lower-grade but useful implementation finding. It is not primarily an agent-workflow article, but it provides a transferable infrastructure lesson for agent systems that run distributed jobs: topology and resource constraints should be made explicit in scheduler primitives and platform labels, not left to agent-written ad hoc placement logic.

No principle candidate was created. Existing Agent Principles already cover deterministic scaffolding, harness boundaries, and externalizing environment state; this source is too infrastructure-specific for global doctrine.
