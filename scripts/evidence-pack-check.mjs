#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  evidencePackArtifactFingerprint,
  evidencePackCheckPathFor,
  parseCliArgs,
  renderResultsText,
  summarizeResults,
  validateEvidencePack,
  writeJson
} from "./evidence-pack-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:evidence-pack:check -- --repo /path/to/repo --run-id YYYYMMDD-NN [--phase batch|handoff] [--report path] [--json] [--no-write]

Validates Evidence Pack structure, upstream Split And Queue references, exact evidence specificity, freshness, required categories, pack size, and optional report state.`;
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
  const check = validateEvidencePack({ repoRoot, runId, outDir, phase, reportPath });
  const summary = summarizeResults(check.results);
  const payload = {
    schema: "foundation.backfill.evidence-pack-check.v1",
    runId,
    phase,
    generatedAt: new Date().toISOString(),
    queuePath: path.relative(repoRoot, check.queuePath || ""),
    packPath: path.relative(repoRoot, check.packPath),
    packFingerprint: evidencePackArtifactFingerprint(repoRoot, runId, outDir),
    reportPath: reportPath ? path.relative(repoRoot, reportPath) : null,
    summary,
    results: check.results
  };
  const checkPath = evidencePackCheckPathFor(repoRoot, runId, outDir);
  if (!options["no-write"]) writeJson(checkPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "validation",
    event: "validation",
    summary: `Evidence Pack check ${summary.fail === 0 ? "passed" : "failed"}.`,
    artifactsRead: [payload.queuePath, payload.packPath].filter(Boolean),
    artifactsChanged: options["no-write"] ? [] : [path.relative(repoRoot, checkPath)],
    commands: ["foundation:evidence-pack:check"],
    checks: [{ name: "evidence-pack-check", result: summary.fail === 0 ? "passed" : "failed" }],
    result: summary.fail === 0 ? "Evidence Pack check passed." : "Evidence Pack check failed.",
    nextAction: summary.fail === 0 ? "Run Evidence Pack eval or record handoff." : "Fix Evidence Pack check failures."
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(renderResultsText("Evidence Pack check", check.results));
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
