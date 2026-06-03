#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  mergeProcessActionMapRowsForRefresh,
  parseCliArgs,
  processActionMapPathFor,
  processActionMapRefreshPathFor,
  readContextPackRows,
  readProcessActionMapRows,
  writeJson,
  writeJsonl
} from "./process-action-map-core.mjs";
import { contextPackArtifactFingerprint } from "./context-pack-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:process-action-map:refresh -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--run-log path]

Refreshes Process / Action Map rows from the current Context Pack. Changed or new active Context Packs return to pending and must be extracted again.`;
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
  const packs = readContextPackRows(repoRoot, runId, outDir);
  if (packs.errors.length > 0) throw new Error(`Context Pack JSONL has parse errors: ${JSON.stringify(packs.errors)}`);
  const processMapPath = processActionMapPathFor(repoRoot, runId, outDir);
  const existing = readProcessActionMapRows(repoRoot, runId, outDir);
  if (existing.errors.length > 0) throw new Error(`Process / Action Map JSONL has parse errors: ${JSON.stringify(existing.errors)}`);

  const merged = mergeProcessActionMapRowsForRefresh({
    packRows: packs.rows,
    existingProcessRows: existing.rows,
    packArtifactFingerprint: contextPackArtifactFingerprint(repoRoot, runId, outDir)
  });
  const payload = {
    schema: "foundation.backfill.process-action-map-refresh.v1",
    runId,
    generatedAt: new Date().toISOString(),
    changed: merged.changed,
    removed: merged.removed,
    changedCount: merged.changed.length,
    removedCount: merged.removed.length,
    pendingCount: merged.rows.filter(row => row.status === "pending").length
  };
  const refreshPath = processActionMapRefreshPathFor(repoRoot, runId, outDir);
  writeJsonl(processMapPath, merged.rows);
  writeJson(refreshPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "process-action-map",
    event: "checkpoint",
    summary: `Refreshed Process / Action Map: ${payload.changedCount} changed/new Context Packs, ${payload.removedCount} removed rows.`,
    artifactsRead: [path.relative(repoRoot, packs.packPath), path.relative(repoRoot, processMapPath)],
    artifactsChanged: [path.relative(repoRoot, processMapPath), path.relative(repoRoot, refreshPath)],
    commands: ["foundation:process-action-map:refresh"],
    checks: [],
    nextAction: payload.pendingCount > 0 ? "Fill pending Process / Action Map rows." : "Run Process / Action Map check."
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
