#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  parseCliArgs,
  processActionMapArtifactFingerprint,
  processActionMapCheckPathFor,
  renderResultsText,
  summarizeResults,
  validateProcessActionMap,
  writeJson
} from "./process-action-map-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:process-action-map:check -- --repo /path/to/repo --run-id YYYYMMDD-NN [--phase batch|handoff] [--report path] [--json] [--no-write]

Validates Process / Action Map structure, upstream Context Pack references, state/action specificity, freshness, and optional report state.`;
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
  const check = validateProcessActionMap({ repoRoot, runId, outDir, phase, reportPath });
  const summary = summarizeResults(check.results);
  const payload = {
    schema: "foundation.backfill.process-action-map-check.v1",
    runId,
    phase,
    generatedAt: new Date().toISOString(),
    packPath: path.relative(repoRoot, check.packPath || ""),
    processMapPath: path.relative(repoRoot, check.processMapPath),
    processMapFingerprint: processActionMapArtifactFingerprint(repoRoot, runId, outDir),
    reportPath: reportPath ? path.relative(repoRoot, reportPath) : null,
    summary,
    results: check.results
  };
  const checkPath = processActionMapCheckPathFor(repoRoot, runId, outDir);
  if (!options["no-write"]) writeJson(checkPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "validation",
    event: "validation",
    summary: `Process / Action Map check ${summary.fail === 0 ? "passed" : "failed"}.`,
    artifactsRead: [payload.packPath, payload.processMapPath].filter(Boolean),
    artifactsChanged: options["no-write"] ? [] : [path.relative(repoRoot, checkPath)],
    commands: ["foundation:process-action-map:check"],
    checks: [{ name: "process-action-map-check", result: summary.fail === 0 ? "passed" : "failed" }],
    result: summary.fail === 0 ? "Process / Action Map check passed." : "Process / Action Map check failed.",
    nextAction: summary.fail === 0 ? "Run Process / Action Map eval or record handoff." : "Fix Process / Action Map check failures."
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(renderResultsText("Process / Action Map check", check.results));
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
