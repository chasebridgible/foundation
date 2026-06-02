import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import vm from "node:vm";
import {
  GRAPH_SCHEMA,
  createDefaultGraphMetadata,
  graphScript,
  insertOrReplaceGraphMetadata,
  validateGraphMetadata
} from "./visible-business-graph-core.mjs";

const repoRoot = path.dirname(path.dirname(new URL(import.meta.url).pathname));
const buildScript = path.join(repoRoot, "scripts", "visible-business-graph-build.mjs");
const renderScript = path.join(repoRoot, "scripts", "visible-business-graph-render.mjs");
const evalScript = path.join(repoRoot, "scripts", "visible-business-graph-eval.mjs");
const specNewScript = path.join(repoRoot, "docs", "specs", "new-spec.mjs");

function makeRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "visible-business-graph-"));
  fs.mkdirSync(path.join(root, "docs", "specs"), { recursive: true });
  return root;
}

const sectionFixtures = {
  system: [
    ["system-intent", "System intent"],
    ["capability-map", "Capability map"]
  ],
  capability: [
    ["capability-intent", "Capability intent"],
    ["jobs", "Jobs"]
  ],
  job: [
    ["job-intent", "Job intent"],
    ["capability-supported", "Capability supported"],
    ["process", "Process"],
    ["evidence-and-evaluation", "Evidence"]
  ],
  technical: [
    ["required-depth", "Required depth"],
    ["contracts", "Contracts"]
  ],
  eval: [
    ["verification-contract", "Verification contract"],
    ["acceptance-mapping", "Acceptance mapping"]
  ],
  template: [
    ["template-contract", "Template contract"],
    ["required-placeholders", "Required placeholders"]
  ]
};

function writeSpec(root, file, { id, title, type = "job", parent = null, children = [], relatedSpecs = [], graph = null }) {
  const fullPath = path.join(root, "docs", "specs", file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const sections = sectionFixtures[type] || sectionFixtures.job;
  const metadata = {
    id,
    title,
    type,
    status: "draft",
    lastUpdated: "2026-06-01",
    reviewCadence: "per-change",
    confidence: "medium",
    parent,
    children,
    relatedSpecs,
    ownedPaths: [{ path: `${path.basename(root)}/docs/specs/${file}`, kind: "doc", ownership: "direct" }],
    implementationPaths: [],
    coverage: [],
    tags: [type]
  };
  const renderedSections = sections.map(([sectionId, heading], index) => {
    const canonical = index === 0 ? " data-spec-canonical=\"true\"" : "";
    return `<section id="${sectionId}" data-spec-section="${sectionId}"${canonical}><h2>${heading}</h2></section>`;
  }).join("\n");
  let html = `<!DOCTYPE html>
<html><head>
<meta name="spec:id" content="${id}">
<meta name="spec:type" content="${type}">
<meta name="spec:status" content="draft">
<meta name="spec:last-updated" content="2026-06-01">
<script type="application/json" id="spec-metadata">
${JSON.stringify(metadata, null, 2)}
</script>
</head><body>
${renderedSections}
</body></html>`;
  if (graph) html = insertOrReplaceGraphMetadata(html, graph);
  fs.writeFileSync(fullPath, html, "utf8");
}

function runNode(script, args, cwd = repoRoot) {
  return execFileSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });
}

class TestElement {
  constructor(tagName, attributes = {}) {
    this.tagName = tagName.toLowerCase();
    this.children = [];
    this.parentElement = null;
    this.attributes = {};
    this.dataset = {};
    this.eventListeners = {};
    this.style = {
      setProperty(name, value) {
        this[name] = String(value);
      },
      getPropertyValue(name) {
        return this[name] || "";
      }
    };
    this.className = "";
    this._innerHTML = "";
    this.captureCalls = 0;
    this.capturedPointerIds = new Set();
    this.clientWidth = 0;
    this.classList = {
      add: name => this.setClass(name, true),
      contains: name => this.hasClass(name),
      remove: name => this.setClass(name, false),
      toggle: (name, force) => this.setClass(name, force ?? !this.hasClass(name))
    };
    for (const [name, value] of Object.entries(attributes)) this.setAttribute(name, value);
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
  }

  get innerHTML() {
    return this._innerHTML;
  }

  setClass(name, force) {
    const classes = new Set(this.className.split(/\s+/).filter(Boolean));
    if (force) classes.add(name);
    else classes.delete(name);
    this.className = [...classes].join(" ");
    return force;
  }

  hasClass(name) {
    return this.className.split(/\s+/).includes(name);
  }

  setAttribute(name, value) {
    const stringValue = String(value);
    this.attributes[name] = stringValue;
    if (name === "id") this.id = stringValue;
    if (name === "class") this.className = stringValue;
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
      this.dataset[key] = stringValue;
    }
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  appendChild(child) {
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (!this.parentElement) return;
    this.parentElement.children = this.parentElement.children.filter(child => child !== this);
    this.parentElement = null;
  }

  addEventListener(type, handler) {
    if (!this.eventListeners[type]) this.eventListeners[type] = [];
    this.eventListeners[type].push(handler);
  }

  dispatchEvent(type, event = {}) {
    const fullEvent = {
      button: 0,
      pointerId: 1,
      clientX: 0,
      clientY: 0,
      target: this,
      preventDefault() {},
      ...event
    };
    for (const handler of this.eventListeners[type] || []) handler(fullEvent);
    if (type === "click" && typeof this.onclick === "function") this.onclick(fullEvent);
  }

  setPointerCapture(pointerId) {
    this.captureCalls += 1;
    this.capturedPointerIds.add(pointerId);
  }

  hasPointerCapture(pointerId) {
    return this.capturedPointerIds.has(pointerId);
  }

  releasePointerCapture(pointerId) {
    this.capturedPointerIds.delete(pointerId);
  }

  matches(selector) {
    return selector.split(",").some(part => {
      const trimmed = part.trim();
      if (trimmed.startsWith(".")) return this.hasClass(trimmed.slice(1));
      if (trimmed.startsWith("#")) return this.id === trimmed.slice(1);
      return this.tagName === trimmed.toLowerCase();
    });
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches(selector)) return current;
      current = current.parentElement;
    }
    return null;
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = element => {
      for (const child of element.children) {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      }
    };
    visit(this);
    return matches;
  }
}

function createCanvasHarness({ canvasWidth = 1200 } = {}) {
  const elementsById = new Map();
  const roots = [];
  const register = element => {
    if (element.id) elementsById.set(element.id, element);
    return element;
  };
  const body = register(new TestElement("body"));
  const document = {
    body,
    eventListeners: {},
    addEventListener(type, handler) {
      if (!this.eventListeners[type]) this.eventListeners[type] = [];
      this.eventListeners[type].push(handler);
    },
    dispatchEvent(event) {
      for (const handler of this.eventListeners[event.type] || []) handler(event);
    },
    createElement: tagName => new TestElement(tagName),
    getElementById: id => elementsById.get(id) || null,
    querySelectorAll: selector => roots.flatMap(root => {
      const matches = root.matches(selector) ? [root] : [];
      return matches.concat(root.querySelectorAll(selector));
    })
  };
  const typeList = register(new TestElement("div", { id: "typeList" }));
  const nodeList = register(new TestElement("div", { id: "nodeList" }));
  const tabs = register(new TestElement("div", { id: "tabs" }));
  for (const viewName of ["capability", "actors"]) {
    const tab = new TestElement("button");
    tab.className = viewName === "capability" ? "tab active" : "tab";
    tab.dataset.view = viewName;
    tabs.appendChild(tab);
  }
  const canvas = register(new TestElement("section", { id: "canvas" }));
  canvas.clientWidth = canvasWidth;
  const graphStage = register(new TestElement("div", { id: "graphStage" }));
  const edgeLayer = register(new TestElement("svg", { id: "edgeLayer" }));
  graphStage.appendChild(edgeLayer);
  canvas.appendChild(graphStage);
  const details = register(new TestElement("div", { id: "details" }));
  roots.push(body, typeList, nodeList, tabs, canvas, details);
  return { document, body, canvas, graphStage, edgeLayer, details };
}

function extractCanvasScript(canvasHtml) {
  const matches = [...canvasHtml.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)];
  assert.equal(matches.length, 1, "generated canvas should contain one inline executable script block");
  return matches[0][1];
}

function executeCanvas(canvasHtml, options) {
  const harness = createCanvasHarness(options);
  const context = {
    document: harness.document,
    Element: TestElement,
    performance: { now: () => 1000 },
    encodeURIComponent,
    console
  };
  vm.createContext(context);
  vm.runInContext(extractCanvasScript(canvasHtml), context);
  return harness;
}

test("graph check fails a spec without graph metadata", () => {
  const root = makeRepo();
  writeSpec(root, "missing.html", { id: "example.missing.job", title: "Missing Graph" });
  const validation = validateGraphMetadata(root);
  assert.equal(validation.summary.fail > 0, true);
  assert.equal(validation.results.some(result => result.id.includes("graph-metadata-present")), true);
});

test("graph check fails dangling edge endpoints", () => {
  const root = makeRepo();
  const graph = {
    schema: GRAPH_SCHEMA,
    ownerSpecId: "example.dangling.job",
    nodes: [{
      id: "spec:example.dangling.job",
      type: "job",
      label: "Dangling Job",
      source: { specId: "example.dangling.job", sectionId: "job-intent" }
    }],
    edges: [{
      id: "edge:dangling",
      type: "supports",
      from: "spec:example.dangling.job",
      to: "spec:missing.target",
      source: { specId: "example.dangling.job", sectionId: "job-intent" }
    }]
  };
  writeSpec(root, "dangling.html", { id: "example.dangling.job", title: "Dangling Job", graph });
  const validation = validateGraphMetadata(root);
  assert.equal(validation.results.some(result => result.id.includes("edge-to")), true);
});

test("graph check enforces capability-to-job and job-to-capability edges", () => {
  const root = makeRepo();
  const capabilityMetadata = {
    id: "example.capability",
    title: "Example Capability",
    type: "capability",
    status: "draft",
    confidence: "medium",
    children: ["example.job"],
    tags: ["capability"]
  };
  const jobMetadata = {
    id: "example.job",
    title: "Example Job",
    type: "job",
    status: "draft",
    confidence: "medium",
    parent: "example.capability",
    children: [],
    relatedSpecs: [],
    tags: ["job"]
  };
  const capabilityGraph = createDefaultGraphMetadata(capabilityMetadata, ["capability-intent", "jobs"]);
  const jobGraph = createDefaultGraphMetadata(jobMetadata, ["job-intent", "capability-supported", "process", "evidence-and-evaluation"]);
  capabilityGraph.edges = capabilityGraph.edges.map(edge => edge.type === "realized-by"
    ? { ...edge, id: edge.id.replace(":realized-by:", ":contains:"), type: "contains" }
    : edge);
  jobGraph.edges = jobGraph.edges.filter(edge => edge.type !== "supports");
  writeSpec(root, "capability.html", {
    id: "example.capability",
    title: "Example Capability",
    type: "capability",
    children: ["example.job"],
    graph: capabilityGraph
  });
  writeSpec(root, "job.html", {
    id: "example.job",
    title: "Example Job",
    type: "job",
    parent: "example.capability",
    graph: jobGraph
  });
  const validation = validateGraphMetadata(root);
  assert.equal(validation.results.some(result => result.id === "example.capability:realized-by:example.job"), true);
  assert.equal(validation.results.some(result => result.id === "example.job:supports:example.capability"), true);
});

test("spec:new prints graph-compatible scaffolds for all spec types", () => {
  for (const type of ["system", "capability", "job", "technical", "eval"]) {
    const output = runNode(specNewScript, [
      "--type", type,
      "--id", `example.${type}.spec`,
      "--title", `${type} Spec`,
      "--out", `docs/specs/tmp-${type}.html`,
      "--print"
    ]);
    assert.match(output, /id="graph-metadata"/);
    assert.match(output, new RegExp(`"ownerSpecId": "example\\.${type}\\.spec"`));
  }
});

test("templates include graph metadata blocks", () => {
  for (const file of fs.readdirSync(path.join(repoRoot, "docs", "specs", "templates"))) {
    if (!file.endsWith(".html")) continue;
    const html = fs.readFileSync(path.join(repoRoot, "docs", "specs", "templates", file), "utf8");
    assert.match(html, /id="graph-metadata"/, `${file} should include graph metadata`);
  }
});

test("shared site navigation owns document-nav collapse behavior", () => {
  const siteNav = fs.readFileSync(path.join(repoRoot, "docs", "site-nav.js"), "utf8");
  const renderer = fs.readFileSync(renderScript, "utf8");
  assert.match(siteNav, /dataset\.siteNavToggle = "true"/);
  assert.match(siteNav, /substrate-site-nav-collapsed/);
  assert.match(siteNav, /localStorage\.setItem\(navCollapsedStorageKey/);
  assert.match(siteNav, /substrate:site-nav-toggle/);
  assert.doesNotMatch(renderer, /id="siteNavToggle"/, "graph renderer should not own a graph-only docs nav toggle");
});

test("Foundation spec corpus validates as a graph", () => {
  const validation = validateGraphMetadata(repoRoot);
  assert.deepEqual(validation.summary.fail || 0, 0);
  assert.equal(validation.nodes.length > validation.docs.length, true);
});

test("example client builds, renders, and evaluates", () => {
  const source = path.join(repoRoot, "examples", "visible-business-client");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "visible-business-client-"));
  fs.cpSync(source, root, { recursive: true });
  const graphPath = path.join(root, "docs", "visible-business-graph", "business-graph.json");
  const canvasPath = path.join(root, "docs", "visible-business-graph", "canvas.html");
  const expectedPath = path.join(root, "docs", "visible-business-graph", "expected-graph.json");
  runNode(buildScript, ["--repo", root, "--out", graphPath]);
  runNode(renderScript, ["--graph", graphPath, "--out", canvasPath]);
  runNode(evalScript, ["--repo", root, "--graph", graphPath, "--canvas", canvasPath, "--expected", expectedPath]);
  const canvas = fs.readFileSync(canvasPath, "utf8");
  assert.match(canvas, /Capability map/);
  assert.match(canvas, /Actors/);
  assert.doesNotMatch(canvas, /Capability detail/);
  assert.doesNotMatch(canvas, /Job lens/);
  assert.doesNotMatch(canvas, /Actor dependency/);
  assert.doesNotMatch(canvas, /Tool \/ evidence \/ gap/);
  assert.doesNotMatch(canvas, /Full canvas/);
  assert.match(canvas, /cap:field-service:schedule-work/);
  assert.match(canvas, /client-system.html/);
  assert.match(canvas, /data-layout="top-down"/);
  assert.match(canvas, /class="visible-business-graph-page"/);
  assert.match(canvas, /data-canvas-shell/);
  assert.doesNotMatch(canvas, /id="siteNavToggle"/);
  assert.match(canvas, /substrate-site-nav-collapsed/);
  assert.match(canvas, /substrate-has-injected-sidebar \.app/);
  assert.match(canvas, /id="graphStage"/);
  assert.match(canvas, /expandedCapabilityIds/);
  assert.match(canvas, /accentPalette/);
  assert.match(canvas, /data-accented/);
  assert.match(canvas, /data-expandable/);
  assert.match(canvas, /aria-expanded/);
  assert.match(canvas, /pointerdown/);
  assert.match(canvas, /pointermove/);
  assert.match(canvas, /translate\(/);
  assert.match(canvas, /src="\.\.\/site-map\.js\?v=20260601-nav-collapse"/);
  assert.match(canvas, /src="\.\.\/site-nav\.js\?v=20260601-nav-collapse"/);

  const harness = executeCanvas(canvas, { canvasWidth: 1280 });
  let cards = harness.graphStage.querySelectorAll(".node-card");
  const systemCard = cards.find(card => card.getAttribute("data-layer") === "0");
  assert.ok(systemCard, "capability map should render a system/index card");
  const stageWidth = Number.parseFloat(harness.graphStage.style.width);
  const systemCenter = Number.parseFloat(systemCard.style.left) + 105;
  assert.equal(Math.abs(systemCenter - stageWidth / 2) < 1, true, "system layer should be horizontally centered");
  assert.equal(harness.edgeLayer.innerHTML.trim(), "", "overview should not draw global graph edges before expansion");
  const capabilityYValues = new Set(
    cards
      .filter(card => card.getAttribute("data-type") === "capability")
      .map(card => card.style.top)
  );
  assert.equal(capabilityYValues.size, 1, "capability map should render all capabilities in one horizontal band");

  const narrowHarness = executeCanvas(canvas, { canvasWidth: 520 });
  const narrowTransform = narrowHarness.graphStage.style.transform;
  assert.match(narrowTransform, /translate\(-\d+px, 0px\)/, "initial view should center a wide graph inside a narrow canvas");
  const narrowCapabilityYValues = new Set(
    narrowHarness.graphStage.querySelectorAll(".node-card")
      .filter(card => card.getAttribute("data-type") === "capability")
      .map(card => card.style.top)
  );
  assert.equal(narrowCapabilityYValues.size, 1, "narrow capability maps should keep capabilities in one horizontal band");

  assert.equal(cards.filter(card => card.getAttribute("data-layer") === "2").length, 0, "jobs should start collapsed");
  const capabilityCard = cards.find(card => card.getAttribute("data-expandable") === "true");
  assert.ok(capabilityCard, "example graph should expose expandable capability cards");
  const capabilityId = capabilityCard.getAttribute("data-node");
  harness.canvas.dispatchEvent("pointerdown", {
    button: 0,
    pointerId: 7,
    target: capabilityCard
  });
  assert.equal(harness.canvas.captureCalls, 0, "node-card pointerdown should not capture the click as a pan");
  capabilityCard.dispatchEvent("click", { target: capabilityCard });
  cards = harness.graphStage.querySelectorAll(".node-card");
  const expandedCard = cards.find(card => card.getAttribute("data-node") === capabilityId);
  assert.equal(expandedCard.getAttribute("aria-expanded"), "true", "clicking a capability should expand it");
  assert.equal(expandedCard.getAttribute("data-accented"), "true", "expanded capability should expose its branch accent");
  assert.equal(cards.some(card => card.getAttribute("data-layer") === "2"), true, "expanded capability should reveal job cards");
  assert.match(harness.edgeLayer.innerHTML, /data-edge-type="realized-by"/, "expanded capability should draw local job realization edges");
  assert.match(harness.edgeLayer.innerHTML, /--edge-accent:/, "expanded capability edges should inherit the capability branch accent");
  assert.doesNotMatch(harness.edgeLayer.innerHTML, /data-edge-type="supports"/, "capability map should not draw reverse support edges");
  assert.doesNotMatch(harness.edgeLayer.innerHTML, /data-edge-type="depends-on"/, "capability map should not draw global dependency edges");

  const jobCard = cards.find(card => card.getAttribute("data-type") === "job");
  assert.ok(jobCard, "expanded capability should expose a clickable job card");
  assert.equal(jobCard.getAttribute("data-accented"), "true", "job under an expanded capability should share the branch accent");
  const jobId = jobCard.getAttribute("data-node");
  jobCard.dispatchEvent("click", { target: jobCard });
  cards = harness.graphStage.querySelectorAll(".node-card");
  const activeTab = harness.document.querySelectorAll(".tab").find(tab => tab.hasClass("active"));
  assert.equal(activeTab.dataset.view, "capability", "clicking a job should stay on the capability map");
  const expandedJobCard = cards.find(card => card.getAttribute("data-node") === jobId);
  assert.equal(expandedJobCard.getAttribute("aria-expanded"), "true", "clicking a job should expand it in the capability map");
  const visibleJobLensTypes = new Set(cards.map(card => card.getAttribute("data-type")));
  for (const type of ["system", "capability", "job", "process", "actor", "tool", "evidence", "metric", "gap"]) {
    assert.equal(visibleJobLensTypes.has(type), true, `expanded job should show ${type} context in the capability map`);
  }
  assert.match(harness.edgeLayer.innerHTML, /data-edge-type="has-process"/, "expanded job should draw its process edge");
  assert.match(harness.edgeLayer.innerHTML, /data-edge-type="performed-by"/, "expanded job should draw its actor edge");
  assert.match(harness.edgeLayer.innerHTML, /data-edge-type="uses-tool"/, "expanded job should draw its tool edge");
  assert.match(harness.edgeLayer.innerHTML, /data-edge-type="evidenced-by"/, "expanded job should draw its evidence edge");
  assert.doesNotMatch(harness.edgeLayer.innerHTML, /data-edge-type="supports"/, "expanded job context should still suppress reverse support edges");

  const actorsTab = harness.document.querySelectorAll(".tab").find(tab => tab.dataset.view === "actors");
  actorsTab.dispatchEvent("click", { target: actorsTab });
  cards = harness.graphStage.querySelectorAll(".node-card");
  const activeActorsTab = harness.document.querySelectorAll(".tab").find(tab => tab.hasClass("active"));
  assert.equal(activeActorsTab.dataset.view, "actors", "actors tab should be selectable");
  assert.equal(cards.every(card => card.getAttribute("data-type") === "actor"), true, "actors map should initially show actors only");
  assert.equal(harness.edgeLayer.innerHTML.trim(), "", "actors overview should not draw actor/job edges before expansion");
  const actorCard = cards.find(card => card.getAttribute("data-expandable") === "true");
  assert.ok(actorCard, "actors map should expose expandable actor cards");
  actorCard.dispatchEvent("click", { target: actorCard });
  cards = harness.graphStage.querySelectorAll(".node-card");
  const expandedActorCard = cards.find(card => card.getAttribute("data-node") === actorCard.getAttribute("data-node"));
  assert.equal(expandedActorCard.getAttribute("aria-expanded"), "true", "clicking an actor should expand handled jobs");
  assert.equal(cards.some(card => card.getAttribute("data-type") === "job"), true, "expanded actor should reveal handled jobs");
  assert.match(harness.edgeLayer.innerHTML, /data-edge-type="performed-by"/, "expanded actor should draw only handled-job edges");
  assert.doesNotMatch(harness.edgeLayer.innerHTML, /data-edge-type="supports"/, "actors map should not draw unrelated capability support edges");

  harness.canvas.dispatchEvent("pointerdown", {
    button: 0,
    pointerId: 8,
    clientX: 40,
    clientY: 50,
    target: harness.canvas
  });
  harness.canvas.dispatchEvent("pointermove", {
    pointerId: 8,
    clientX: 90,
    clientY: 85,
    target: harness.canvas
  });
  assert.match(harness.graphStage.style.transform, /translate\(-?\d+px, 35px\)/, "dragging the canvas background should pan the stage from the centered starting position");
});
