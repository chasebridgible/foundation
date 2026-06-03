#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  authorSpecsPathFor,
  authorSpecsRefreshPathFor,
  defaultBackfillDir,
  mergeAuthorSpecRowsForRefresh,
  parseCliArgs,
  readAuthorSpecsRows,
  writeJson,
  writeJsonl
} from "./author-specs-core.mjs";
import {
  processActionMapArtifactFingerprint,
  readProcessActionMapRows
} from "./process-action-map-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:author-specs:refresh -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--run-log path]

Refreshes Author Specs rows from the current Process / Action Map. Changed or new active process rows return to pending or blocked and must be authored or evaluated again.`;
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
  const processes = readProcessActionMapRows(repoRoot, runId, outDir);
  if (processes.errors.length > 0) throw new Error(`Process / Action Map JSONL has parse errors: ${JSON.stringify(processes.errors)}`);
  const authorSpecsPath = authorSpecsPathFor(repoRoot, runId, outDir);
  const existing = readAuthorSpecsRows(repoRoot, runId, outDir);
  if (existing.errors.length > 0) throw new Error(`Author Specs JSONL has parse errors: ${JSON.stringify(existing.errors)}`);

  const merged = mergeAuthorSpecRowsForRefresh({
    processRows: processes.rows,
    existingAuthorRows: existing.rows,
    processMapFingerprint: processActionMapArtifactFingerprint(repoRoot, runId, outDir)
  });
  const payload = {
    schema: "foundation.backfill.author-specs-refresh.v1",
    runId,
    generatedAt: new Date().toISOString(),
    changed: merged.changed,
    removed: merged.removed,
    changedCount: merged.changed.length,
    removedCount: merged.removed.length,
    pendingCount: merged.rows.filter(row => row.status === "pending").length,
    blockedCount: merged.rows.filter(row => row.status === "blocked").length
  };
  const refreshPath = authorSpecsRefreshPathFor(repoRoot, runId, outDir);
  writeJsonl(authorSpecsPath, merged.rows);
  writeJson(refreshPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "author-specs",
    event: "checkpoint",
    summary: `Refreshed Author Specs: ${payload.changedCount} changed/new Process / Action Map rows, ${payload.removedCount} removed rows.`,
    artifactsRead: [path.relative(repoRoot, processes.processMapPath), path.relative(repoRoot, authorSpecsPath)],
    artifactsChanged: [path.relative(repoRoot, authorSpecsPath), path.relative(repoRoot, refreshPath)],
    commands: ["foundation:author-specs:refresh"],
    checks: [],
    nextAction: payload.pendingCount > 0 ? "Fill pending Author Specs rows." : "Run Author Specs check."
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
