# Evidence Snapshot: addy-osmani-blog

Run ID: 2026-06-05-agent-scout-03
Fetched at: 2026-06-05T21:33:00Z
Source URL: https://addyosmani.com/blog/
Source scope: Agent engineering, AI-assisted development, software quality, evals, and durable engineering workflow lessons.
Retrieval status: fetched

## Observed Source State

- The blog index listed recent agent-engineering posts including "The Orchestration Tax" dated May 24, 2026, "Agent Skills" dated May 3, 2026, "Long-running Agents" dated Apr 28, 2026, and "Agent Harness Engineering" dated Apr 19, 2026.
- "The Orchestration Tax" argued that spawning more agents does not parallelize human judgment; the human review/merge path becomes the serial resource that limits throughput.
- "Long-running Agents" separated long-horizon reasoning, long-running execution, and persistent agency, then emphasized state outside the model context window, session-as-event-log recovery, explicit plan/progress files, structured handoffs, separate generation and evaluation, and loops that prevent premature stopping.
- The same post compared planner/worker/judge role splits and isolated git worktrees for long-running cloud tasks.

## Agent-System Relevance

Addy Osmani's source most directly overlaps Foundation's current design doctrine. It validates Foundation's existing focus on durable memory, restartable long-running runs, explicit handoffs, role separation, and human review bottlenecks.

## Evidence URLs

- https://addyosmani.com/blog/
- https://addyosmani.com/blog/orchestration-tax/
- https://addyosmani.com/blog/long-running-agents/
