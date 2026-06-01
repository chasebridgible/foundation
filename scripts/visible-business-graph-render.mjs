#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import {
  findRepoRootFromPath,
  parseCliArgs,
  readJson
} from "./visible-business-graph-core.mjs";

const TYPE_LABELS = {
  system: "Systems",
  capability: "Capabilities",
  job: "Jobs",
  process: "Processes",
  actor: "Actors",
  tool: "Tools",
  evidence: "Evidence",
  metric: "Metrics",
  gap: "Gaps",
  "technical-contract": "Technical",
  evaluation: "Evaluations",
  template: "Templates",
  index: "Indexes"
};

function html(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function js(value) {
  return JSON.stringify(value).replaceAll("</", "<\\/");
}

function sourceHref(node, outPath, repoRoot) {
  if (!node.sourceFile || !repoRoot) return "";
  const target = path.join(repoRoot, node.sourceFile);
  return path.relative(path.dirname(outPath), target).split(path.sep).join("/");
}

function render(graph, outPath) {
  const repoRoot = findRepoRootFromPath(outPath) || findRepoRootFromPath(process.cwd());
  const nodes = graph.nodes.map(node => ({ ...node, href: sourceHref(node, outPath, repoRoot) }));
  const counts = nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {});
  const capabilityNodes = nodes.filter(node => node.type === "capability");
  const initialNodeId = capabilityNodes[0]?.id || nodes.find(node => node.type === "system")?.id || nodes[0]?.id || "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${html(graph.repoName)} Visible Business Graph</title>
<style>
  :root {
    --bg: #171717;
    --panel: #202020;
    --panel-2: #262626;
    --border: #363636;
    --text: #eeeeee;
    --muted: #a8a8a8;
    --faint: #737373;
    --blue: #6ea8fe;
    --green: #58d6a9;
    --amber: #e0b84f;
    --red: #ff8a75;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.45;
  }
  .app { display: grid; grid-template-columns: 280px minmax(520px, 1fr) 340px; height: 100vh; overflow: hidden; }
  aside, .details { background: var(--panel); border-color: var(--border); overflow: auto; }
  aside { border-right: 1px solid var(--border); padding: 18px; }
  .details { border-left: 1px solid var(--border); padding: 18px; }
  main { min-width: 0; padding: 20px; overflow: hidden; display: flex; flex-direction: column; }
  h1, h2, h3, p { margin-top: 0; }
  h1 { font-size: 20px; letter-spacing: 0; margin-bottom: 6px; }
  h2 { font-size: 14px; margin: 22px 0 10px; color: var(--text); }
  h3 { font-size: 13px; margin: 0 0 6px; }
  p, .muted { color: var(--muted); }
  .stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
  .stat { background: var(--panel-2); border: 1px solid var(--border); border-radius: 8px; padding: 10px; }
  .stat strong { display: block; font-size: 18px; }
  .type-list { display: grid; gap: 6px; }
  .type-button, .node-button, .tab {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel-2);
    color: var(--text);
    cursor: pointer;
    font: inherit;
    padding: 8px 10px;
    text-align: left;
  }
  .type-button.active, .node-button.active, .tab.active { border-color: var(--blue); background: rgba(110, 168, 254, 0.14); }
  .tabs { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; flex: 0 0 auto; }
  .tab { width: auto; }
  .canvas {
    position: relative;
    flex: 1 1 auto;
    min-height: 680px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: #1d1d1d;
    overflow: hidden;
    cursor: grab;
    touch-action: none;
  }
  .canvas.dragging { cursor: grabbing; }
  .graph-stage {
    position: absolute;
    left: 0;
    top: 0;
    min-width: 960px;
    min-height: 680px;
    transform-origin: 0 0;
  }
  .edge-layer { position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible; }
  .node-card {
    position: absolute;
    width: 210px;
    min-height: 88px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--panel);
    padding: 10px;
    cursor: pointer;
    overflow: hidden;
    text-align: left;
  }
  .node-card.active { outline: 2px solid var(--blue); }
  .node-card[data-expanded="true"] { border-color: var(--green); background: rgba(88, 214, 169, 0.10); }
  .node-card:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
  .node-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .node-type { color: var(--faint); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; text-transform: uppercase; }
  .node-action {
    min-width: 24px;
    height: 22px;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 13px;
  }
  .node-card[data-expanded="true"] .node-action { color: var(--green); border-color: rgba(88, 214, 169, .55); }
  .node-label { color: var(--text); font-weight: 650; margin-top: 4px; overflow-wrap: anywhere; }
  .node-source { color: var(--muted); font-size: 12px; margin-top: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .node-source-link { display: inline-block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .detail-list { display: grid; gap: 8px; }
  .detail-row { border-top: 1px solid var(--border); padding-top: 8px; }
  a { color: var(--blue); text-decoration: none; border-bottom: 1px solid rgba(110, 168, 254, 0.38); }
  .pill { display: inline-block; border: 1px solid var(--border); border-radius: 999px; color: var(--muted); padding: 2px 8px; margin: 2px 4px 2px 0; font-size: 12px; }
  @media (max-width: 1040px) {
    .app { grid-template-columns: 1fr; height: auto; overflow: visible; }
    aside, .details { border: 0; border-bottom: 1px solid var(--border); max-height: none; }
    main { padding: 14px; min-height: 720px; }
  }
</style>
</head>
<body>
<div class="app">
  <aside>
    <h1>${html(graph.repoName)} graph</h1>
    <p>Derived canvas from graph-compatible HTML specs. Canvas state is not canonical.</p>
    <div class="stats">
      <div class="stat"><strong>${graph.summary.nodeCount}</strong><span class="muted">nodes</span></div>
      <div class="stat"><strong>${graph.summary.edgeCount}</strong><span class="muted">edges</span></div>
      <div class="stat"><strong>${graph.summary.specCount}</strong><span class="muted">specs</span></div>
      <div class="stat"><strong>${Object.keys(counts).length}</strong><span class="muted">types</span></div>
    </div>
    <h2>Node Types</h2>
    <div class="type-list" id="typeList"></div>
    <h2>Nodes</h2>
    <div class="type-list" id="nodeList"></div>
  </aside>
  <main>
    <div class="tabs" id="tabs" role="tablist" aria-label="Graph views">
      <button class="tab active" role="tab" aria-selected="true" data-view="capability">Capability map</button>
      <button class="tab" role="tab" aria-selected="false" data-view="actors">Actors</button>
    </div>
    <section class="canvas" id="canvas" data-layout="top-down" aria-label="Visible business graph canvas">
      <div class="graph-stage" id="graphStage">
        <svg class="edge-layer" id="edgeLayer" aria-hidden="true"></svg>
      </div>
    </section>
  </main>
  <section class="details">
    <h2>Selection</h2>
    <div id="details"></div>
  </section>
</div>
<script>
const graph = ${js({ ...graph, nodes })};
const typeLabels = ${js(TYPE_LABELS)};
const nodesById = new Map(graph.nodes.map(node => [node.id, node]));
let selectedType = "capability";
let selectedNodeId = ${js(initialNodeId)};
let view = "capability";
let expandedCapabilityIds = new Set();
let expandedJobIds = new Set();
let expandedActorIds = new Set();
let pan = { x: 0, y: 0 };
let dragState = null;
let lastDragEndedAt = 0;
const cardSize = { width: 210, height: 88, gapX: 36, groupGapX: 48, childGapX: 24, gapY: 150, margin: 36 };

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sourceLink(node, label) {
  if (!node.href) return escapeHtml(label || node.sourceFile || node.source?.specId || "");
  const section = node.source?.sectionId ? "#" + encodeURIComponent(node.source.sectionId) : "";
  const text = label || (node.sourceFile + (node.source?.sectionId ? "#" + node.source.sectionId : ""));
  return '<a class="node-source-link" href="' + escapeHtml(node.href + section) + '">' + escapeHtml(text) + '</a>';
}

function sortedNodes(ids) {
  return [...ids]
    .map(id => nodesById.get(id))
    .filter(Boolean)
    .sort((a, b) => {
      const layerDiff = layerForNode(a) - layerForNode(b);
      if (layerDiff !== 0) return layerDiff;
      return a.label.localeCompare(b.label);
    });
}

function sortByLabel(items) {
  return [...items].sort((a, b) => a.label.localeCompare(b.label));
}

function edgeConnects(edge, fromId, toType, edgeType) {
  if (edgeType && edge.type !== edgeType) return false;
  const target = nodesById.get(edge.to);
  return edge.from === fromId && (!toType || target?.type === toType);
}

function capabilityJobs(capabilityId) {
  const ids = new Set();
  for (const edge of graph.edges) {
    if (edgeConnects(edge, capabilityId, "job", "realized-by")) ids.add(edge.to);
    if (edge.to === capabilityId && edge.type === "supports" && nodesById.get(edge.from)?.type === "job") ids.add(edge.from);
  }
  return sortedNodes(ids);
}

function jobCapabilities(jobId) {
  const ids = new Set();
  for (const edge of graph.edges) {
    if (edge.from === jobId && edge.type === "supports" && nodesById.get(edge.to)?.type === "capability") ids.add(edge.to);
    if (edge.to === jobId && edge.type === "realized-by" && nodesById.get(edge.from)?.type === "capability") ids.add(edge.from);
  }
  return sortedNodes(ids);
}

function addEdgeTargets(ids, fromId, edgeTypes, nodeTypes) {
  for (const edge of graph.edges) {
    if (edge.from !== fromId || !edgeTypes.includes(edge.type)) continue;
    const target = nodesById.get(edge.to);
    if (target && nodeTypes.includes(target.type)) ids.add(target.id);
  }
}

function actorJobs(actorId) {
  const ids = new Set();
  for (const edge of graph.edges) {
    if (edge.type === "performed-by" && edge.to === actorId && nodesById.get(edge.from)?.type === "job") ids.add(edge.from);
  }
  return sortedNodes(ids);
}

function jobContextNodes(jobId) {
  const ids = new Set();
  addEdgeTargets(ids, jobId, ["has-process"], ["process"]);
  addEdgeTargets(ids, jobId, ["performed-by"], ["actor"]);
  addEdgeTargets(ids, jobId, ["uses-tool"], ["tool"]);
  addEdgeTargets(ids, jobId, ["evidenced-by"], ["evidence"]);
  addEdgeTargets(ids, jobId, ["measured-by"], ["metric"]);
  addEdgeTargets(ids, jobId, ["has-gap"], ["gap"]);
  for (const capability of jobCapabilities(jobId)) {
    addEdgeTargets(ids, capability.id, ["measured-by"], ["metric"]);
    addEdgeTargets(ids, capability.id, ["has-gap"], ["gap"]);
  }
  return sortedNodes(ids);
}

function addExpandedJobContext(ids, jobId) {
  ids.add(jobId);
  jobCapabilities(jobId).forEach(capability => ids.add(capability.id));
  jobContextNodes(jobId).forEach(node => ids.add(node.id));
}

function nodesForCapabilityMap() {
  const ids = new Set();
  const systems = graph.nodes.filter(node => node.type === "system");
  const roots = systems.length > 0 ? systems : graph.nodes.filter(node => node.type === "index");
  roots.forEach(node => ids.add(node.id));
  graph.nodes.filter(node => node.type === "capability").forEach(node => ids.add(node.id));
  for (const capabilityId of expandedCapabilityIds) capabilityJobs(capabilityId).forEach(job => ids.add(job.id));
  for (const jobId of expandedJobIds) addExpandedJobContext(ids, jobId);
  return sortedNodes(ids);
}

function nodesForActorsMap() {
  const ids = new Set();
  graph.nodes.filter(node => node.type === "actor").forEach(node => ids.add(node.id));
  for (const actorId of expandedActorIds) actorJobs(actorId).forEach(job => ids.add(job.id));
  return sortedNodes(ids);
}

function nodesForView() {
  if (view === "capability") return nodesForCapabilityMap();
  return nodesForActorsMap();
}

function edgesForView(nodeIds) {
  const visibleEdges = graph.edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to));
  if (view === "capability") {
    return visibleEdges.filter(edge => {
      if (["contains", "realized-by", "supports"].includes(edge.type)) return true;
      if (expandedJobIds.has(edge.from) && ["has-process", "performed-by", "uses-tool", "evidenced-by", "measured-by", "has-gap"].includes(edge.type)) return true;
      if (["measured-by", "has-gap"].includes(edge.type) && nodesById.get(edge.from)?.type === "capability") return true;
      return false;
    });
  }
  return visibleEdges.filter(edge => edge.type === "performed-by");
}

function layerForNode(node) {
  if (view === "capability") {
    if (["index", "system"].includes(node.type)) return 0;
    if (node.type === "capability") return 1;
    if (node.type === "job") return 2;
    if (node.type === "process") return 3;
    if (["actor", "tool"].includes(node.type)) return 4;
    if (["evidence", "metric", "gap"].includes(node.type)) return 5;
    return 6;
  }
  if (node.type === "actor") return 0;
  if (node.type === "job") return 1;
  return 2;
}

function isExpandable(node) {
  if (view === "capability") {
    if (node.type === "capability") return capabilityJobs(node.id).length > 0;
    if (node.type === "job") return jobContextNodes(node.id).length > 0;
  }
  if (view === "actors" && node.type === "actor") return actorJobs(node.id).length > 0;
  return false;
}

function isExpanded(node) {
  if (view === "capability") {
    if (node.type === "capability") return expandedCapabilityIds.has(node.id);
    if (node.type === "job") return expandedJobIds.has(node.id);
  }
  if (view === "actors" && node.type === "actor") return expandedActorIds.has(node.id);
  return false;
}

function expansionLabel(node) {
  if (!isExpandable(node)) return "";
  if (node.type === "capability") {
    const count = capabilityJobs(node.id).length;
    return count + " job" + (count === 1 ? "" : "s");
  }
  if (node.type === "job") return "context";
  if (node.type === "actor") {
    const count = actorJobs(node.id).length;
    return count + " job" + (count === 1 ? "" : "s");
  }
  return "";
}

function toggleExpandedNode(node) {
  if (view === "capability" && node.type === "capability") {
    if (expandedCapabilityIds.has(node.id)) {
      expandedCapabilityIds.delete(node.id);
      capabilityJobs(node.id).forEach(job => expandedJobIds.delete(job.id));
    } else {
      expandedCapabilityIds.add(node.id);
    }
    return;
  }
  if (view === "capability" && node.type === "job") {
    jobCapabilities(node.id).forEach(capability => expandedCapabilityIds.add(capability.id));
    if (expandedJobIds.has(node.id)) expandedJobIds.delete(node.id);
    else expandedJobIds.add(node.id);
    return;
  }
  if (view === "actors" && node.type === "actor") {
    if (expandedActorIds.has(node.id)) expandedActorIds.delete(node.id);
    else expandedActorIds.add(node.id);
  }
}

function rowWidth(count, gap = cardSize.gapX) {
  if (count <= 0) return 0;
  return count * cardSize.width + (count - 1) * gap;
}

function centerRow(nodes, y, positioned, layoutWidth, gap = cardSize.gapX) {
  const width = rowWidth(nodes.length, gap);
  let x = (layoutWidth - width) / 2;
  for (const node of nodes) {
    positioned.set(node.id, { x, y });
    x += cardSize.width + gap;
  }
}

function layoutCapabilityMap(nodes, viewportWidth) {
  const visibleIds = new Set(nodes.map(node => node.id));
  const roots = sortByLabel(nodes.filter(node => ["index", "system"].includes(node.type)));
  const capabilities = sortByLabel(nodes.filter(node => node.type === "capability"));
  const capabilityGroups = capabilities.map(capability => {
    const jobGroups = capabilityJobs(capability.id)
      .filter(job => visibleIds.has(job.id))
      .map(job => {
        const rows = new Map();
        for (const node of jobContextNodes(job.id).filter(item => visibleIds.has(item.id))) {
          const layer = layerForNode(node);
          if (!rows.has(layer)) rows.set(layer, []);
          rows.get(layer).push(node);
        }
        const rowWidths = [...rows.values()].map(row => rowWidth(row.length, cardSize.childGapX));
        const width = Math.max(cardSize.width, ...rowWidths);
        return { job, rows, width };
      });
    const jobsWidth = jobGroups.reduce((sum, group, index) => {
      return sum + group.width + (index === 0 ? 0 : cardSize.groupGapX);
    }, 0);
    const width = Math.max(cardSize.width, jobsWidth);
    return { capability, jobGroups, width };
  });
  const capabilityBandWidth = capabilityGroups.reduce((sum, group, index) => {
    return sum + group.width + (index === 0 ? 0 : cardSize.groupGapX);
  }, 0);
  const rootBandWidth = rowWidth(roots.length, cardSize.gapX);
  const layoutWidth = Math.max(
    960,
    viewportWidth || 0,
    rootBandWidth + cardSize.margin * 2,
    capabilityBandWidth + cardSize.margin * 2
  );
  const positioned = new Map();
  const rootY = cardSize.margin;
  const capabilityY = roots.length > 0 ? cardSize.margin + cardSize.gapY : cardSize.margin;
  const jobY = capabilityY + cardSize.gapY;
  let maxLayer = capabilities.length > 0 ? 1 : 0;
  centerRow(roots, rootY, positioned, layoutWidth);
  let x = (layoutWidth - capabilityBandWidth) / 2;
  for (const group of capabilityGroups) {
    const capabilityX = x + (group.width - cardSize.width) / 2;
    positioned.set(group.capability.id, { x: capabilityX, y: capabilityY });
    const jobsWidth = group.jobGroups.reduce((sum, jobGroup, index) => {
      return sum + jobGroup.width + (index === 0 ? 0 : cardSize.groupGapX);
    }, 0);
    let jobX = x + (group.width - jobsWidth) / 2;
    for (const jobGroup of group.jobGroups) {
      positioned.set(jobGroup.job.id, { x: jobX + (jobGroup.width - cardSize.width) / 2, y: jobY });
      maxLayer = Math.max(maxLayer, 2);
      for (const [layer, row] of jobGroup.rows) {
        const y = cardSize.margin + layer * cardSize.gapY;
        centerRow(sortByLabel(row), y, positioned, jobGroup.width, cardSize.childGapX);
        for (const node of row) {
          const pos = positioned.get(node.id);
          positioned.set(node.id, { x: pos.x + jobX, y: pos.y });
        }
        maxLayer = Math.max(maxLayer, layer);
      }
      jobX += jobGroup.width + cardSize.groupGapX;
    }
    x += group.width + cardSize.groupGapX;
  }
  const lastY = cardSize.margin + maxLayer * cardSize.gapY;
  return {
    positions: positioned,
    size: {
      width: layoutWidth,
      height: Math.max(680, lastY + cardSize.height + cardSize.margin)
    }
  };
}

function layoutActorsMap(nodes, viewportWidth) {
  const visibleIds = new Set(nodes.map(node => node.id));
  const actors = sortByLabel(nodes.filter(node => node.type === "actor"));
  const actorGroups = actors.map(actor => {
    const jobs = actorJobs(actor.id).filter(job => visibleIds.has(job.id));
    const width = Math.max(cardSize.width, rowWidth(jobs.length, cardSize.childGapX));
    return { actor, jobs, width };
  });
  const bandWidth = actorGroups.reduce((sum, group, index) => {
    return sum + group.width + (index === 0 ? 0 : cardSize.groupGapX);
  }, 0);
  const layoutWidth = Math.max(960, viewportWidth || 0, bandWidth + cardSize.margin * 2);
  const positioned = new Map();
  const actorY = cardSize.margin;
  const jobY = cardSize.margin + cardSize.gapY;
  let x = (layoutWidth - bandWidth) / 2;
  for (const group of actorGroups) {
    positioned.set(group.actor.id, { x: x + (group.width - cardSize.width) / 2, y: actorY });
    centerRow(group.jobs, jobY, positioned, group.width, cardSize.childGapX);
    for (const job of group.jobs) {
      const pos = positioned.get(job.id);
      positioned.set(job.id, { x: pos.x + x, y: pos.y });
    }
    x += group.width + cardSize.groupGapX;
  }
  const hasJobs = actorGroups.some(group => group.jobs.length > 0);
  const lastY = hasJobs ? jobY : actorY;
  return {
    positions: positioned,
    size: {
      width: layoutWidth,
      height: Math.max(680, lastY + cardSize.height + cardSize.margin)
    }
  };
}

function layout(nodes, viewportWidth = 0) {
  if (view === "capability") return layoutCapabilityMap(nodes, viewportWidth);
  if (view === "actors") return layoutActorsMap(nodes, viewportWidth);
  const byLayer = new Map();
  for (const node of nodes) {
    const layer = layerForNode(node);
    if (!byLayer.has(layer)) byLayer.set(layer, []);
    byLayer.get(layer).push(node);
  }
  const layers = [...byLayer.keys()].sort((a, b) => a - b);
  const layerWidths = layers.map(layer => rowWidth(byLayer.get(layer).length, cardSize.gapX));
  const layoutWidth = Math.max(960, viewportWidth || 0, ...layerWidths.map(width => width + cardSize.margin * 2));
  const positioned = new Map();
  let maxHeight = 0;
  for (const layer of layers) {
    const group = sortByLabel(byLayer.get(layer));
    const width = rowWidth(group.length, cardSize.gapX);
    const startX = (layoutWidth - width) / 2;
    group.forEach((node, index) => {
      const x = startX + index * (cardSize.width + cardSize.gapX);
      const y = cardSize.margin + layer * cardSize.gapY;
      positioned.set(node.id, { x, y });
      maxHeight = Math.max(maxHeight, y + cardSize.height + cardSize.margin);
    });
  }
  return {
    positions: positioned,
    size: {
      width: layoutWidth,
      height: Math.max(680, maxHeight)
    }
  };
}

function renderSidebar() {
  const counts = graph.nodes.reduce((acc, node) => (acc[node.type] = (acc[node.type] || 0) + 1, acc), {});
  document.getElementById("typeList").innerHTML = Object.entries(counts)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([type, count]) => '<button class="type-button ' + (selectedType === type ? 'active' : '') + '" data-type="' + escapeHtml(type) + '">' + escapeHtml(typeLabels[type] || type) + ' <span class="muted">(' + count + ')</span></button>')
    .join("");
  document.getElementById("nodeList").innerHTML = graph.nodes
    .filter(node => !selectedType || node.type === selectedType)
    .sort((a, b) => a.label.localeCompare(b.label))
    .map(node => '<button class="node-button ' + (selectedNodeId === node.id ? 'active' : '') + '" data-node="' + escapeHtml(node.id) + '">' + escapeHtml(node.label) + '<div class="muted">' + escapeHtml(node.type) + '</div></button>')
    .join("");
  document.querySelectorAll(".type-button").forEach(button => button.addEventListener("click", () => { selectedType = button.dataset.type; renderAll(); }));
  document.querySelectorAll(".node-button").forEach(button => button.addEventListener("click", () => {
    selectedNodeId = button.dataset.node;
    const selected = nodesById.get(selectedNodeId);
    selectedType = selected?.type || selectedType;
    if (selected?.type === "actor") {
      view = "actors";
      expandedActorIds.add(selected.id);
    } else {
      view = "capability";
      if (selected?.type === "capability") expandedCapabilityIds.add(selected.id);
      if (selected?.type === "job") {
        jobCapabilities(selected.id).forEach(capability => expandedCapabilityIds.add(capability.id));
        expandedJobIds.add(selected.id);
      }
    }
    renderAll();
  }));
}

function isRecentDrag() {
  return performance.now() - lastDragEndedAt < 150;
}

function selectNode(node, toggleExpandable = false) {
  if (isRecentDrag()) return;
  selectedNodeId = node.id;
  selectedType = node.type;
  if (toggleExpandable && isExpandable(node)) toggleExpandedNode(node);
  renderAll();
}

function switchView(nextView) {
  view = nextView;
  renderAll();
}

function edgePath(from, to) {
  const startX = from.x + cardSize.width / 2;
  const startY = from.y + cardSize.height;
  const endX = to.x + cardSize.width / 2;
  const endY = to.y;
  const midY = startY + Math.max(30, (endY - startY) / 2);
  return 'M ' + startX + ' ' + startY + ' C ' + startX + ' ' + midY + ', ' + endX + ' ' + (endY - 30) + ', ' + endX + ' ' + endY;
}

function renderCanvas() {
  const stage = document.getElementById("graphStage");
  const canvas = document.getElementById("canvas");
  stage.querySelectorAll(".node-card").forEach(node => node.remove());
  const nodes = nodesForView();
  const { positions, size } = layout(nodes, canvas.clientWidth);
  const nodeIds = new Set(nodes.map(node => node.id));
  const edges = edgesForView(nodeIds);
  stage.style.width = size.width + "px";
  stage.style.height = size.height + "px";
  const svg = document.getElementById("edgeLayer");
  svg.setAttribute("width", String(size.width));
  svg.setAttribute("height", String(size.height));
  svg.setAttribute("viewBox", "0 0 " + size.width + " " + size.height);
  svg.innerHTML = edges.map(edge => {
    const from = positions.get(edge.from);
    const to = positions.get(edge.to);
    if (!from || !to) return "";
    return '<path d="' + edgePath(from, to) + '" fill="none" stroke="rgba(168,168,168,.38)" stroke-width="1.4" />';
  }).join("");
  for (const node of nodes) {
    const pos = positions.get(node.id);
    if (!pos) continue;
    const expandable = isExpandable(node);
    const expanded = isExpanded(node);
    const card = document.createElement("div");
    card.className = "node-card" + (node.id === selectedNodeId ? " active" : "");
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("data-node", node.id);
    card.setAttribute("data-type", node.type);
    card.setAttribute("data-layer", String(layerForNode(node)));
    if (expandable) {
      card.setAttribute("data-expandable", "true");
      card.setAttribute("data-expanded", expanded ? "true" : "false");
      card.setAttribute("aria-expanded", expanded ? "true" : "false");
      card.setAttribute("data-expansion-label", expansionLabel(node));
    }
    card.setAttribute("aria-label", node.label + " source " + (node.sourceFile || node.source?.specId || ""));
    card.style.left = pos.x + "px";
    card.style.top = pos.y + "px";
    const action = expandable ? '<span class="node-action" aria-hidden="true">' + (expanded ? '-' : '+') + '</span>' : "";
    card.innerHTML = '<div class="node-top"><div class="node-type">' + escapeHtml(node.type) + '</div>' + action + '</div><div class="node-label">' + escapeHtml(node.label) + '</div><div class="node-source">' + sourceLink(node, node.sourceFile || node.source?.specId || "") + '</div>';
    card.addEventListener("click", event => {
      if (event.target instanceof Element && event.target.closest("a")) return;
      selectNode(node, true);
    });
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectNode(node, true);
      }
    });
    card.querySelectorAll("a").forEach(anchor => anchor.addEventListener("click", event => event.stopPropagation()));
    stage.appendChild(card);
  }
  applyPan();
}

function renderDetails() {
  const node = graph.nodes.find(item => item.id === selectedNodeId) || graph.nodes[0];
  if (!node) {
    document.getElementById("details").innerHTML = '<p>No graph nodes.</p>';
    return;
  }
  const outgoing = graph.edges.filter(edge => edge.from === node.id);
  const incoming = graph.edges.filter(edge => edge.to === node.id);
  const linked = edge => {
    const targetId = edge.from === node.id ? edge.to : edge.from;
    const target = graph.nodes.find(item => item.id === targetId);
    return '<span class="pill">' + escapeHtml(edge.type) + ': ' + escapeHtml(target?.label || targetId) + '</span>';
  };
  const expansion = isExpandable(node)
    ? '<span class="pill">' + (isExpanded(node) ? 'expanded' : 'collapsed') + '</span><span class="pill">' + escapeHtml(expansionLabel(node)) + '</span>'
    : "";
  document.getElementById("details").innerHTML = '<h3>' + escapeHtml(node.label) + '</h3>' +
    '<p><span class="pill">' + escapeHtml(node.type) + '</span><span class="pill">' + escapeHtml(node.status || "unknown") + '</span><span class="pill">' + escapeHtml(node.confidence || "unknown") + '</span>' + expansion + '</p>' +
    '<div class="detail-list">' +
      '<div class="detail-row"><strong>ID</strong><br><code>' + escapeHtml(node.id) + '</code></div>' +
      '<div class="detail-row"><strong>Source</strong><br>' + sourceLink(node) + '</div>' +
      '<div class="detail-row"><strong>Outgoing</strong><br>' + (outgoing.map(linked).join("") || '<span class="muted">None</span>') + '</div>' +
      '<div class="detail-row"><strong>Incoming</strong><br>' + (incoming.map(linked).join("") || '<span class="muted">None</span>') + '</div>' +
    '</div>';
}

function renderTabs() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.view === view);
    tab.setAttribute("aria-selected", tab.dataset.view === view ? "true" : "false");
    tab.onclick = () => switchView(tab.dataset.view);
  });
}

function applyPan() {
  const stage = document.getElementById("graphStage");
  stage.style.transform = 'translate(' + pan.x + 'px, ' + pan.y + 'px)';
}

function setupPan() {
  const canvas = document.getElementById("canvas");
  canvas.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest(".node-card, a, button")) return;
    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false
    };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove", event => {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const dx = event.clientX - dragState.startX;
    const dy = event.clientY - dragState.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragState.moved = true;
    if (!dragState.moved) return;
    pan = { x: dragState.panX + dx, y: dragState.panY + dy };
    applyPan();
  });
  function finishDrag(event) {
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    if (dragState.moved) lastDragEndedAt = performance.now();
    dragState = null;
    canvas.classList.remove("dragging");
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }
  canvas.addEventListener("pointerup", finishDrag);
  canvas.addEventListener("pointercancel", finishDrag);
}

function renderAll() {
  renderTabs();
  renderSidebar();
  renderCanvas();
  renderDetails();
}
setupPan();
renderAll();
</script>
</body>
</html>
`;
}

let args;
try {
  args = parseCliArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

if (!args.graph || !args.out) {
  console.error("Usage: node scripts/visible-business-graph-render.mjs --graph <graph.json> --out <canvas.html>");
  process.exit(1);
}

const graphPath = path.resolve(args.graph);
const outPath = path.resolve(args.out);
const graph = readJson(graphPath);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, render(graph, outPath), "utf8");
console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
