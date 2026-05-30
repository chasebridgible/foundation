#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  manifestPathFor,
  mapRegistryRow,
  parseCliArgs,
  readJson,
  readJsonl,
  registryPathFor,
  writeJsonl
} from "./file-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:file-registry:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN [--batch-size 25|--all] [--out-dir path] [--run-log path]

Maps pending inventory rows with deterministic V1 static evidence. This is a fill-loop helper, not a replacement for human/agent review when eval finds weak rows.`;
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
  const manifest = readJson(manifestPathFor(repoRoot, runId, outDir));
  const parsed = readJsonl(registryPathFor(repoRoot, runId, outDir));
  if (parsed.errors.length > 0) throw new Error(`Registry JSONL has parse errors: ${JSON.stringify(parsed.errors)}`);

  const manifestByPath = new Map(manifest.files.map(file => [file.path, file]));
  const manifestPaths = new Set(manifest.files.map(file => file.path));
  const batchSize = options.all ? Number.POSITIVE_INFINITY : Number(options["batch-size"] || 25);
  const pendingRows = parsed.rows.filter(row => row.status === "pending").slice(0, batchSize);
  const selected = new Set(pendingRows.map(row => row.path));
  const filledRows = parsed.rows.map(row => {
    if (!selected.has(row.path)) return row;
    return mapRegistryRow({ repoRoot, entry: manifestByPath.get(row.path), manifestPaths });
  });

  writeJsonl(registryPathFor(repoRoot, runId, outDir), filledRows);
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "artifact-inventory",
    event: "checkpoint",
    summary: `Mapped ${selected.size} Artifact Inventory row(s).`,
    artifactsRead: [path.relative(repoRoot, manifestPathFor(repoRoot, runId, outDir))],
    artifactsChanged: [path.relative(repoRoot, registryPathFor(repoRoot, runId, outDir))],
    commands: ["foundation:file-registry:fill"],
    checks: [],
    nextAction: filledRows.some(row => row.status === "pending") ? "Continue filling pending rows." : "Run Artifact Inventory check and eval."
  });

  const remaining = filledRows.filter(row => row.status === "pending").length;
  console.log(`Artifact Inventory fill\nMapped: ${selected.size}\nPending remaining: ${remaining}`);
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
