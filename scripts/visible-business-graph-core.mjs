import fs from "node:fs";
import path from "node:path";

export const GRAPH_SCHEMA = "foundation.visible-business-graph.v1";

export const VALID_NODE_TYPES = new Set([
  "system",
  "capability",
  "job",
  "process",
  "actor",
  "tool",
  "evidence",
  "metric",
  "gap",
  "technical-contract",
  "evaluation",
  "template",
  "index"
]);

export const VALID_EDGE_TYPES = new Set([
  "contains",
  "realized-by",
  "supports",
  "performed-by",
  "uses-tool",
  "has-process",
  "evidenced-by",
  "measured-by",
  "evaluates",
  "templates",
  "has-gap",
  "depends-on"
]);

const SPEC_TYPE_TO_NODE_TYPE = {
  index: "index",
  system: "system",
  capability: "capability",
  job: "job",
  technical: "technical-contract",
  eval: "evaluation",
  template: "template"
};

const SPEC_TYPE_TO_SECTION = {
  index: "overview",
  system: "system-intent",
  capability: "capability-intent",
  job: "job-intent",
  technical: "required-depth",
  eval: "verification-contract",
  template: "template-contract"
};

function slash(value) {
  return value.split(path.sep).join("/");
}

function isGeneratedNonSpecHtml(relativeFile) {
  return /^docs\/specs\/backfill\/(?:artifact-inventory|surface-function-map)-(eval-summary|handoff)-\d{8}-\d{2}\.html$/.test(relativeFile) ||
    /^docs\/specs\/backfill\/capability-map-summary-\d{8}-\d{2}\.html$/.test(relativeFile) ||
    /^docs\/specs\/backfill\/spec-job-queue-summary-\d{8}-\d{2}\.html$/.test(relativeFile) ||
    /^docs\/specs\/backfill\/context-pack-summary-\d{8}-\d{2}\.html$/.test(relativeFile) ||
    /^docs\/specs\/backfill\/process-action-map-summary-\d{8}-\d{2}\.html$/.test(relativeFile) ||
    /^docs\/specs\/backfill\/author-specs-summary-\d{8}-\d{2}\.html$/.test(relativeFile);
}

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkHtml(fullPath);
    if (!entry.isFile() || !entry.name.endsWith(".html")) return [];
    return [fullPath];
  });
}

export function repoPath(repoRoot, file) {
  return slash(path.relative(repoRoot, file));
}

export function discoverSpecFiles(repoRoot) {
  const specsDir = path.join(repoRoot, "docs", "specs");
  return walkHtml(specsDir)
    .filter(file => !isGeneratedNonSpecHtml(repoPath(repoRoot, file)))
    .sort((left, right) => repoPath(repoRoot, left).localeCompare(repoPath(repoRoot, right)));
}

export function extractJsonScript(html, id) {
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const attrs = match[1];
    if (!new RegExp(`\\bid=["']${id}["']`, "i").test(attrs)) continue;
    if (!/\btype=["']application\/json["']/i.test(attrs)) continue;
    return JSON.parse(match[2].trim());
  }
  return null;
}

function attributesFromTag(tag) {
  return Object.fromEntries([...tag.matchAll(/([a-zA-Z0-9:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

export function sectionEntries(html) {
  return [...html.matchAll(/<section\b[^>]*>/g)]
    .map(match => attributesFromTag(match[0]))
    .filter(attributes => attributes.id);
}

export function sectionIds(html) {
  return new Set(sectionEntries(html).map(section => section.id));
}

export function canonicalSectionForHtml(html) {
  const sections = sectionEntries(html);
  return sections.find(section => section["data-spec-canonical"] === "true")?.id ||
    sections.find(section => section["data-spec-section"])?.id ||
    sections[0]?.id ||
    null;
}

export function specNodeId(specId) {
  return `spec:${specId}`;
}

function defaultSource(metadata, sections = new Set()) {
  const preferred = SPEC_TYPE_TO_SECTION[metadata.type];
  const fallback = [...sections][0] || "overview";
  return {
    specId: metadata.id,
    sectionId: preferred && sections.has(preferred) ? preferred : fallback
  };
}

function specIdLooksLikeType(specId, type) {
  return typeof specId === "string" && specId.endsWith(`.${type}`);
}

function edgeTypeForParent(metadata, parentSpecId) {
  if (metadata.type === "eval") return "evaluates";
  if (metadata.type === "job" && specIdLooksLikeType(parentSpecId, "capability")) return "supports";
  return "depends-on";
}

function edgeTypeForChild(metadata, childSpecId) {
  if (metadata.type === "capability" && specIdLooksLikeType(childSpecId, "job")) return "realized-by";
  return "contains";
}

function edgeTypeForRelationship(metadata, relationship, targetSpecId) {
  if (metadata.type === "capability" && relationship === "child" && specIdLooksLikeType(targetSpecId, "job")) return "realized-by";
  if (metadata.type === "job" && relationship === "parent" && specIdLooksLikeType(targetSpecId, "capability")) return "supports";
  if (relationship === "child") return "contains";
  if (relationship === "parent" || relationship === "depends-on") return "depends-on";
  if (relationship === "validates") return "evaluates";
  if (relationship === "validated-by") return "evidenced-by";
  return "supports";
}

function uniqueEdges(edges) {
  const seen = new Set();
  return edges.filter(edge => {
    if (seen.has(edge.id)) return false;
    seen.add(edge.id);
    return true;
  });
}

export function createDefaultGraphMetadata(metadata, sectionsInput = []) {
  const sections = sectionsInput instanceof Set ? sectionsInput : new Set(sectionsInput);
  const source = defaultSource(metadata, sections);
  const rootId = specNodeId(metadata.id);
  const nodeType = SPEC_TYPE_TO_NODE_TYPE[metadata.type] || "system";
  const nodes = [{
    id: rootId,
    type: nodeType,
    label: metadata.title,
    source,
    status: metadata.status,
    confidence: metadata.confidence,
    attributes: {
      specType: metadata.type,
      tags: Array.isArray(metadata.tags) ? metadata.tags : []
    }
  }];
  const edges = [];

  if (metadata.type === "job") {
    const processId = `process:${metadata.id}:main`;
    const actorId = `actor:${metadata.id}:primary`;
    const evidenceId = `evidence:${metadata.id}:primary`;
    nodes.push(
      {
        id: processId,
        type: "process",
        label: `${metadata.title} process`,
        source: { specId: metadata.id, sectionId: sections.has("process") ? "process" : source.sectionId },
        status: metadata.status,
        confidence: metadata.confidence,
        attributes: { generatedFrom: metadata.id }
      },
      {
        id: actorId,
        type: "actor",
        label: `${metadata.title} actor`,
        source,
        status: metadata.status,
        confidence: metadata.confidence,
        attributes: { actorKind: "role-or-system", generatedFrom: metadata.id }
      },
      {
        id: evidenceId,
        type: "evidence",
        label: `${metadata.title} evidence`,
        source: { specId: metadata.id, sectionId: sections.has("evidence-and-evaluation") ? "evidence-and-evaluation" : source.sectionId },
        status: metadata.status,
        confidence: metadata.confidence,
        attributes: { generatedFrom: metadata.id }
      }
    );
    edges.push(
      {
        id: `edge:${rootId}:has-process:${processId}`,
        type: "has-process",
        from: rootId,
        to: processId,
        source: { specId: metadata.id, sectionId: sections.has("process") ? "process" : source.sectionId }
      },
      {
        id: `edge:${rootId}:performed-by:${actorId}`,
        type: "performed-by",
        from: rootId,
        to: actorId,
        source
      },
      {
        id: `edge:${rootId}:evidenced-by:${evidenceId}`,
        type: "evidenced-by",
        from: rootId,
        to: evidenceId,
        source: { specId: metadata.id, sectionId: sections.has("evidence-and-evaluation") ? "evidence-and-evaluation" : source.sectionId }
      }
    );
  }

  if (metadata.parent) {
    const type = edgeTypeForParent(metadata, metadata.parent);
    edges.push({
      id: `edge:${rootId}:${type}:${specNodeId(metadata.parent)}`,
      type,
      from: rootId,
      to: specNodeId(metadata.parent),
      source
    });
  }

  for (const child of metadata.children || []) {
    const type = edgeTypeForChild(metadata, child);
    edges.push({
      id: `edge:${rootId}:${type}:${specNodeId(child)}`,
      type,
      from: rootId,
      to: specNodeId(child),
      source
    });
  }

  for (const related of metadata.relatedSpecs || []) {
    const target = specNodeId(related.id);
    const type = metadata.type === "template" ? "templates" : edgeTypeForRelationship(metadata, related.relationship, related.id);
    edges.push({
      id: `edge:${rootId}:${type}:${target}`,
      type,
      from: rootId,
      to: target,
      source: {
        specId: metadata.id,
        sectionId: sections.has(related.sections?.[0]) ? related.sections[0] : source.sectionId
      },
      label: related.relationship
    });
  }

  return {
    schema: GRAPH_SCHEMA,
    ownerSpecId: metadata.id,
    nodes,
    edges: uniqueEdges(edges)
  };
}

export function graphScript(graphMetadata) {
  return `<script type="application/json" id="graph-metadata">\n${JSON.stringify(graphMetadata, null, 2)}\n</script>`;
}

export function insertOrReplaceGraphMetadata(html, graphMetadata) {
  const rendered = graphScript(graphMetadata);
  const pattern = /<script type="application\/json" id="graph-metadata">[\s\S]*?<\/script>/;
  if (pattern.test(html)) return html.replace(pattern, rendered);
  const metadataPattern = /<script type="application\/json" id="spec-metadata">[\s\S]*?<\/script>/;
  if (!metadataPattern.test(html)) throw new Error("missing spec-metadata script");
  return html.replace(metadataPattern, match => `${match}\n${rendered}`);
}

export function loadSpecDocuments(repoRoot) {
  return discoverSpecFiles(repoRoot).map(file => {
    const html = fs.readFileSync(file, "utf8");
    const relativeFile = repoPath(repoRoot, file);
    const metadata = extractJsonScript(html, "spec-metadata");
    const graph = extractJsonScript(html, "graph-metadata");
    return {
      file,
      relativeFile,
      html,
      metadata,
      graph,
      sections: sectionIds(html),
      canonicalSection: canonicalSectionForHtml(html)
    };
  });
}

function result(status, id, message, details = undefined) {
  return details === undefined ? { status, id, message } : { status, id, message, details };
}

export function summarizeResults(results) {
  return results.reduce((summary, item) => {
    summary[item.status] = (summary[item.status] || 0) + 1;
    return summary;
  }, { pass: 0, warn: 0, fail: 0 });
}

export function validateGraphMetadata(repoRoot) {
  const docs = loadSpecDocuments(repoRoot);
  const results = [];
  const docsBySpecId = new Map();
  const sectionsBySpecId = new Map();

  for (const doc of docs) {
    if (!doc.metadata) {
      results.push(result("fail", `${doc.relativeFile}:spec-metadata`, "Spec is missing spec-metadata."));
      continue;
    }
    docsBySpecId.set(doc.metadata.id, doc);
    sectionsBySpecId.set(doc.metadata.id, doc.sections);
  }

  const nodeIds = new Set();
  const edgeIds = new Set();
  const nodesById = new Map();
  const edges = [];
  const specMainNodeById = new Map();

  for (const doc of docs) {
    const specId = doc.metadata?.id || doc.relativeFile;
    if (!doc.graph) {
      results.push(result("fail", `${specId}:graph-metadata-present`, "Spec is missing graph-metadata."));
      continue;
    }
    if (doc.graph.schema !== GRAPH_SCHEMA) {
      results.push(result("fail", `${specId}:schema`, `Graph metadata schema must be ${GRAPH_SCHEMA}.`, { schema: doc.graph.schema }));
    }
    if (doc.graph.ownerSpecId !== specId) {
      results.push(result("fail", `${specId}:owner-spec`, "graph-metadata.ownerSpecId must match spec-metadata.id.", { ownerSpecId: doc.graph.ownerSpecId }));
    }
    if (!Array.isArray(doc.graph.nodes) || doc.graph.nodes.length === 0) {
      results.push(result("fail", `${specId}:nodes`, "Graph metadata must include at least one node."));
      continue;
    }
    if (!Array.isArray(doc.graph.edges)) {
      results.push(result("fail", `${specId}:edges`, "Graph metadata edges must be an array."));
      continue;
    }
    const expectedMainType = SPEC_TYPE_TO_NODE_TYPE[doc.metadata.type];
    const mainNodes = doc.graph.nodes.filter(node => node.type === expectedMainType && node.source?.specId === specId);
    if (expectedMainType && mainNodes.length === 0) {
      results.push(result("fail", `${specId}:main-node`, `Spec must expose a ${expectedMainType} graph node.`));
    } else if (mainNodes[0]) {
      specMainNodeById.set(specId, mainNodes[0].id);
    }
    for (const node of doc.graph.nodes) {
      if (!node?.id || typeof node.id !== "string") {
        results.push(result("fail", `${specId}:node-id`, "Graph node is missing a string id."));
        continue;
      }
      if (nodeIds.has(node.id)) results.push(result("fail", `${specId}:duplicate-node:${node.id}`, "Duplicate graph node id."));
      nodeIds.add(node.id);
      nodesById.set(node.id, { ...node, ownerSpecId: specId, file: doc.relativeFile });
      if (!VALID_NODE_TYPES.has(node.type)) {
        results.push(result("fail", `${specId}:node-type:${node.id}`, `Invalid graph node type: ${node.type}`));
      }
      if (!node.label || typeof node.label !== "string") {
        results.push(result("fail", `${specId}:node-label:${node.id}`, "Graph node is missing a label."));
      }
      const sourceSpec = node.source?.specId;
      const sourceSection = node.source?.sectionId;
      if (!sourceSpec || !sourceSection) {
        results.push(result("fail", `${specId}:node-source:${node.id}`, "Graph node source must include specId and sectionId."));
      } else if (!docsBySpecId.has(sourceSpec)) {
        results.push(result("fail", `${specId}:node-source-spec:${node.id}`, `Graph node source spec does not resolve: ${sourceSpec}`));
      } else if (!sectionsBySpecId.get(sourceSpec)?.has(sourceSection)) {
        results.push(result("fail", `${specId}:node-source-section:${node.id}`, `Graph node source section does not resolve: ${sourceSpec}#${sourceSection}`));
      }
    }
    for (const edge of doc.graph.edges) {
      if (!edge?.id || typeof edge.id !== "string") {
        results.push(result("fail", `${specId}:edge-id`, "Graph edge is missing a string id."));
        continue;
      }
      if (edgeIds.has(edge.id)) results.push(result("fail", `${specId}:duplicate-edge:${edge.id}`, "Duplicate graph edge id."));
      edgeIds.add(edge.id);
      edges.push({ ...edge, ownerSpecId: specId });
      if (!VALID_EDGE_TYPES.has(edge.type)) {
        results.push(result("fail", `${specId}:edge-type:${edge.id}`, `Invalid graph edge type: ${edge.type}`));
      }
      const sourceSpec = edge.source?.specId;
      const sourceSection = edge.source?.sectionId;
      if (!sourceSpec || !sourceSection) {
        results.push(result("fail", `${specId}:edge-source:${edge.id}`, "Graph edge source must include specId and sectionId."));
      } else if (!docsBySpecId.has(sourceSpec)) {
        results.push(result("fail", `${specId}:edge-source-spec:${edge.id}`, `Graph edge source spec does not resolve: ${sourceSpec}`));
      } else if (!sectionsBySpecId.get(sourceSpec)?.has(sourceSection)) {
        results.push(result("fail", `${specId}:edge-source-section:${edge.id}`, `Graph edge source section does not resolve: ${sourceSpec}#${sourceSection}`));
      }
    }
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.from)) {
      results.push(result("fail", `${edge.ownerSpecId}:edge-from:${edge.id}`, `Graph edge source node does not resolve: ${edge.from}`));
    }
    if (!nodeIds.has(edge.to)) {
      results.push(result("fail", `${edge.ownerSpecId}:edge-to:${edge.id}`, `Graph edge target node does not resolve: ${edge.to}`));
    }
  }

  const degree = new Map([...nodeIds].map(id => [id, 0]));
  for (const edge of edges) {
    if (degree.has(edge.from)) degree.set(edge.from, degree.get(edge.from) + 1);
    if (degree.has(edge.to)) degree.set(edge.to, degree.get(edge.to) + 1);
  }

  const edgeByContract = new Set(edges.map(edge => `${edge.ownerSpecId}|${edge.from}|${edge.type}|${edge.to}`));
  const edgeExists = (ownerSpecId, fromSpecId, type, toSpecId) => {
    const fromNodeId = specMainNodeById.get(fromSpecId) || specNodeId(fromSpecId);
    const toNodeId = specMainNodeById.get(toSpecId) || specNodeId(toSpecId);
    return edgeByContract.has(`${ownerSpecId}|${fromNodeId}|${type}|${toNodeId}`);
  };
  const linkedSpecIds = (metadata, relationship) => [...new Set([
    ...(metadata.children || []).map(id => ({ id, relationship: "child" })),
    ...(metadata.relatedSpecs || []).map(link => ({ id: link.id, relationship: link.relationship }))
  ].filter(link => !relationship || link.relationship === relationship).map(link => link.id))];

  for (const doc of docs) {
    if (!doc.metadata || doc.metadata.type !== "capability") continue;
    const capabilityId = doc.metadata.id;
    const jobIds = linkedSpecIds(doc.metadata, "child")
      .filter(id => docsBySpecId.get(id)?.metadata?.type === "job");
    for (const jobId of jobIds) {
      if (!edgeExists(capabilityId, capabilityId, "realized-by", jobId)) {
        results.push(result("fail", `${capabilityId}:realized-by:${jobId}`, "Capability graph metadata must connect child job specs with a realized-by edge."));
      }
    }
  }

  for (const doc of docs) {
    if (!doc.metadata || doc.metadata.type !== "job") continue;
    const jobId = doc.metadata.id;
    const capabilityIds = new Set();
    if (docsBySpecId.get(doc.metadata.parent)?.metadata?.type === "capability") capabilityIds.add(doc.metadata.parent);
    for (const linkedId of linkedSpecIds(doc.metadata, "parent")) {
      if (docsBySpecId.get(linkedId)?.metadata?.type === "capability") capabilityIds.add(linkedId);
    }
    for (const linkedId of linkedSpecIds(doc.metadata, "supports")) {
      if (docsBySpecId.get(linkedId)?.metadata?.type === "capability") capabilityIds.add(linkedId);
    }
    if (capabilityIds.size === 0) {
      results.push(result("fail", `${jobId}:capability-link`, "Job spec must link to at least one capability spec."));
      continue;
    }
    for (const capabilityId of capabilityIds) {
      if (!edgeExists(jobId, jobId, "supports", capabilityId)) {
        results.push(result("fail", `${jobId}:supports:${capabilityId}`, "Job graph metadata must connect back to its owning capability with a supports edge."));
      }
    }
  }

  for (const [specId, mainNodeId] of specMainNodeById) {
    const doc = docsBySpecId.get(specId);
    if (!doc) continue;
    if (["technical", "eval", "template"].includes(doc.metadata.type) && degree.get(mainNodeId) === 0) {
      results.push(result("fail", `${specId}:orphan`, `${doc.metadata.type} spec graph node must link to what it supports, evaluates, or scaffolds.`));
    }
  }

  if (!results.some(item => item.status === "fail")) {
    results.push(result("pass", "visible-business-graph-valid", `Validated graph metadata for ${docs.length} specs.`));
  }

  return {
    repoRoot,
    docs,
    nodes: [...nodesById.values()],
    edges,
    results,
    summary: summarizeResults(results)
  };
}

export function buildGraph(repoRoot) {
  const validation = validateGraphMetadata(repoRoot);
  const sources = validation.docs
    .filter(doc => doc.metadata)
    .map(doc => ({
      specId: doc.metadata.id,
      title: doc.metadata.title,
      type: doc.metadata.type,
      file: doc.relativeFile,
      canonicalSection: doc.canonicalSection,
      status: doc.metadata.status,
      confidence: doc.metadata.confidence
    }));
  const sourceBySpecId = new Map(sources.map(source => [source.specId, source]));
  const nodes = validation.nodes.map(node => ({
    ...node,
    sourceFile: sourceBySpecId.get(node.source?.specId)?.file || null,
    sourceTitle: sourceBySpecId.get(node.source?.specId)?.title || null
  })).sort((left, right) => left.id.localeCompare(right.id));
  const edges = validation.edges.slice().sort((left, right) => left.id.localeCompare(right.id));
  return {
    schema: GRAPH_SCHEMA,
    generatedAt: new Date().toISOString(),
    repoName: path.basename(repoRoot),
    sources,
    nodes,
    edges,
    summary: {
      specCount: sources.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
      validation: validation.summary
    }
  };
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function parseCliArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

export function findRepoRootFromPath(startPath) {
  let current;
  if (fs.existsSync(startPath)) current = fs.statSync(startPath).isDirectory() ? startPath : path.dirname(startPath);
  else current = path.extname(startPath) ? path.dirname(startPath) : startPath;
  while (true) {
    if (fs.existsSync(path.join(current, "docs", "specs"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function formatResults(results) {
  return results.map(item => {
    const prefix = item.status.toUpperCase().padEnd(4, " ");
    return `${prefix} ${item.id}: ${item.message}`;
  }).join("\n");
}
