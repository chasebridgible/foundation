#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  createManifest,
  defaultBackfillDir,
  manifestPathFor,
  mergeRowsForRefresh,
  parseCliArgs,
  readJsonl,
  refreshPathFor,
  registryPathFor,
  writeJson,
  writeJsonl
} from "./file-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:file-registry:refresh -- --repo /path/to/repo --run-id YYYYMMDD-NN [--fill-changed] [--out-dir path] [--run-log path]

Regenerates the manifest and preserves mapped rows whose hash/size did not change. Changed and new files return to pending unless --fill-changed is used.`;
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
  const existing = readJsonl(registryPathFor(repoRoot, runId, outDir));
  if (existing.errors.length > 0) throw new Error(`Existing Artifact Inventory JSONL has parse errors: ${JSON.stringify(existing.errors)}`);

  const manifest = createManifest({ repoRoot, runId, mode: "steady-state" });
  const merged = mergeRowsForRefresh({
    repoRoot,
    manifest,
    existingRows: existing.rows,
    fillChanged: Boolean(options["fill-changed"])
  });
  const payload = {
    schema: "foundation.backfill.file-registry-refresh.v1",
    runId,
    generatedAt: new Date().toISOString(),
    changed: merged.changed,
    removed: merged.removed,
    changedCount: merged.changed.length,
    removedCount: merged.removed.length,
    pendingCount: merged.rows.filter(row => row.status === "pending").length,
    fillChanged: Boolean(options["fill-changed"])
  };

  writeJson(manifestPathFor(repoRoot, runId, outDir), manifest);
  writeJsonl(registryPathFor(repoRoot, runId, outDir), merged.rows);
  writeJson(refreshPathFor(repoRoot, runId, outDir), payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "artifact-inventory",
    event: "checkpoint",
    summary: `Refreshed Artifact Inventory: ${payload.changedCount} changed/new, ${payload.removedCount} removed.`,
    artifactsRead: [path.relative(repoRoot, registryPathFor(repoRoot, runId, outDir))],
    artifactsChanged: [
      path.relative(repoRoot, manifestPathFor(repoRoot, runId, outDir)),
      path.relative(repoRoot, registryPathFor(repoRoot, runId, outDir)),
      path.relative(repoRoot, refreshPathFor(repoRoot, runId, outDir))
    ],
    commands: ["foundation:file-registry:refresh"],
    checks: [],
    nextAction: payload.pendingCount > 0 ? "Remap pending changed rows." : "Run Artifact Inventory check."
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
