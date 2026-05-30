#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultBackfillDir,
  parseCliArgs,
  readJsonl,
  registryPathFor,
  renderResultsText,
  summarizeResults,
  validateGraphLinks
} from "./file-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:file-registry:graph-check -- --repo /path/to/repo --run-id YYYYMMDD-NN [--mode bootstrap|strict] [--json]

Validates file-to-spec, file-to-capability, and verification/test-gap links.`;
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
  const parsed = readJsonl(registryPathFor(repoRoot, runId, outDir));
  if (parsed.errors.length > 0) throw new Error(`Registry JSONL has parse errors: ${JSON.stringify(parsed.errors)}`);
  const results = validateGraphLinks({ repoRoot, rows: parsed.rows, strict: (options.mode || "bootstrap") === "strict" });
  const summary = summarizeResults(results);

  if (options.json) {
    console.log(JSON.stringify({ schema: "foundation.backfill.file-registry-graph-check.v1", runId, summary, results }, null, 2));
  } else {
    console.log(renderResultsText("Artifact Inventory graph check", results));
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
