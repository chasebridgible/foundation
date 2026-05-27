#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  createManifest,
  createSkeletonRow,
  defaultBackfillDir,
  manifestPathFor,
  parseCliArgs,
  registryPathFor,
  renderResultsText,
  validateManifest,
  writeJson,
  writeJsonl
} from "./file-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:file-registry:init -- --repo /path/to/repo --run-id YYYYMMDD-NN [--mode backfill|steady-state] [--out-dir path] [--run-log path]

Creates the canonical manifest JSON and pending registry JSONL skeleton.`;
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
  const mode = options.mode || "backfill";
  const explicitIncludes = options["include"]
    ? String(options["include"]).split(",").map(item => item.trim()).filter(Boolean)
    : [];
  const manifest = createManifest({ repoRoot, runId, mode, explicitIncludes });
  const rows = manifest.files.map(createSkeletonRow);
  const manifestPath = manifestPathFor(repoRoot, runId, outDir);
  const registryPath = registryPathFor(repoRoot, runId, outDir);

  writeJson(manifestPath, manifest);
  writeJsonl(registryPath, rows);
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "inventory",
    event: "complete",
    summary: "Initialized file registry manifest and pending skeleton.",
    artifactsRead: [],
    artifactsChanged: [path.relative(repoRoot, manifestPath), path.relative(repoRoot, registryPath)],
    commands: ["foundation:file-registry:init"],
    checks: [{ name: "manifest-shape", result: "passed" }],
    durationSeconds: 0,
    result: `${rows.length} pending registry row(s) created.`,
    nextAction: "Fill pending rows in deterministic batches."
  });

  const results = validateManifest(manifest, runId);
  console.log(renderResultsText("File registry init", [
    ...results,
    { id: "registry-skeleton", status: "pass", message: `Created ${rows.length} pending row(s)` }
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
