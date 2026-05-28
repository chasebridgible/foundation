#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  mergeSurfaceRowsForRefresh,
  parseCliArgs,
  readFileRegistryRows,
  readJsonl,
  surfaceRefreshPathFor,
  surfaceRegistryPathFor,
  writeJson,
  writeJsonl
} from "./surface-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:surface-registry:refresh -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--run-log path]

Refreshes Surface Registry rows from the current File Registry. Changed or new eligible upstream rows return to pending and must be re-marked one file at a time after full-file agent read; inert artifacts remain skipped.`;
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
  const fileRegistry = readFileRegistryRows(repoRoot, runId, outDir);
  if (fileRegistry.errors.length > 0) throw new Error(`File Registry JSONL has parse errors: ${JSON.stringify(fileRegistry.errors)}`);
  const surfacePath = surfaceRegistryPathFor(repoRoot, runId, outDir);
  const surfaces = readJsonl(surfacePath);
  if (surfaces.errors.length > 0) throw new Error(`Surface Registry JSONL has parse errors: ${JSON.stringify(surfaces.errors)}`);
  if (options["fill-changed"]) {
    throw new Error("--fill-changed was removed for Surface Registry; read and mark each changed eligible file with foundation:surface-registry:fill");
  }

  const merged = mergeSurfaceRowsForRefresh({
    fileRows: fileRegistry.rows,
    existingSurfaceRows: surfaces.rows
  });
  const payload = {
    schema: "foundation.backfill.surface-registry-refresh.v1",
    runId,
    generatedAt: new Date().toISOString(),
    changed: merged.changed,
    removed: merged.removed,
    changedCount: merged.changed.length,
    removedCount: merged.removed.length,
    skippedCount: merged.skipped.length,
    pendingCount: merged.rows.filter(row => row.status === "pending").length
  };
  const refreshPath = surfaceRefreshPathFor(repoRoot, runId, outDir);
  writeJsonl(surfacePath, merged.rows);
  writeJson(refreshPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "surface-registry",
    event: "checkpoint",
    summary: `Refreshed Surface Registry: ${payload.changedCount} changed/new eligible upstream files, ${payload.removedCount} removed surface rows, ${payload.skippedCount} inert file rows skipped.`,
    artifactsRead: [path.relative(repoRoot, fileRegistry.registryPath), path.relative(repoRoot, surfacePath)],
    artifactsChanged: [path.relative(repoRoot, surfacePath), path.relative(repoRoot, refreshPath)],
    commands: ["foundation:surface-registry:refresh"],
    checks: [],
    nextAction: payload.pendingCount > 0 ? "Read and mark pending changed Surface Registry-eligible files one file at a time." : "Run Surface Registry check."
  });

  console.log(JSON.stringify(payload, null, 2));
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
