#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  authorSpecsPathFor,
  defaultBackfillDir,
  markAuthorSpecRow,
  nextAuthorSpecTarget,
  parseCliArgs,
  readAuthorSpecsEvalRows,
  readAuthorSpecsRows,
  writeJsonl
} from "./author-specs-core.mjs";
import { readProcessActionMapRows } from "./process-action-map-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:author-specs:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --next [--out-dir path]
  npm run foundation:author-specs:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --process-map-id pam:a --job-spec docs/specs/job.html --technical-spec docs/specs/job-technical.html [--run-log path]

Writes exactly one Author Specs row from exactly one Process / Action Map row. Generated author files, --all, --batch-size, multiple IDs, and multi-row payloads are rejected.`;
}

function parseReviewFlags(options) {
  if (!options["review-flags-json"]) return [];
  try {
    const parsed = JSON.parse(options["review-flags-json"]);
    if (!Array.isArray(parsed)) throw new Error("review-flags-json must be an array");
    return parsed;
  } catch (error) {
    throw new Error(`review-flags-json did not parse: ${error.message}`);
  }
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
    throw new Error("Author Specs fill reviews exactly one Process / Action Map row at a time; --all and --batch-size are not allowed");
  }
  if (options["author-file"] || options["specs-file"] || options["author-json"] || options["specs-json"]) {
    throw new Error("Author Specs fill does not accept generated author/spec payload files or bulk JSON; author the spec files, then pass the two spec paths for the current --next target");
  }

  const repoRoot = path.resolve(options.repo);
  const runId = options["run-id"];
  const outDir = options["out-dir"] ? path.resolve(repoRoot, options["out-dir"]) : defaultBackfillDir(repoRoot);
  const processes = readProcessActionMapRows(repoRoot, runId, outDir);
  if (processes.errors.length > 0) throw new Error(`Process / Action Map JSONL has parse errors: ${JSON.stringify(processes.errors)}`);
  const authorSpecs = readAuthorSpecsRows(repoRoot, runId, outDir);
  if (authorSpecs.errors.length > 0) throw new Error(`Author Specs JSONL has parse errors: ${JSON.stringify(authorSpecs.errors)}`);
  const evalReceipts = readAuthorSpecsEvalRows(repoRoot, runId, outDir);
  if (evalReceipts.errors.length > 0) throw new Error(`Author Specs eval JSONL has parse errors: ${JSON.stringify(evalReceipts.errors)}`);

  if (options.next) {
    console.log(JSON.stringify({
      schema: "foundation.backfill.author-specs-next-target.v1",
      runId,
      target: nextAuthorSpecTarget({
        processRows: processes.rows,
        authorRows: authorSpecs.rows,
        evalRows: evalReceipts.rows
      })
    }, null, 2));
    return;
  }

  if (!options["job-spec"]) throw new Error("Missing --job-spec");
  if (!options["technical-spec"]) throw new Error("Missing --technical-spec");
  const marked = markAuthorSpecRow({
    repoRoot,
    processRows: processes.rows,
    authorRows: authorSpecs.rows,
    evalRows: evalReceipts.rows,
    processMapId: options["process-map-id"],
    jobSpecPath: options["job-spec"],
    technicalSpecPath: options["technical-spec"],
    status: options.status,
    renderedUxStatus: options["rendered-ux-status"],
    reviewFlags: parseReviewFlags(options)
  });
  const authorSpecsPath = authorSpecsPathFor(repoRoot, runId, outDir);
  writeJsonl(authorSpecsPath, marked.rows);

  const pendingCount = marked.rows.filter(row => row.status === "pending").length;
  const needsRevisionCount = marked.rows.filter(row => row.status === "needs-revision").length;
  const eventType = marked.revisionCount > 0 ? "revision" : "checkpoint";
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: marked.markedProcessMapId,
    phase: "author-specs",
    event: eventType,
    summary: marked.revisionCount > 0
      ? `Revised Author Specs row for Process / Action Map ${marked.markedProcessMapId}.`
      : `Marked Author Specs row for Process / Action Map ${marked.markedProcessMapId}.`,
    artifactsRead: [path.relative(repoRoot, processes.processMapPath), path.relative(repoRoot, authorSpecsPath)],
    artifactsChanged: [path.relative(repoRoot, authorSpecsPath)],
    commands: ["foundation:author-specs:fill"],
    checks: [],
    result: `Author Specs row ${marked.authorSpecId} written for reviewed Process / Action Map row.`,
    nextAction: "Run Author Specs check and row-targeted eval; revise this target until outstanding before selecting another target."
  });

  console.log(`Author Specs fill
Process row reviewed: ${marked.markedProcessMapId}
Author Specs row: ${marked.authorSpecId}
Pending remaining: ${pendingCount}
Needs-revision remaining: ${needsRevisionCount}
Author rows: ${marked.rows.length}`);
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
