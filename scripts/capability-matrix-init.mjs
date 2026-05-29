#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  capabilityMatrixPathFor,
  createInitialCapabilityRows,
  defaultBackfillDir,
  parseCliArgs,
  readySurfaceRows,
  renderResultsText,
  summarizeResults,
  validateSurfaceRegistryHandoff,
  writeJsonl
} from "./capability-matrix-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:capability-matrix:init -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--report path] [--run-log path]

Creates the canonical pending Capability Matrix JSONL skeleton from a passing Surface Registry handoff.`;
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
  const reportPath = options.report ? path.resolve(repoRoot, options.report) : null;
  const handoff = validateSurfaceRegistryHandoff(repoRoot, runId, outDir, reportPath);
  const summary = summarizeResults(handoff.results);
  if (summary.fail > 0) {
    console.log(renderResultsText("Capability Matrix init", handoff.results));
    process.exit(1);
  }

  const rows = createInitialCapabilityRows(handoff.surfaceRows);
  const matrixPath = capabilityMatrixPathFor(repoRoot, runId, outDir);
  writeJsonl(matrixPath, rows);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "capability-matrix",
    event: "start",
    summary: "Initialized Capability Matrix from passing Surface Registry handoff.",
    artifactsRead: [path.relative(repoRoot, handoff.surfaceRegistryPath)],
    artifactsChanged: [path.relative(repoRoot, matrixPath)],
    commands: ["foundation:capability-matrix:init"],
    checks: [{ name: "surface-registry-handoff", result: "passed" }],
    durationSeconds: 0,
    result: `${rows.length} pending capability row(s) created from ${readySurfaceRows(handoff.surfaceRows).length} ready surface row(s).`,
    nextAction: "Use the Capability Matrix fill loop: group reviewed surfaces into actor/outcome capability rows, then run check and eval."
  });

  console.log(renderResultsText("Capability Matrix init", [
    ...handoff.results,
    { id: "capability-matrix-skeleton", status: "pass", message: `Created ${rows.length} pending capability row(s)` }
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
