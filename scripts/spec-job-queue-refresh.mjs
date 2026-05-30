#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  mergeSpecJobQueueRowsForRefresh,
  parseCliArgs,
  readCapabilityMapRows,
  readJsonl,
  specJobQueuePathFor,
  specJobQueueRefreshPathFor,
  writeJson,
  writeJsonl
} from "./spec-job-queue-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:spec-job-queue:refresh -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--run-log path]

Refreshes Define Spec Jobs rows from the current Capability Map. Changed or new terminal capabilities return to pending and must be split or queued again.`;
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
  const capabilityMap = readCapabilityMapRows(repoRoot, runId, outDir);
  if (capabilityMap.errors.length > 0) throw new Error(`Capability Map JSONL has parse errors: ${JSON.stringify(capabilityMap.errors)}`);
  const queuePath = specJobQueuePathFor(repoRoot, runId, outDir);
  const existing = readJsonl(queuePath);
  if (existing.errors.length > 0) throw new Error(`Define Spec Jobs JSONL has parse errors: ${JSON.stringify(existing.errors)}`);

  const merged = mergeSpecJobQueueRowsForRefresh({
    capabilityRows: capabilityMap.rows,
    existingQueueRows: existing.rows
  });
  const payload = {
    schema: "foundation.backfill.spec-job-queue-refresh.v1",
    runId,
    generatedAt: new Date().toISOString(),
    changed: merged.changed,
    removed: merged.removed,
    changedCount: merged.changed.length,
    removedCount: merged.removed.length,
    pendingCount: merged.rows.filter(row => row.status === "pending").length
  };
  const refreshPath = specJobQueueRefreshPathFor(repoRoot, runId, outDir);
  writeJsonl(queuePath, merged.rows);
  writeJson(refreshPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "spec-job-queue",
    event: "checkpoint",
    summary: `Refreshed Define Spec Jobs: ${payload.changedCount} changed/new upstream capabilities, ${payload.removedCount} removed queue slices.`,
    artifactsRead: [path.relative(repoRoot, capabilityMap.registryPath), path.relative(repoRoot, queuePath)],
    artifactsChanged: [path.relative(repoRoot, queuePath), path.relative(repoRoot, refreshPath)],
    commands: ["foundation:spec-job-queue:refresh"],
    checks: [],
    nextAction: payload.pendingCount > 0 ? "Split and mark pending Define Spec Jobs rows." : "Run Define Spec Jobs check."
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
