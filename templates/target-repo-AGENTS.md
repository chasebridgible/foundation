# AGENTS.md

- This repo uses the canonical Foundation substrate at `/absolute/path/to/foundation`. Read Foundation `AGENTS.md` before spec authoring or behavior-changing work.
- Keep product specs, project knowledge, implementation paths, tests, ADRs, and local commands in this repo.
- Keep shared process, principles, reusable skills, templates, and validators in Foundation.
- Product spec entry point: `docs/specs/index.html`.
- HTML docs navigation: run `npm run site-map` after adding or moving durable HTML docs under `docs/`; keep the local `docs/site-nav.js` in sync with Foundation so every included HTML page has the shared sidebar collapse control.
- Backfill run: `none`, or name the dated report and run-log JSONL that own the Capability Map, Job / Spec Queue, current top-level spec ID, current slice, evaluation report, and remaining queue.
- Local commands: replace this line with the repo's test, build, lint, typecheck, dev, data, and spec commands.
- Local constraints: replace this line with repo-specific deployment, data, security, branch, environment, or ownership constraints.
