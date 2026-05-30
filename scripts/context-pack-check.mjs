#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  contextPackArtifactFingerprint,
  contextPackCheckPathFor,
  parseCliArgs,
  renderResultsText,
  summarizeResults,
  validateContextPack,
  writeJson
} from "./context-pack-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:context-pack:check -- --repo /path/to/repo --run-id YYYYMMDD-NN [--phase batch|handoff] [--report path] [--json] [--no-write]

Validates Context Pack structure, upstream Define Spec Jobs references, exact evidence specificity, freshness, required categories, pack size, and optional report state.`;
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
  const check = validateContextPack({ repoRoot, runId, outDir, phase, reportPath });
  const summary = summarizeResults(check.results);
  const payload = {
    schema: "foundation.backfill.context-pack-check.v1",
    runId,
    phase,
    generatedAt: new Date().toISOString(),
    queuePath: path.relative(repoRoot, check.queuePath || ""),
    packPath: path.relative(repoRoot, check.packPath),
    packFingerprint: contextPackArtifactFingerprint(repoRoot, runId, outDir),
    reportPath: reportPath ? path.relative(repoRoot, reportPath) : null,
    summary,
    results: check.results
  };
  const checkPath = contextPackCheckPathFor(repoRoot, runId, outDir);
  if (!options["no-write"]) writeJson(checkPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "validation",
    event: "validation",
    summary: `Context Pack check ${summary.fail === 0 ? "passed" : "failed"}.`,
    artifactsRead: [payload.queuePath, payload.packPath].filter(Boolean),
    artifactsChanged: options["no-write"] ? [] : [path.relative(repoRoot, checkPath)],
    commands: ["foundation:context-pack:check"],
    checks: [{ name: "context-pack-check", result: summary.fail === 0 ? "passed" : "failed" }],
    result: summary.fail === 0 ? "Context Pack check passed." : "Context Pack check failed.",
    nextAction: summary.fail === 0 ? "Run Context Pack eval or record handoff." : "Fix Context Pack check failures."
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(renderResultsText("Context Pack check", check.results));
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
