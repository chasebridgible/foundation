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
} from "./artifact-inventory-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:artifact-inventory:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --next [--out-dir path]
  npm run foundation:artifact-inventory:fill -- --repo /path/to/repo --run-id YYYYMMDD-NN --path repo/relative/file [--out-dir path] [--run-log path]

Maps exactly one inventory row with deterministic V1 static evidence after the agent has reviewed that file. Use --next to choose the next pending file. --all and --batch-size are rejected.`;
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
    throw new Error("Artifact Inventory fill reviews exactly one file at a time; --all and --batch-size are not allowed");
  }

  const repoRoot = path.resolve(options.repo);
  const runId = options["run-id"];
  const outDir = options["out-dir"] ? path.resolve(repoRoot, options["out-dir"]) : defaultBackfillDir(repoRoot);
  const manifest = readJson(manifestPathFor(repoRoot, runId, outDir));
  const parsed = readJsonl(registryPathFor(repoRoot, runId, outDir));
  if (parsed.errors.length > 0) throw new Error(`Registry JSONL has parse errors: ${JSON.stringify(parsed.errors)}`);

  const manifestByPath = new Map(manifest.files.map(file => [file.path, file]));
  const manifestPaths = new Set(manifest.files.map(file => file.path));
  if (options.next) {
    const target = parsed.rows.find(row => row.status === "pending") || null;
    console.log(JSON.stringify({
      schema: "foundation.backfill.artifact-inventory-next-target.v1",
      runId,
      target
    }, null, 2));
    return;
  }

  if (!options.path) {
    throw new Error("Missing --path. Select one file with --next, read it, then fill that same file with --path.");
  }

  const selectedPath = String(options.path).split(path.sep).join("/");
  if (!manifestByPath.has(selectedPath)) throw new Error(`Artifact Inventory fill path is not in manifest: ${selectedPath}`);
  if (!parsed.rows.some(row => row.path === selectedPath)) throw new Error(`Artifact Inventory fill path is not in registry: ${selectedPath}`);

  const filledRows = parsed.rows.map(row => {
    if (row.path !== selectedPath) return row;
    return mapRegistryRow({ repoRoot, entry: manifestByPath.get(row.path), manifestPaths });
  });

  writeJsonl(registryPathFor(repoRoot, runId, outDir), filledRows);
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "artifact-inventory",
    event: "checkpoint",
    summary: `Mapped Artifact Inventory row for ${selectedPath}.`,
    artifactsRead: [path.relative(repoRoot, manifestPathFor(repoRoot, runId, outDir))],
    artifactsChanged: [path.relative(repoRoot, registryPathFor(repoRoot, runId, outDir))],
    commands: ["foundation:artifact-inventory:fill"],
    checks: [],
    nextAction: filledRows.some(row => row.status === "pending") ? "Continue filling pending rows." : "Run Artifact Inventory check and eval."
  });

  const remaining = filledRows.filter(row => row.status === "pending").length;
  console.log(`Artifact Inventory fill\nMapped: ${selectedPath}\nPending remaining: ${remaining}`);
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
