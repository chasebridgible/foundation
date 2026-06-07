#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  buildGraph,
  parseCliArgs,
  readJson
} from "./visible-business-graph-core.mjs";

let args;
try {
  args = parseCliArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const repoRoot = path.resolve(args.repo || ".");
const graphPath = path.resolve(args.graph || path.join(repoRoot, "docs", "visible-business-graph", "foundation-graph.json"));
const canvasPath = path.resolve(args.canvas || path.join(repoRoot, "docs", "visible-business-graph", "foundation-canvas.html"));

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}

function normalizeGraph(graph, { canvas = false } = {}) {
  return stable({
    ...graph,
    generatedAt: "<ignored>",
    nodes: (graph.nodes || []).map(node => {
      if (!canvas) return node;
      const { href, ...rest } = node;
      return rest;
    })
  });
}

function sameGraph(left, right) {
  return JSON.stringify(normalizeGraph(left)) === JSON.stringify(normalizeGraph(right));
}

function extractCanvasGraph(canvasHtml) {
  const match = canvasHtml.match(/const graph = (\{[\s\S]*?\});\nconst typeLabels = /);
  if (!match) throw new Error("Canvas does not embed a visible business graph payload.");
  return JSON.parse(match[1]);
}

function fail(message, details = {}) {
  console.error(`FAIL visible-business-graph-generated-current: ${message}`);
  for (const [key, value] of Object.entries(details)) {
    console.error(`${key}: ${value}`);
  }
  console.error("Run:");
  console.error("  npm run foundation:visible-business-graph:build -- --repo . --out docs/visible-business-graph/foundation-graph.json");
  console.error("  npm run foundation:visible-business-graph:render -- --graph docs/visible-business-graph/foundation-graph.json --out docs/visible-business-graph/foundation-canvas.html");
  process.exit(1);
}

if (!fs.existsSync(graphPath)) {
  fail(`Missing generated graph JSON at ${path.relative(process.cwd(), graphPath)}`);
}
if (!fs.existsSync(canvasPath)) {
  fail(`Missing generated canvas HTML at ${path.relative(process.cwd(), canvasPath)}`);
}

const currentGraph = buildGraph(repoRoot);
const generatedGraph = readJson(graphPath);

if (!sameGraph(generatedGraph, currentGraph)) {
  fail("Generated graph JSON does not match current repo graph extraction.", {
    generated: `${generatedGraph.summary?.specCount || 0} specs, ${generatedGraph.summary?.nodeCount || 0} nodes, ${generatedGraph.summary?.edgeCount || 0} edges`,
    current: `${currentGraph.summary.specCount} specs, ${currentGraph.summary.nodeCount} nodes, ${currentGraph.summary.edgeCount} edges`
  });
}

let canvasGraph;
try {
  canvasGraph = extractCanvasGraph(fs.readFileSync(canvasPath, "utf8"));
} catch (error) {
  fail(error.message);
}

const normalizedCanvas = normalizeGraph(canvasGraph, { canvas: true });
const normalizedGenerated = normalizeGraph(generatedGraph);
if (JSON.stringify(normalizedCanvas) !== JSON.stringify(normalizedGenerated)) {
  fail("Generated canvas does not embed the current generated graph JSON.", {
    graph: `${generatedGraph.summary?.specCount || 0} specs, ${generatedGraph.summary?.nodeCount || 0} nodes, ${generatedGraph.summary?.edgeCount || 0} edges`,
    canvas: `${canvasGraph.summary?.specCount || 0} specs, ${canvasGraph.summary?.nodeCount || 0} nodes, ${canvasGraph.summary?.edgeCount || 0} edges`
  });
}

console.log("PASS visible-business-graph-generated-current: Generated graph JSON and canvas match current repo graph extraction.");
