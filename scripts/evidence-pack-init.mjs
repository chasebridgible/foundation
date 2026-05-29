#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  createInitialEvidencePackRows,
  defaultBackfillDir,
  evidencePackPathFor,
  parseCliArgs,
  renderResultsText,
  summarizeResults,
  validateSplitQueueHandoff,
  writeJsonl
} from "./evidence-pack-core.mjs";
import { splitQueueArtifactFingerprint } from "./split-queue-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:evidence-pack:init -- --repo /path/to/repo --run-id YYYYMMDD-NN [--out-dir path] [--report path] [--run-log path]

Creates the canonical pending Evidence Pack JSONL skeleton from a passing Split And Queue handoff.`;
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
  const handoff = validateSplitQueueHandoff(repoRoot, runId, outDir, reportPath);
  const summary = summarizeResults(handoff.results);
  if (summary.fail > 0) {
    console.log(renderResultsText("Evidence Pack init", handoff.results));
    process.exit(1);
  }

  const queueFingerprint = splitQueueArtifactFingerprint(repoRoot, runId, outDir);
  const rows = createInitialEvidencePackRows(handoff.queueRows, queueFingerprint);
  const packPath = evidencePackPathFor(repoRoot, runId, outDir);
  writeJsonl(packPath, rows);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "evidence-pack",
    event: "start",
    summary: "Initialized Evidence Pack from passing Split And Queue handoff.",
    artifactsRead: [path.relative(repoRoot, handoff.queuePath)],
    artifactsChanged: [path.relative(repoRoot, packPath)],
    commands: ["foundation:evidence-pack:init"],
    checks: [{ name: "split-queue-handoff", result: "passed" }],
    durationSeconds: 0,
    result: `${rows.length} pending Evidence Pack row(s) created from active Split And Queue slices.`,
    nextAction: "Use the Evidence Pack fill loop: collect bounded source and verification evidence for each queued slice, then run check and eval."
  });

  console.log(renderResultsText("Evidence Pack init", [
    ...handoff.results,
    { id: "evidence-pack-skeleton", status: "pass", message: `Created ${rows.length} pending Evidence Pack row(s)` }
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
