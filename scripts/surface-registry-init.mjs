#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  createInitialSurfaceRows,
  defaultBackfillDir,
  parseCliArgs,
  renderResultsText,
  surfaceRegistryPathFor,
  surfaceRegistryScopeCounts,
  summarizeResults,
  validateFileRegistryHandoff,
  writeJsonl
} from "./surface-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:surface-registry:init -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--run-log path]

Creates the canonical pending Surface / Function Map JSONL skeleton from Surface / Function Map-eligible rows in a passing Artifact Inventory handoff.`;
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.repo) throw new Error("Missing --repo");
  if (!options["run-id"]) throw new Error("Missing --run-id");

  const repoRoot = path.resolve(options.repo);
  const runId = options["run-id"];
  const outDir = options["out-dir"] ? path.resolve(repoRoot, options["out-dir"]) : defaultBackfillDir(repoRoot);
  const handoff = validateFileRegistryHandoff(repoRoot, runId, outDir);
  const summary = summarizeResults(handoff.results);
  if (summary.fail > 0) {
    console.log(renderResultsText("Surface / Function Map init", handoff.results));
    process.exit(1);
  }

  const rows = createInitialSurfaceRows(handoff.registry.rows);
  const scope = surfaceRegistryScopeCounts(handoff.registry.rows);
  const registryPath = surfaceRegistryPathFor(repoRoot, runId, outDir);
  writeJsonl(registryPath, rows);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "surface-map",
    event: "start",
    summary: "Initialized Surface / Function Map from passing Artifact Inventory handoff.",
    artifactsRead: [path.relative(repoRoot, handoff.registry.registryPath)],
    artifactsChanged: [path.relative(repoRoot, registryPath)],
    commands: ["foundation:surface-registry:init"],
    checks: [{ name: "file-registry-handoff", result: "passed" }],
    durationSeconds: 0,
    result: `${rows.length} pending Surface / Function Map-eligible source row(s) created; ${scope.skipped.length} inert file row(s) skipped.`,
    nextAction: "Use the Surface / Function Map fill loop: read one eligible upstream file in full, mark that file's surface rows, then repeat."
  });

  console.log(renderResultsText("Surface / Function Map init", [
    ...handoff.results,
    { id: "surface-registry-skeleton", status: "pass", message: `Created ${rows.length} pending Surface / Function Map-eligible row(s); skipped ${scope.skipped.length} inert file row(s)` }
  ]));
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    console.error("");
    console.error(usage());
    process.exit(2);
  }
}
