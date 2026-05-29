#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  createInitialSplitQueueRows,
  defaultBackfillDir,
  parseCliArgs,
  renderResultsText,
  splitQueuePathFor,
  summarizeResults,
  validateCapabilityMatrixHandoff,
  writeJsonl
} from "./split-queue-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:split-queue:init -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--report path] [--run-log path]

Creates the canonical pending Split And Queue JSONL skeleton from a passing Capability Matrix handoff.`;
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
  const handoff = validateCapabilityMatrixHandoff(repoRoot, runId, outDir, reportPath);
  const summary = summarizeResults(handoff.results);
  if (summary.fail > 0) {
    console.log(renderResultsText("Split And Queue init", handoff.results));
    process.exit(1);
  }

  const rows = createInitialSplitQueueRows(handoff.capabilityRows);
  const queuePath = splitQueuePathFor(repoRoot, runId, outDir);
  writeJsonl(queuePath, rows);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "split-queue",
    event: "start",
    summary: "Initialized Split And Queue from passing Capability Matrix handoff.",
    artifactsRead: [path.relative(repoRoot, handoff.capabilityMatrixPath)],
    artifactsChanged: [path.relative(repoRoot, queuePath)],
    commands: ["foundation:split-queue:init"],
    checks: [{ name: "capability-matrix-handoff", result: "passed" }],
    durationSeconds: 0,
    result: `${rows.length} pending queue slice row(s) created from Capability Matrix terminal rows.`,
    nextAction: "Use the Split And Queue fill loop: split needs-split capabilities into child slices, then run check and eval."
  });

  console.log(renderResultsText("Split And Queue init", [
    ...handoff.results,
    { id: "split-queue-skeleton", status: "pass", message: `Created ${rows.length} pending queue slice row(s)` }
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
