# Addy Osmani evidence - 2026-07-21

Run ID: `2026-07-21-agent-scout-01`
Source ID: `addy-osmani-blog`
Fetched at: `2026-07-21T05:06:34Z`
Source URL: https://addyosmani.com/blog/
Detail URL: https://addyosmani.com/blog/software-factories/
Retrieval status: fetched

## Observed source state

- Addy Osmani's personal blog listed `Software Factories, Light and Dark`, dated July 20, 2026.
- The article defines a software factory as many harnessed loops running at once, fed by a work queue and drained through a review gate into production.
- It distinguishes lit factories, where humans keep judgment in the loop, from dark factories, where code ships that no human has read and only machines verify the work.
- The article argues that generation is not the bottleneck; verification and review throughput are. It names back pressure as the rule that autonomy should expand only as far as cheap, reliable verification can support.
- It argues that dark factories create comprehension debt even while tests stay green, and that architecture, types, tests, legible boundaries, dependency injection, short loops, and control-flow graphs are external safety nets the model will not supply.
- It states that loops earn unattended status only when checks are cheap, frequent, hard to fake, immediate, and stable; expensive or high-blast-radius decisions need human review.

## Scout assessment

This is a high-value finding for Foundation because it directly matches agent-factory operations: queues, loop harnesses, review gates, backpressure, comprehension debt, and the need to decide per-loop autonomy from verification capacity rather than generation capacity.

Potential principle-candidate evaluation: durable and vendor-neutral, but likely non-additive. Agent Principles already has explicit rules for review throughput, human authority, deterministic high-risk gates, whole-harness design, evidence-based progress, and externalized state. AI Evals Principles already covers risk-calibrated signal choice and production-like trace evidence. No principles-doc patch is warranted unless the owner wants the backpressure/light-switch framing promoted as a named operating pattern.
