@chasebridgible

## Agent Capability Scout complete — 2026-11-07-agent-scout-01

- **Top interest grade: 8/10.** Google's agent-distraction analysis shows that stale repository TODOs and other indirect instruction-like context can trigger costly, unprompted scope drift. The new Foundation principle treats ambient context as a maintained behavioral control surface.
- **Also recorded: 8/10.** OpenAI's GPT-6 Cyber evaluates task success separately from scope adherence in an isolated environment, including tempting but unauthorized adjacent paths.
- **No promoted finding:** Anthropic and Addy Osmani had no new scoped item in the inspected listings.
- **Principle candidates:** one passed and is patched in `docs/principles/agent-principles.html`; one was rejected as non-additive.
- **Validation:** `npm run foundation:agent-capability-scout:check` and `npm run spec:check` passed; the required Spec registry and metadata check passed.
- **PR:** #184 — https://github.com/chasebridgible/foundation/pull/184

Requested action: please review the new ambient-context principle. This is a doctrine change, so the PR is intentionally left open and will not auto-merge.
