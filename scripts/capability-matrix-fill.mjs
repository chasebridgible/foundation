#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  capabilityMatrixPathFor,
  defaultBackfillDir,
  markCapabilityRowsForSurfaces,
  nextCapabilityMatrixTarget,
  parseCliArgs,
  parseSurfaceIds,
  readJsonl,
  readSurfaceRegistryRows,
  writeJsonl
} from "./capability-matrix-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:capability-matrix:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --next [--out-dir path]
  npm run foundation:capability-matrix:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --surface-ids surface:a,surface:b --capabilities-json '[...]' [--run-log path]

Groups reviewed Surface / Function Map rows into Capability Map rows. Accepted capability specs must be passed inline; generated capability files, --all, and --batch-size shortcuts are rejected.`;
}

function readCapabilitySpecs(options) {
  if (options["capabilities-file"]) {
    throw new Error("Capability Map fill does not accept --capabilities-file; pass reviewed --capabilities-json inline");
  }
  if (!options["capabilities-json"]) {
    throw new Error("Missing --capabilities-json");
  }
  let payload;
  try {
    payload = JSON.parse(options["capabilities-json"]);
  } catch (error) {
    throw new Error(`Capability spec JSON did not parse: ${error.message}`);
  }
  const specs = Array.isArray(payload) ? payload : payload?.capabilities;
  if (!Array.isArray(specs) || specs.length === 0) {
    throw new Error("Capability spec JSON must be an array or an object with a non-empty capabilities array");
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
  if (options.all || options["batch-size"]) {
    throw new Error("Capability Map fill does not support --all or --batch-size; group reviewed surfaces explicitly with --surface-ids");
  }

  const repoRoot = path.resolve(options.repo);
  const runId = options["run-id"];
  const outDir = options["out-dir"] ? path.resolve(repoRoot, options["out-dir"]) : defaultBackfillDir(repoRoot);
  const surfaceRegistry = readSurfaceRegistryRows(repoRoot, runId, outDir);
  if (surfaceRegistry.errors.length > 0) throw new Error(`Surface / Function Map JSONL has parse errors: ${JSON.stringify(surfaceRegistry.errors)}`);
  const matrixPath = capabilityMatrixPathFor(repoRoot, runId, outDir);
  const capabilityMatrix = readJsonl(matrixPath);
  if (capabilityMatrix.errors.length > 0) throw new Error(`Capability Map JSONL has parse errors: ${JSON.stringify(capabilityMatrix.errors)}`);

  if (options.next) {
    console.log(JSON.stringify({
      schema: "foundation.backfill.capability-matrix-next-target.v1",
      runId,
      target: nextCapabilityMatrixTarget({
        surfaceRows: surfaceRegistry.rows,
        capabilityRows: capabilityMatrix.rows
      })
    }, null, 2));
    return;
  }

  const marked = markCapabilityRowsForSurfaces({
    surfaceRows: surfaceRegistry.rows,
    capabilityRows: capabilityMatrix.rows,
    surfaceIds: parseSurfaceIds(options["surface-ids"]),
    capabilitySpecs: readCapabilitySpecs(options)
  });
  writeJsonl(matrixPath, marked.rows);

  const pendingCount = marked.rows.filter(row => row.status === "pending").length;
  const mappedCount = marked.rows.filter(row => row.status === "mapped").length;
  const eventType = marked.revisionCount > 0 ? "revision" : "checkpoint";
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "capability-map",
    event: eventType,
    summary: marked.revisionCount > 0
      ? `Revised Capability Map rows for ${marked.markedSurfaceIds.length} reviewed surface row(s).`
      : `Marked Capability Map rows for ${marked.markedSurfaceIds.length} reviewed surface row(s).`,
    artifactsRead: [path.relative(repoRoot, surfaceRegistry.registryPath), path.relative(repoRoot, matrixPath)],
    artifactsChanged: [path.relative(repoRoot, matrixPath)],
    commands: ["foundation:capability-matrix:fill"],
    checks: [],
    result: `${marked.capabilityCount} capability row(s) written for reviewed surface group.`,
    nextAction: pendingCount > 0 || mappedCount > 0
      ? "Group and mark the next pending Capability Map surface set."
      : "Run Capability Map checker and eval."
  });

  console.log(`Capability Map fill
Surface rows reviewed: ${marked.markedSurfaceIds.length}
Capability rows written: ${marked.capabilityCount}
Pending remaining: ${pendingCount}
Mapped intermediate remaining: ${mappedCount}
Capability rows: ${marked.rows.length}`);
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
