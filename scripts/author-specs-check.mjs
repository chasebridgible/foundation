#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  authorSpecsArtifactFingerprint,
  authorSpecsCheckPathFor,
  defaultBackfillDir,
  parseCliArgs,
  renderResultsText,
  summarizeResults,
  validateAuthorSpecs,
  writeJson
} from "./author-specs-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:author-specs:check -- --repo /path/to/repo --run-id YYYYMMDD-NN [--phase batch|handoff] [--report path] [--json] [--no-write]

Validates Author Specs structure, upstream Process / Action Map references, target spec files, freshness, and optional report state.`;
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
  const phase = options.phase || "handoff";
  const reportPath = options.report ? path.resolve(repoRoot, options.report) : null;
  const check = validateAuthorSpecs({ repoRoot, runId, outDir, phase, reportPath });
  const summary = summarizeResults(check.results);
  const payload = {
    schema: "foundation.backfill.author-specs-check.v1",
    runId,
    phase,
    generatedAt: new Date().toISOString(),
    processMapPath: path.relative(repoRoot, check.processMapPath || ""),
    authorSpecsPath: path.relative(repoRoot, check.authorSpecsPath),
    authorSpecsFingerprint: authorSpecsArtifactFingerprint(repoRoot, runId, outDir),
    reportPath: reportPath ? path.relative(repoRoot, reportPath) : null,
    summary,
    results: check.results
  };
  const checkPath = authorSpecsCheckPathFor(repoRoot, runId, outDir);
  if (!options["no-write"]) writeJson(checkPath, payload);

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "validation",
    event: "validation",
    summary: `Author Specs check ${summary.fail === 0 ? "passed" : "failed"}.`,
    artifactsRead: [payload.processMapPath, payload.authorSpecsPath].filter(Boolean),
    artifactsChanged: options["no-write"] ? [] : [path.relative(repoRoot, checkPath)],
    commands: ["foundation:author-specs:check"],
    checks: [{ name: "author-specs-check", result: summary.fail === 0 ? "passed" : "failed" }],
    result: summary.fail === 0 ? "Author Specs check passed." : "Author Specs check failed.",
    nextAction: summary.fail === 0 ? "Run Author Specs eval or record handoff." : "Fix Author Specs check failures."
  });

  if (options.json) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log(renderResultsText("Author Specs check", check.results));
  }
  if (summary.fail > 0) process.exit(1);
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
