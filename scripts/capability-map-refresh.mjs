#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  capabilityMapPathFor,
  capabilityRefreshPathFor,
  defaultBackfillDir,
  mergeCapabilityRowsForRefresh,
  parseCliArgs,
  readJsonl,
  readSurfaceFunctionMapRows,
  writeJson,
  writeJsonl
} from "./capability-map-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:capability-map:refresh -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--run-log path]

Refreshes Capability Map rows from the current Surface / Function Map. Changed or new ready surfaces return to pending and must be grouped again by an agent.`;
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
  const surfaceFunctionMap = readSurfaceFunctionMapRows(repoRoot, runId, outDir);
  if (surfaceFunctionMap.errors.length > 0) throw new Error(`Surface / Function Map JSONL has parse errors: ${JSON.stringify(surfaceFunctionMap.errors)}`);
  const matrixPath = capabilityMapPathFor(repoRoot, runId, outDir);
  const existing = readJsonl(matrixPath);
  if (existing.errors.length > 0) throw new Error(`Capability Map JSONL has parse errors: ${JSON.stringify(existing.errors)}`);

  const merged = mergeCapabilityRowsForRefresh({
    surfaceRows: surfaceFunctionMap.rows,
    existingCapabilityRows: existing.rows
  });
  const payload = {
    schema: "foundation.backfill.capability-map-refresh.v1",
    runId,
    generatedAt: new Date().toISOString(),
    changed: merged.changed,
    removed: merged.removed,
    changedCount: merged.changed.length,
    removedCount: merged.removed.length,
    pendingCount: merged.rows.filter(row => row.status === "pending").length
  };
  const refreshPath = capabilityRefreshPathFor(repoRoot, runId, outDir);
  writeJsonl(matrixPath, merged.rows);
  writeJson(refreshPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "capability-map",
    event: "checkpoint",
    summary: `Refreshed Capability Map: ${payload.changedCount} changed/new upstream surfaces, ${payload.removedCount} removed capability rows.`,
    artifactsRead: [path.relative(repoRoot, surfaceFunctionMap.registryPath), path.relative(repoRoot, matrixPath)],
    artifactsChanged: [path.relative(repoRoot, matrixPath), path.relative(repoRoot, refreshPath)],
    commands: ["foundation:capability-map:refresh"],
    checks: [],
    nextAction: payload.pendingCount > 0 ? "Group and mark pending Capability Map surfaces." : "Run Capability Map check."
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
