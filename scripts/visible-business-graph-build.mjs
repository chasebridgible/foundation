#!/usr/bin/env node
import path from "node:path";
import {
  buildGraph,
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

if (!args.out) {
  console.error("Missing required --out <graph.json>");
  process.exit(1);
}

const repoRoot = path.resolve(args.repo || ".");
const validation = validateGraphMetadata(repoRoot);
if ((validation.summary.fail || 0) > 0) {
  console.error(formatResults(validation.results));
  process.exit(1);
}

const graph = buildGraph(repoRoot);
writeJson(path.resolve(args.out), graph);
console.log(`Wrote ${path.relative(process.cwd(), path.resolve(args.out))}`);
console.log(`Graph: ${graph.summary.nodeCount} nodes, ${graph.summary.edgeCount} edges, ${graph.summary.specCount} specs.`);
