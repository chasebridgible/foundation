#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  checkPathFor,
  defaultBackfillDir,
  parseCliArgs,
  renderResultsText,
  summarizeResults,
  validateRegistry,
  writeJson
} from "./file-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:file-registry:check -- --repo /path/to/repo --run-id YYYYMMDD-NN [--mode bootstrap|strict] [--phase batch|handoff] [--json] [--no-write]

Validates manifest/registry invariants, freshness, mapped row shape, and handoff gates.`;
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
  const mode = options.mode || "bootstrap";
  const check = validateRegistry({ repoRoot, runId, outDir, phase, mode });
  const summary = summarizeResults(check.results);
  const payload = {
    schema: "foundation.backfill.file-registry-check.v1",
    runId,
    mode,
    phase,
    generatedAt: new Date().toISOString(),
    manifestPath: path.relative(repoRoot, check.manifestPath),
    registryPath: path.relative(repoRoot, check.registryPath),
    summary,
    results: check.results
  };
  const checkPath = checkPathFor(repoRoot, runId, outDir);
  if (!options["no-write"]) writeJson(checkPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "validation",
    event: "validation",
    summary: `Artifact Inventory check ${summary.fail === 0 ? "passed" : "failed"}.`,
    artifactsRead: [payload.manifestPath, payload.registryPath],
    artifactsChanged: options["no-write"] ? [] : [path.relative(repoRoot, checkPath)],
    commands: ["foundation:file-registry:check"],
    checks: [{ name: "file-registry-check", result: summary.fail === 0 ? "passed" : "failed" }],
    result: summary.fail === 0 ? "Artifact Inventory check passed." : "Artifact Inventory check failed.",
    nextAction: summary.fail === 0 ? "Run Artifact Inventory eval or advance to next gate." : "Fix Artifact Inventory check failures."
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(renderResultsText("Artifact Inventory check", check.results));
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
