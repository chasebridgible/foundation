#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const defaultFixture = path.join(repoRoot, "docs/specs/fixtures/spec-selection-classification.jsonl");
const allowedClassifications = new Set([
  "system",
  "parent capability",
  "child capability",
  "capability",
  "job",
  "technical",
  "eval",
  "artifact/interface",
  "process/action",
  "evidence",
  "implementation detail",
  "technical-or-child-capability"
]);

function usage() {
  return `Usage:
  npm run foundation:spec-selection:eval
  npm run foundation:spec-selection:eval -- --fixtures docs/specs/fixtures/spec-selection-classification.jsonl

Validates the Spec Selection fixture shape. Semantic classification quality is governed by docs/specs/spec-selection-eval.html.`;
}

function parseArgs(argv) {
  const args = { fixtures: defaultFixture };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (token !== "--fixtures") throw new Error(`Unexpected argument: ${token}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error("Missing value for --fixtures");
    args.fixtures = path.resolve(repoRoot, value);
    index += 1;
  }
  return args;
}

function readJsonl(file) {
  if (!fs.existsSync(file)) throw new Error(`Fixture file does not exist: ${file}`);
  const rows = [];
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) continue;
    try {
      rows.push({ line: index + 1, value: JSON.parse(line) });
    } catch (error) {
      throw new Error(`${file}:${index + 1}: invalid JSON: ${error.message}`);
    }
  }
  return rows;
}

function validateFixtureRows(rows, file) {
  const required = ["id", "prompt", "expectedClassification", "reason", "commonWrongAnswer"];
  const ids = new Set();
  const errors = [];
  for (const { line, value } of rows) {
    for (const key of required) {
      if (typeof value[key] !== "string" || value[key].trim() === "") {
        errors.push(`${file}:${line}: missing non-empty ${key}`);
      }
    }
    if (ids.has(value.id)) errors.push(`${file}:${line}: duplicate id ${value.id}`);
    ids.add(value.id);
    if (value.expectedClassification && !allowedClassifications.has(value.expectedClassification)) {
      errors.push(`${file}:${line}: unsupported expectedClassification ${value.expectedClassification}`);
    }
  }
  if (rows.length < 12) errors.push(`${file}: expected at least 12 classification fixtures, found ${rows.length}`);
  return errors;
}

try {
  const args = parseArgs(process.argv.slice(2));
  const rows = readJsonl(args.fixtures);
  const errors = validateFixtureRows(rows, args.fixtures);
  if (errors.length > 0) {
    console.error(`Spec Selection eval failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Spec Selection eval passed: ${rows.length} classification fixtures validated.`);
} catch (error) {
  console.error(error.message);
  console.error("");
  console.error(usage());
  process.exit(1);
}
