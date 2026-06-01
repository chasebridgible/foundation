#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  buildGraph,
  formatResults,
  parseCliArgs,
  readJson,
  validateGraphMetadata,
  writeJson
} from "./visible-business-graph-core.mjs";

function pass(id, message) {
  return { status: "pass", id, message };
}

function fail(id, message, details = undefined) {
  return details === undefined ? { status: "fail", id, message } : { status: "fail", id, message, details };
}

function summarize(results) {
  return results.reduce((summary, item) => {
    summary[item.status] = (summary[item.status] || 0) + 1;
    return summary;
  }, { pass: 0, fail: 0 });
}

let args;
try {
  args = parseCliArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

for (const required of ["repo", "graph", "canvas", "expected"]) {
  if (!args[required]) {
    console.error(`Missing required --${required}`);
    process.exit(1);
  }
}

const repoRoot = path.resolve(args.repo);
const graphPath = path.resolve(args.graph);
const canvasPath = path.resolve(args.canvas);
const expectedPath = path.resolve(args.expected);
const expected = readJson(expectedPath);
const graph = readJson(graphPath);
const validation = validateGraphMetadata(repoRoot);
const rebuilt = buildGraph(repoRoot);
const canvas = fs.existsSync(canvasPath) ? fs.readFileSync(canvasPath, "utf8") : "";
const nodeIds = new Set(graph.nodes.map(node => node.id));
const edgeIds = new Set(graph.edges.map(edge => edge.id));
const results = [];

if ((validation.summary.fail || 0) === 0) results.push(pass("graph-check", "Graph metadata validates for repo specs."));
else results.push(fail("graph-check", "Graph metadata validation must pass.", validation.summary));

if (JSON.stringify(graph.nodes.map(node => node.id).sort()) === JSON.stringify(rebuilt.nodes.map(node => node.id).sort())) {
  results.push(pass("graph-current", "Graph JSON matches current repo graph node set."));
} else {
  results.push(fail("graph-current", "Graph JSON is stale against current repo graph node set."));
}

for (const id of expected.requiredNodeIds || []) {
  results.push(nodeIds.has(id) ? pass(`node:${id}`, `Required node exists: ${id}`) : fail(`node:${id}`, `Missing required node: ${id}`));
}
for (const id of expected.requiredEdgeIds || []) {
  results.push(edgeIds.has(id) ? pass(`edge:${id}`, `Required edge exists: ${id}`) : fail(`edge:${id}`, `Missing required edge: ${id}`));
}
for (const [type, min] of Object.entries(expected.minimumNodeTypes || {})) {
  const count = graph.nodes.filter(node => node.type === type).length;
  results.push(count >= min ? pass(`node-type:${type}`, `${type} count ${count} >= ${min}`) : fail(`node-type:${type}`, `${type} count ${count} < ${min}`));
}
if (canvas) results.push(pass("canvas-exists", "Canvas HTML exists."));
else results.push(fail("canvas-exists", "Canvas HTML must exist."));
for (const text of expected.requiredCanvasText || []) {
  results.push(canvas.includes(text) ? pass(`canvas-text:${text}`, `Canvas includes ${text}`) : fail(`canvas-text:${text}`, `Canvas missing ${text}`));
}
for (const id of expected.requiredNodeIds || []) {
  results.push(canvas.includes(id) ? pass(`canvas-node:${id}`, `Canvas embeds node ${id}`) : fail(`canvas-node:${id}`, `Canvas missing node ${id}`));
}

const summary = summarize(results);
const output = {
  summary,
  acceptable: summary.fail === 0,
  results
};
const outPath = args.out ? path.resolve(args.out) : `${graphPath.replace(/\.json$/, "")}-eval.json`;
writeJson(outPath, output);
console.log(formatResults(results));
console.log(`Summary: ${JSON.stringify(summary)}`);
console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
if (summary.fail > 0) process.exit(1);
