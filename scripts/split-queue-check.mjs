#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  parseCliArgs,
  renderResultsText,
  splitQueueCheckPathFor,
  summarizeResults,
  validateSplitQueue,
  writeJson
} from "./split-queue-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:split-queue:check -- --repo /path/to/repo --run-id YYYYMMDD-NN [--phase batch|handoff] [--report path] [--json] [--no-write]

Validates Split And Queue structure, upstream Capability Matrix references, freshness, child-slice coverage, current next actions, and optional report state.`;
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
  const phase = options.phase || "handoff";
  const reportPath = options.report ? path.resolve(repoRoot, options.report) : null;
  const check = validateSplitQueue({ repoRoot, runId, outDir, phase, reportPath });
  const summary = summarizeResults(check.results);
  const payload = {
    schema: "foundation.backfill.split-queue-check.v1",
    runId,
    phase,
    generatedAt: new Date().toISOString(),
    capabilityMatrixPath: path.relative(repoRoot, check.capabilityMatrixPath || ""),
    queuePath: path.relative(repoRoot, check.queuePath),
    reportPath: reportPath ? path.relative(repoRoot, reportPath) : null,
    summary,
    results: check.results
  };
  const checkPath = splitQueueCheckPathFor(repoRoot, runId, outDir);
  if (!options["no-write"]) writeJson(checkPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "validation",
    event: "validation",
    summary: `Split And Queue check ${summary.fail === 0 ? "passed" : "failed"}.`,
    artifactsRead: [payload.capabilityMatrixPath, payload.queuePath].filter(Boolean),
    artifactsChanged: options["no-write"] ? [] : [path.relative(repoRoot, checkPath)],
    commands: ["foundation:split-queue:check"],
    checks: [{ name: "split-queue-check", result: summary.fail === 0 ? "passed" : "failed" }],
    result: summary.fail === 0 ? "Split And Queue check passed." : "Split And Queue check failed.",
    nextAction: summary.fail === 0 ? "Run Split And Queue eval or record handoff." : "Fix Split And Queue check failures."
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(renderResultsText("Split And Queue check", check.results));
  }
  if (summary.fail > 0) process.exit(1);
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
