#!/usr/bin/env node
import path from "node:path";
import {
  formatResults,
  parseCliArgs,
  validateGraphMetadata,
  writeJson
} from "./visible-business-graph-core.mjs";

let args;
try {
  args = parseCliArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const repoRoot = path.resolve(args.repo || ".");
const validation = validateGraphMetadata(repoRoot);

if (args.out) writeJson(path.resolve(args.out), {
  summary: validation.summary,
  results: validation.results
});

console.log(formatResults(validation.results));
console.log(`Summary: ${JSON.stringify(validation.summary)}`);

if ((validation.summary.fail || 0) > 0) process.exit(1);
