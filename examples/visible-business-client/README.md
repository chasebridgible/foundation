# Visible Business Client

This is a canonical fictional client repository for Foundation's Visible Business Graph.

The example models Brightline Home Services, a residential field service business. It is intentionally richer than a smoke test: the specs include a system, five capabilities, fourteen jobs, a technical contract, an eval contract, actors, tools, evidence, metrics, and gaps.

Source of truth:

- HTML specs under `docs/specs/`
- Graph metadata embedded in each spec's `graph-metadata` script
- Generated graph/canvas artifacts under `docs/visible-business-graph/`

Useful Foundation commands from the Foundation repo root:

- `npm run foundation:visible-business-graph:check -- --repo examples/visible-business-client`
- `npm run foundation:visible-business-graph:build -- --repo examples/visible-business-client --out examples/visible-business-client/docs/visible-business-graph/business-graph.json`
- `npm run foundation:visible-business-graph:render -- --graph examples/visible-business-client/docs/visible-business-graph/business-graph.json --out examples/visible-business-client/docs/visible-business-graph/canvas.html`
- `npm run foundation:visible-business-graph:eval -- --repo examples/visible-business-client --graph examples/visible-business-client/docs/visible-business-graph/business-graph.json --canvas examples/visible-business-client/docs/visible-business-graph/canvas.html --expected examples/visible-business-client/docs/visible-business-graph/expected-graph.json`
