# AGENTS.md

- Start at `docs/specs/index.html` before changing example client specs.
- Specs are HTML-native durable contracts; update `spec-metadata`, `graph-metadata`, and visible prose together.
- HTML docs navigation is local to this example; run `node docs/generate-site-map.mjs` after adding or moving durable HTML docs under `docs/`.
- Canvas and graph JSON files under `docs/visible-business-graph/` are derived artifacts, not source of truth.
- After spec graph changes, run `npm run foundation:visible-business-graph:check -- --repo examples/visible-business-client` from the Foundation repo root.
- Shared process changes belong in Foundation, not this example client.
