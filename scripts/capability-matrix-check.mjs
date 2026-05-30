#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  capabilityCheckPathFor,
  defaultBackfillDir,
  parseCliArgs,
  renderResultsText,
  summarizeResults,
  validateCapabilityMatrix,
  writeJson
} from "./capability-matrix-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:capability-matrix:check -- --repo /path/to/repo --run-id YYYYMMDD-NN [--phase batch|handoff] [--report path] [--json] [--no-write]

Validates Capability Map structure, upstream Surface / Function Map references, freshness, coverage, handoff states, split flags, and optional report state.`;
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
  const check = validateCapabilityMatrix({ repoRoot, runId, outDir, phase, reportPath });
  const summary = summarizeResults(check.results);
  const payload = {
    schema: "foundation.backfill.capability-matrix-check.v1",
    runId,
    phase,
    generatedAt: new Date().toISOString(),
    surfaceRegistryPath: path.relative(repoRoot, check.surfaceRegistryPath || ""),
    registryPath: path.relative(repoRoot, check.registryPath),
    reportPath: reportPath ? path.relative(repoRoot, reportPath) : null,
    summary,
    results: check.results
  };
  const checkPath = capabilityCheckPathFor(repoRoot, runId, outDir);
  if (!options["no-write"]) writeJson(checkPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "validation",
    event: "validation",
    summary: `Capability Map check ${summary.fail === 0 ? "passed" : "failed"}.`,
    artifactsRead: [payload.surfaceRegistryPath, payload.registryPath].filter(Boolean),
    artifactsChanged: options["no-write"] ? [] : [path.relative(repoRoot, checkPath)],
    commands: ["foundation:capability-matrix:check"],
    checks: [{ name: "capability-matrix-check", result: summary.fail === 0 ? "passed" : "failed" }],
    result: summary.fail === 0 ? "Capability Map check passed." : "Capability Map check failed.",
    nextAction: summary.fail === 0 ? "Run Capability Map eval or record handoff." : "Fix Capability Map check failures."
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(renderResultsText("Capability Map check", check.results));
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
