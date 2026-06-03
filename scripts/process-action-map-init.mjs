#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  createInitialProcessActionMapRows,
  defaultBackfillDir,
  parseCliArgs,
  processActionMapPathFor,
  renderResultsText,
  summarizeResults,
  validateContextPackHandoff,
  writeJsonl
} from "./process-action-map-core.mjs";
import { contextPackArtifactFingerprint } from "./context-pack-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:process-action-map:init -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--report path] [--run-log path]

Creates the canonical pending Process / Action Map JSONL skeleton from a passing Context Pack handoff.`;
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
  const handoff = validateContextPackHandoff(repoRoot, runId, outDir, reportPath);
  const summary = summarizeResults(handoff.results);
  if (summary.fail > 0) {
    console.log(renderResultsText("Process / Action Map init", handoff.results));
    process.exit(1);
  }

  const packFingerprint = contextPackArtifactFingerprint(repoRoot, runId, outDir);
  const rows = createInitialProcessActionMapRows(handoff.packRows, packFingerprint);
  const processMapPath = processActionMapPathFor(repoRoot, runId, outDir);
  writeJsonl(processMapPath, rows);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "process-action-map",
    event: "start",
    summary: "Initialized Process / Action Map from passing Context Pack handoff.",
    artifactsRead: [path.relative(repoRoot, handoff.packPath)],
    artifactsChanged: [path.relative(repoRoot, processMapPath)],
    commands: ["foundation:process-action-map:init"],
    checks: [{ name: "context-pack-handoff", result: "passed" }],
    durationSeconds: 0,
    result: `${rows.length} pending Process / Action Map row(s) created from active Context Packs.`,
    nextAction: "Use the Process / Action Map fill loop: extract actors, actions, states, permissions, recovery, and graph hints for each Context Pack."
  });

  console.log(renderResultsText("Process / Action Map init", [
    ...handoff.results,
    { id: "process-action-map-skeleton", status: "pass", message: `Created ${rows.length} pending Process / Action Map row(s)` }
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
