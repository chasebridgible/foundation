#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  markSurfaceRowsForFile,
  nextSurfaceRegistryTarget,
  parseCliArgs,
  readFileRegistryRows,
  readJsonl,
  surfaceRegistryPathFor,
  writeJsonl
} from "./surface-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:surface-registry:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --next [--out-dir path]
  npm run foundation:surface-registry:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --path repo/relative/file --surfaces-json '[...]' [--run-log path]

Marks Surface / Function Map rows for one eligible upstream file after an agent has read that complete file. Use --next to choose the next pending or failed eligible file, then read it before calling --path. Do not generate rows with helper scripts or pass a file of generated surfaces.`;
}

function readSurfaceSpecs(options) {
  if (options["surfaces-file"]) {
    throw new Error("Surface / Function Map fill no longer accepts --surfaces-file; pass one file's reviewed --surfaces-json after the agent reads that file");
  }
  if (!options["surfaces-json"]) {
    throw new Error("Missing --surfaces-json");
  }
  const raw = options["surfaces-json"];
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Surface spec JSON did not parse: ${error.message}`);
  }
  const specs = Array.isArray(payload) ? payload : payload?.surfaces;
  if (!Array.isArray(specs) || specs.length === 0) {
    throw new Error("Surface spec JSON must be an array or an object with a non-empty surfaces array");
  }
  return specs;
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
  if (fileRegistry.errors.length > 0) throw new Error(`Artifact Inventory JSONL has parse errors: ${JSON.stringify(fileRegistry.errors)}`);
  const surfacePath = surfaceRegistryPathFor(repoRoot, runId, outDir);
  const surfaces = readJsonl(surfacePath);
  if (surfaces.errors.length > 0) throw new Error(`Surface / Function Map JSONL has parse errors: ${JSON.stringify(surfaces.errors)}`);

  if (options.all || options["batch-size"]) {
    throw new Error("Surface / Function Map fill no longer supports --all or --batch-size; mark one eligible --path after reading the full file");
  }

  if (options.next) {
    console.log(JSON.stringify({
      schema: "foundation.backfill.surface-registry-next-target.v1",
      runId,
      target: nextSurfaceRegistryTarget({
        fileRows: fileRegistry.rows,
        surfaceRows: surfaces.rows
      })
    }, null, 2));
    return;
  }

  const marked = markSurfaceRowsForFile({
    fileRows: fileRegistry.rows,
    surfaceRows: surfaces.rows,
    filePath: options.path,
    surfaceSpecs: readSurfaceSpecs(options)
  });
  writeJsonl(surfacePath, marked.rows);

  const pendingCount = marked.rows.filter(row => row.status === "pending").length;
  const needsEvidenceCount = marked.rows.filter(row => row.status === "needs-evidence").length;
  const eventType = marked.revisionCount > 0 ? "revision" : "checkpoint";
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "surface-map",
    event: eventType,
    summary: marked.revisionCount > 0
      ? `Revised Surface / Function Map rows for ${marked.markedPath} after full-file agent read.`
      : `Marked Surface / Function Map rows for ${marked.markedPath} after full-file agent read.`,
    artifactsRead: [path.relative(repoRoot, fileRegistry.registryPath), path.relative(repoRoot, surfacePath), marked.markedPath],
    artifactsChanged: [path.relative(repoRoot, surfacePath)],
    commands: ["foundation:surface-registry:fill"],
    checks: [],
    result: `${marked.surfaceCount} surface row(s) written for one upstream file.`,
    nextAction: pendingCount > 0 || needsEvidenceCount > 0
      ? "Read and mark the next pending or failed Surface / Function Map file."
      : "Run Surface / Function Map checker and eval."
  });

  console.log(`Surface / Function Map fill\nMarked file: ${marked.markedPath}\nSurface rows written for file: ${marked.surfaceCount}\nPending remaining: ${pendingCount}\nNeeds evidence remaining: ${needsEvidenceCount}\nSurface rows: ${marked.rows.length}`);
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
