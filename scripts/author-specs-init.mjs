#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  authorSpecsPathFor,
  createInitialAuthorSpecRows,
  defaultBackfillDir,
  parseCliArgs,
  renderResultsText,
  summarizeResults,
  validateProcessActionMapHandoff,
  writeJsonl
} from "./author-specs-core.mjs";
import { processActionMapArtifactFingerprint } from "./process-action-map-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:author-specs:init -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--report path] [--run-log path]

Creates the canonical pending Author Specs JSONL skeleton from a passing Process / Action Map handoff.`;
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
  const reportPath = options.report ? path.resolve(repoRoot, options.report) : null;
  const handoff = validateProcessActionMapHandoff(repoRoot, runId, outDir, reportPath);
  const summary = summarizeResults(handoff.results);
  if (summary.fail > 0) {
    console.log(renderResultsText("Author Specs init", handoff.results));
    process.exit(1);
  }

  const processMapFingerprint = processActionMapArtifactFingerprint(repoRoot, runId, outDir);
  const rows = createInitialAuthorSpecRows(handoff.processRows, processMapFingerprint);
  const authorSpecsPath = authorSpecsPathFor(repoRoot, runId, outDir);
  writeJsonl(authorSpecsPath, rows);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "author-specs",
    event: "start",
    summary: "Initialized Author Specs from passing Process / Action Map handoff.",
    artifactsRead: [path.relative(repoRoot, handoff.processMapPath)],
    artifactsChanged: [path.relative(repoRoot, authorSpecsPath)],
    commands: ["foundation:author-specs:init"],
    checks: [{ name: "process-action-map-handoff", result: "passed" }],
    durationSeconds: 0,
    result: `${rows.length} Author Specs row(s) created from active Process / Action Map rows.`,
    nextAction: "Use foundation:author-specs:fill -- --next, author exactly one target, then check/eval that row until outstanding."
  });

  console.log(renderResultsText("Author Specs init", [
    ...handoff.results,
    { id: "author-specs-skeleton", status: "pass", message: `Created ${rows.length} pending Author Specs row(s)` }
  ]));
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
