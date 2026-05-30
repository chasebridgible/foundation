#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  markSplitQueueRowsForCapabilities,
  nextSplitQueueTarget,
  parseCapabilityIds,
  parseCliArgs,
  readCapabilityMatrixRows,
  readJsonl,
  splitQueuePathFor,
  writeJsonl
} from "./split-queue-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:split-queue:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --next [--out-dir path]
  npm run foundation:split-queue:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --capability-ids cap:a,cap:b --slices-json '[...]' [--run-log path]

Creates reviewed queue slices from Capability Map rows. Generated slice files, --all, and --batch-size shortcuts are rejected.`;
}

function readSliceSpecs(options) {
  if (options["slices-file"]) {
    throw new Error("Define Spec Jobs fill does not accept --slices-file; pass reviewed --slices-json inline");
  }
  if (!options["slices-json"]) {
    throw new Error("Missing --slices-json");
  }
  let payload;
  try {
    payload = JSON.parse(options["slices-json"]);
  } catch (error) {
    throw new Error(`Split queue slice JSON did not parse: ${error.message}`);
  }
  const specs = Array.isArray(payload) ? payload : payload?.slices || payload?.queue;
  if (!Array.isArray(specs) || specs.length === 0) {
    throw new Error("Split queue slice JSON must be an array or an object with a non-empty slices array");
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
    throw new Error("Define Spec Jobs fill does not support --all or --batch-size; select reviewed capabilities explicitly with --capability-ids");
  }

  const repoRoot = path.resolve(options.repo);
  const runId = options["run-id"];
  const outDir = options["out-dir"] ? path.resolve(repoRoot, options["out-dir"]) : defaultBackfillDir(repoRoot);
  const capabilityMatrix = readCapabilityMatrixRows(repoRoot, runId, outDir);
  if (capabilityMatrix.errors.length > 0) throw new Error(`Capability Map JSONL has parse errors: ${JSON.stringify(capabilityMatrix.errors)}`);
  const queuePath = splitQueuePathFor(repoRoot, runId, outDir);
  const queue = readJsonl(queuePath);
  if (queue.errors.length > 0) throw new Error(`Define Spec Jobs JSONL has parse errors: ${JSON.stringify(queue.errors)}`);

  if (options.next) {
    console.log(JSON.stringify({
      schema: "foundation.backfill.split-queue-next-target.v1",
      runId,
      target: nextSplitQueueTarget({
        capabilityRows: capabilityMatrix.rows,
        queueRows: queue.rows
      })
    }, null, 2));
    return;
  }

  const marked = markSplitQueueRowsForCapabilities({
    capabilityRows: capabilityMatrix.rows,
    queueRows: queue.rows,
    capabilityIds: parseCapabilityIds(options["capability-ids"]),
    sliceSpecs: readSliceSpecs(options)
  });
  writeJsonl(queuePath, marked.rows);

  const pendingCount = marked.rows.filter(row => row.status === "pending").length;
  const inProgressCount = marked.rows.filter(row => row.status === "in-progress").length;
  const eventType = marked.revisionCount > 0 ? "revision" : "checkpoint";
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "spec-job-queue",
    event: eventType,
    summary: marked.revisionCount > 0
      ? `Revised Define Spec Jobs rows for ${marked.markedCapabilityIds.length} capability row(s).`
      : `Marked Define Spec Jobs rows for ${marked.markedCapabilityIds.length} capability row(s).`,
    artifactsRead: [path.relative(repoRoot, capabilityMatrix.registryPath), path.relative(repoRoot, queuePath)],
    artifactsChanged: [path.relative(repoRoot, queuePath)],
    commands: ["foundation:split-queue:fill"],
    checks: [],
    result: `${marked.sliceCount} queue slice row(s) written for reviewed capability group.`,
    nextAction: pendingCount > 0 || inProgressCount > 0
      ? "Split or finalize the next pending queue slice."
      : "Run Define Spec Jobs checker and eval."
  });

  console.log(`Define Spec Jobs fill
Capability rows reviewed: ${marked.markedCapabilityIds.length}
Queue slices written: ${marked.sliceCount}
Pending remaining: ${pendingCount}
In-progress remaining: ${inProgressCount}
Queue slices: ${marked.rows.length}`);
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
