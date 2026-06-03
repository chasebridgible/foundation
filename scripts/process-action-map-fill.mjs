#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  markProcessActionMapRows,
  nextProcessActionMapTarget,
  parseCliArgs,
  processActionMapPathFor,
  readProcessActionMapEvalRows,
  readContextPackRows,
  readProcessActionMapRows,
  writeJsonl
} from "./process-action-map-core.mjs";
import { contextPackArtifactFingerprint } from "./context-pack-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:process-action-map:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --next [--out-dir path]
  npm run foundation:process-action-map:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --pack-id pack:a --processes-json '{...}' [--run-log path]
  npm run foundation:process-action-map:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --slice-id slice:a --processes-json '{...}' [--run-log path]

Writes exactly one reviewed Process / Action Map row from exactly one Context Pack row. Generated process files, --all, --batch-size, multiple IDs, and multi-row payloads are rejected.`;
}

function readProcessSpecs(options) {
  if (options["processes-file"]) {
    throw new Error("Process / Action Map fill does not accept --processes-file; pass reviewed --processes-json inline");
  }
  if (!options["processes-json"]) throw new Error("Missing --processes-json");
  let payload;
  try {
    payload = JSON.parse(options["processes-json"]);
  } catch (error) {
    throw new Error(`Process / Action Map JSON did not parse: ${error.message}`);
  }
  const specs = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.processes)
      ? payload.processes
      : Array.isArray(payload?.processActionRows)
        ? payload.processActionRows
        : (payload && typeof payload === "object" ? [payload] : []);
  if (!Array.isArray(specs) || specs.length !== 1) {
    throw new Error("Process / Action Map fill requires exactly one process spec in --processes-json");
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
    throw new Error("Process / Action Map fill reviews exactly one Context Pack row at a time; --all and --batch-size are not allowed");
  }

  const repoRoot = path.resolve(options.repo);
  const runId = options["run-id"];
  const outDir = options["out-dir"] ? path.resolve(repoRoot, options["out-dir"]) : defaultBackfillDir(repoRoot);
  const packs = readContextPackRows(repoRoot, runId, outDir);
  if (packs.errors.length > 0) throw new Error(`Context Pack JSONL has parse errors: ${JSON.stringify(packs.errors)}`);
  const processMap = readProcessActionMapRows(repoRoot, runId, outDir);
  if (processMap.errors.length > 0) throw new Error(`Process / Action Map JSONL has parse errors: ${JSON.stringify(processMap.errors)}`);
  const evalReceipts = readProcessActionMapEvalRows(repoRoot, runId, outDir);
  if (evalReceipts.errors.length > 0) throw new Error(`Process / Action Map eval JSONL has parse errors: ${JSON.stringify(evalReceipts.errors)}`);

  if (options.next) {
    console.log(JSON.stringify({
      schema: "foundation.backfill.process-action-map-next-target.v1",
      runId,
      target: nextProcessActionMapTarget({
        packRows: packs.rows,
        processRows: processMap.rows,
        evalRows: evalReceipts.rows
      })
    }, null, 2));
    return;
  }

  const marked = markProcessActionMapRows({
    packRows: packs.rows,
    processRows: processMap.rows,
    evalRows: evalReceipts.rows,
    packId: options["pack-id"],
    packIds: options["pack-ids"],
    sliceId: options["slice-id"],
    sliceIds: options["slice-ids"],
    processSpecs: readProcessSpecs(options),
    packArtifactFingerprint: contextPackArtifactFingerprint(repoRoot, runId, outDir)
  });
  const processMapPath = processActionMapPathFor(repoRoot, runId, outDir);
  writeJsonl(processMapPath, marked.rows);

  const pendingCount = marked.rows.filter(row => row.status === "pending").length;
  const extractedCount = marked.rows.filter(row => row.status === "extracted").length;
  const needsEvidenceCount = marked.rows.filter(row => row.status === "needs-evidence").length;
  const eventType = marked.revisionCount > 0 ? "revision" : "checkpoint";
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: marked.markedPackIds[0] || null,
    phase: "process-action-map",
    event: eventType,
    summary: marked.revisionCount > 0
      ? `Revised Process / Action Map row for Context Pack ${marked.markedPackIds[0]}.`
      : `Marked Process / Action Map row for Context Pack ${marked.markedPackIds[0]}.`,
    artifactsRead: [path.relative(repoRoot, packs.packPath), path.relative(repoRoot, processMapPath)],
    artifactsChanged: [path.relative(repoRoot, processMapPath)],
    commands: ["foundation:process-action-map:fill"],
    checks: [],
    result: `${marked.processCount} Process / Action Map row written for reviewed Context Pack row.`,
    nextAction: pendingCount > 0 || extractedCount > 0 || needsEvidenceCount > 0
      ? "Run check and row-targeted eval, revise this row until outstanding, then select the next row."
      : "Run Process / Action Map checker and row-targeted eval."
  });

  console.log(`Process / Action Map fill
Context Pack reviewed: ${marked.markedPackIds[0]}
Process rows written: ${marked.processCount}
Pending remaining: ${pendingCount}
Extracted remaining: ${extractedCount}
Needs-evidence remaining: ${needsEvidenceCount}
Process rows: ${marked.rows.length}`);
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
