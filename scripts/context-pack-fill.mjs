#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  contextPackPathFor,
  markContextPackRowsForSlices,
  nextContextPackTarget,
  parseCliArgs,
  parseSliceIds,
  readContextPackRows,
  readJsonl,
  writeJsonl
} from "./context-pack-core.mjs";
import {
  specJobQueueArtifactFingerprint,
  specJobQueuePathFor
} from "./spec-job-queue-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:context-pack:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --next [--out-dir path]
  npm run foundation:context-pack:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --slice-ids slice:a,slice:b --packs-json '[...]' [--run-log path]

Creates reviewed Context Pack rows from Define Spec Jobs slices. Generated pack files, --all, and --batch-size shortcuts are rejected.`;
}

function readPackSpecs(options) {
  if (options["packs-file"]) {
    throw new Error("Context Pack fill does not accept --packs-file; pass reviewed --packs-json inline");
  }
  if (!options["packs-json"]) throw new Error("Missing --packs-json");
  let payload;
  try {
    payload = JSON.parse(options["packs-json"]);
  } catch (error) {
    throw new Error(`Context Pack JSON did not parse: ${error.message}`);
  }
  const specs = Array.isArray(payload) ? payload : payload?.packs || payload?.contextPacks;
  if (!Array.isArray(specs) || specs.length === 0) {
    throw new Error("Context Pack JSON must be an array or an object with a non-empty packs array");
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
    throw new Error("Context Pack fill does not support --all or --batch-size; select reviewed slices explicitly with --slice-ids");
  }

  const repoRoot = path.resolve(options.repo);
  const runId = options["run-id"];
  const outDir = options["out-dir"] ? path.resolve(repoRoot, options["out-dir"]) : defaultBackfillDir(repoRoot);
  const queuePath = specJobQueuePathFor(repoRoot, runId, outDir);
  const queue = readJsonl(queuePath);
  if (queue.errors.length > 0) throw new Error(`Define Spec Jobs JSONL has parse errors: ${JSON.stringify(queue.errors)}`);
  const pack = readContextPackRows(repoRoot, runId, outDir);
  if (pack.errors.length > 0) throw new Error(`Context Pack JSONL has parse errors: ${JSON.stringify(pack.errors)}`);

  if (options.next) {
    console.log(JSON.stringify({
      schema: "foundation.backfill.context-pack-next-target.v1",
      runId,
      target: nextContextPackTarget({
        queueRows: queue.rows,
        packRows: pack.rows
      })
    }, null, 2));
    return;
  }

  const marked = markContextPackRowsForSlices({
    queueRows: queue.rows,
    packRows: pack.rows,
    sliceIds: parseSliceIds(options["slice-ids"]),
    packSpecs: readPackSpecs(options),
    queueFingerprint: specJobQueueArtifactFingerprint(repoRoot, runId, outDir)
  });
  const packPath = contextPackPathFor(repoRoot, runId, outDir);
  writeJsonl(packPath, marked.rows);

  const pendingCount = marked.rows.filter(row => row.status === "pending").length;
  const packedCount = marked.rows.filter(row => row.status === "packed").length;
  const needsEvidenceCount = marked.rows.filter(row => row.status === "needs-evidence").length;
  const eventType = marked.revisionCount > 0 ? "revision" : "checkpoint";
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: marked.markedSliceIds[0] || null,
    phase: "context-pack",
    event: eventType,
    summary: marked.revisionCount > 0
      ? `Revised Context Pack rows for ${marked.markedSliceIds.length} queue slice(s).`
      : `Marked Context Pack rows for ${marked.markedSliceIds.length} queue slice(s).`,
    artifactsRead: [path.relative(repoRoot, queuePath), path.relative(repoRoot, packPath)],
    artifactsChanged: [path.relative(repoRoot, packPath)],
    commands: ["foundation:context-pack:fill"],
    checks: [],
    result: `${marked.packCount} Context Pack row(s) written for reviewed queue slice group.`,
    nextAction: pendingCount > 0 || packedCount > 0 || needsEvidenceCount > 0
      ? "Fill, finalize, or explicitly block the next Context Pack row."
      : "Run Context Pack checker and eval."
  });

  console.log(`Context Pack fill
Queue slices reviewed: ${marked.markedSliceIds.length}
Context Packs written: ${marked.packCount}
Pending remaining: ${pendingCount}
Packed remaining: ${packedCount}
Needs-evidence remaining: ${needsEvidenceCount}
Context Packs: ${marked.rows.length}`);
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
