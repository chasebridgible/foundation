# Anthropic News evidence - 2026-06-25

Source: https://www.anthropic.com/news
Fetched at: 2026-06-25T05:04:28Z
Retrieval status: fetched
Raw snapshot: `docs/specs/agent-capability-scout/evidence/2026-06-25-agent-scout-01/raw/anthropic-news.txt`
Raw article snapshots:
- `docs/specs/agent-capability-scout/evidence/2026-06-25-agent-scout-01/raw/anthropic-introducing-claude-tag.txt`
- `docs/specs/agent-capability-scout/evidence/2026-06-25-agent-scout-01/raw/anthropic-fable-mythos-access.txt`

## Newly visible or newly evaluated items since 2026-06-23

- 2026-06-23: "Introducing Claude Tag."
- 2026-06-12: "Statement on the US government directive to suspend access to Fable 5 and Mythos 5" remained featured and was evaluated as policy/access context, not a capability finding.

## Evidence notes

The Claude Tag article describes a Slack-based team agent that can be granted access to selected channels, tools, data, and codebases. Team members can tag Claude in a channel, delegate work, and then inspect the result in the shared thread. The article says Claude builds context from channels it has access to, can remember relevant information, can plan tasks for the future, can proactively flag relevant information when ambient behavior is enabled, and can pursue asynchronous tasks over hours or days.

The article also names operating controls: administrators choose which tools and information the model can access in which channels; channel-scoped Claude identities keep memories separate across uses; administrators can set organization and channel token-spend limits; and administrators can view logs of what Claude did and who requested each task.

## Scout interpretation

One meaningful finding was recorded. The strongest durable lesson is not the Slack integration itself, but the operating shape for ambient team agents: collaborative surface, scoped identity, scoped memory, explicit tool/data grants, asynchronous work, spend controls, and audit logs.
