#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  contextPackPathFor,
  contextPackRefreshPathFor,
  mergeContextPackRowsForRefresh,
  parseCliArgs,
  readContextPackRows,
  writeJson,
  writeJsonl
} from "./context-pack-core.mjs";
import {
  readJsonl,
  specJobQueueArtifactFingerprint,
  specJobQueuePathFor
} from "./spec-job-queue-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:context-pack:refresh -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--run-log path]

Refreshes Context Pack rows from the current Define Spec Jobs. Changed or new active queue slices return to pending and must be packed again.`;
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
  const queuePath = specJobQueuePathFor(repoRoot, runId, outDir);
  const queue = readJsonl(queuePath);
  if (queue.errors.length > 0) throw new Error(`Define Spec Jobs JSONL has parse errors: ${JSON.stringify(queue.errors)}`);
  const packPath = contextPackPathFor(repoRoot, runId, outDir);
  const existing = readContextPackRows(repoRoot, runId, outDir);
  if (existing.errors.length > 0) throw new Error(`Context Pack JSONL has parse errors: ${JSON.stringify(existing.errors)}`);

  const merged = mergeContextPackRowsForRefresh({
    queueRows: queue.rows,
    existingPackRows: existing.rows,
    queueFingerprint: specJobQueueArtifactFingerprint(repoRoot, runId, outDir)
  });
  const payload = {
    schema: "foundation.backfill.context-pack-refresh.v1",
    runId,
    generatedAt: new Date().toISOString(),
    changed: merged.changed,
    removed: merged.removed,
    changedCount: merged.changed.length,
    removedCount: merged.removed.length,
    pendingCount: merged.rows.filter(row => row.status === "pending").length
  };
  const refreshPath = contextPackRefreshPathFor(repoRoot, runId, outDir);
  writeJsonl(packPath, merged.rows);
  writeJson(refreshPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "context-pack",
    event: "checkpoint",
    summary: `Refreshed Context Pack: ${payload.changedCount} changed/new upstream queue slices, ${payload.removedCount} removed packs.`,
    artifactsRead: [path.relative(repoRoot, queuePath), path.relative(repoRoot, packPath)],
    artifactsChanged: [path.relative(repoRoot, packPath), path.relative(repoRoot, refreshPath)],
    commands: ["foundation:context-pack:refresh"],
    checks: [],
    nextAction: payload.pendingCount > 0 ? "Fill pending Context Pack rows." : "Run Context Pack check."
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
