# Addy Osmani Blog Evidence - 2026-09-21 Agent Capability Scout

- Run ID: `2026-09-21-agent-scout-01`
- Source ID: `addy-osmani-blog`
- Source URL: https://addyosmani.com/blog/
- Retrieved at: `2026-09-21T14:53:17Z`
- Retrieval status: fetched

## Retrieval notes

The Addy Osmani blog index and the linked post were checked through the web retriever. The enabled personal blog source exposed one newer unrecorded in-scope post after the prior Addy baseline.

## Observed source state

Recent visible source items included:

- `Brownfield Agentic Engineering`, September 14, 2026. The blog index describes it as what it takes to run agents in a codebase older than the team. The post says agentic engineering in old codebases is about making hidden constraints visible and cheap changes trustworthy, and warns that unsupervised agents in older codebases can produce work that appears to function while carrying the wrong system design and brittle tests. It emphasizes piecemeal modernization, characterization of current behavior, visible constraints, controlled change zones, reviewable blast radius, and strong tests before letting agents accelerate more work.
- `Agentic Skill Decay`, August 31, 2026, visible but previously handled as below the threshold or outside the prior Addy baseline.
- `Audit your Agent files`, August 27, 2026, visible but previously handled as below the threshold or outside the prior Addy baseline.
- `Human judgment doesn't leave the software factory. It relocates.`, August 21, 2026, already recorded by the August 24 scout.
- `Practical Loop Engineering`, August 14, 2026, already recorded by the August 24 scout.
- `Agentic Code Quality`, August 8, 2026, already recorded by the August 24 scout.

## Finding evidence

One Addy Osmani finding was created. The brownfield-agentic-engineering item matters because it ties agent acceleration to hidden system constraints, characterization tests, blast-radius-limited change zones, and legacy-system modernization discipline.

## Diff against prior successful run

The September 17 scout evidence did not include `Brownfield Agentic Engineering` and recorded no newer Addy finding. This post is newly visible to the enabled source and unrecorded in canonical scout state.

## Principle gate

One principle candidate was evaluated and rejected as non-additive. Agent Principles already cover understanding reality before changing systems, bounded verifiable units, context curation, human authority, explicit artifacts, tests/checks as gates, review throughput, and reviewable change flow.
