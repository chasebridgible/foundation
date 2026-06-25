# Google AI Developers evidence - 2026-06-25

Source: https://developers.googleblog.com/en/search/?technology_categories=AI
Fetched at: 2026-06-25T05:04:28Z
Retrieval status: fetched
Raw search snapshot: `docs/specs/agent-capability-scout/evidence/2026-06-25-agent-scout-01/raw/google-ai-developers.txt`
Raw article snapshots:
- `docs/specs/agent-capability-scout/evidence/2026-06-25-agent-scout-01/raw/google-a2ui-mcp-apps.txt`

## Newly normalized item since 2026-06-23

- 2026-06-17: "A2UI + MCP Apps: Combining the best of declarative and custom agentic UIs."

## Evidence notes

The A2UI/MCP article frames agentic workflow interfaces around a tradeoff between rich custom iframes and host-native declarative rendering. It says MCP Apps provide creative freedom through iframes, but can create fragmented experience, performance cost, and security concerns. It says A2UI sends structured JSON that the host converts into trusted native UI components, improving consistency and security while constraining component choice.

The article proposes combining these approaches: use A2UI over MCP servers for native rendering where structured UI is enough, reserve custom iframe embedding for complex stateful experiences, and inject generative UI into legacy systems. It highlights separation of concerns: MCP handles backend tools and data access while A2UI handles frontend component rendering. It also calls out environment portability, capability-based security, schema enforcement, static resource delivery for predictable interfaces, and dynamic tool-call delivery for live data injection.

## Scout interpretation

One meaningful finding was recorded. The broad agent-system lesson is that agentic UI should be treated as a contract boundary, not as arbitrary generated markup: separate tool/data access from rendering, prefer host-native trusted components for standard interactions, and reserve custom embedded surfaces for complex state.
