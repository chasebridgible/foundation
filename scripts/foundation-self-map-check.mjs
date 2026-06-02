#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildGraph,
  loadSpecDocuments,
  parseCliArgs,
  validateGraphMetadata
} from "./visible-business-graph-core.mjs";

const thisFile = fileURLToPath(import.meta.url);
const repoRoot = path.dirname(path.dirname(thisFile));
const repoName = path.basename(repoRoot);
const args = parseCliArgs(process.argv.slice(2));
const targetRepo = path.resolve(args.repo || repoRoot);
const errors = [];
const warnings = [];

const CORE_CAPABILITY_IDS = [
  "foundation.capture-business-system-intent.capability",
  "foundation.inventory-classify-artifacts.capability",
  "foundation.map-surfaces-functions.capability",
  "foundation.map-capabilities-from-evidence.capability",
  "foundation.define-jobs-from-capabilities.capability",
  "foundation.package-context-for-action.capability",
  "foundation.author-durable-specs.capability",
  "foundation.generate-maintain-agent-skills.capability",
  "foundation.evaluate-quality-completeness.capability",
  "foundation.render-inspectable-system-graph.capability",
  "foundation.install-foundation-target-repos.capability",
  "foundation.compound-improvements-safely.capability"
];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function repoPath(file) {
  return `${repoName}/${slash(path.relative(targetRepo, file))}`;
}

function walkSkillFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkSkillFiles(fullPath);
    if (!entry.isFile() || entry.name !== "SKILL.md") return [];
    return [fullPath];
  });
}

function linkTargets(metadata) {
  return [
    metadata.parent,
    ...(metadata.children || []),
    ...(metadata.relatedSpecs || []).map(link => link.id)
  ].filter(Boolean);
}

function hasLinkedType(metadata, specsById, allowedTypes) {
  return linkTargets(metadata).some(id => allowedTypes.has(specsById.get(id)?.metadata?.type));
}

function linkedSpecsOfType(metadata, specsById, type) {
  return linkTargets(metadata)
    .map(id => specsById.get(id)?.metadata)
    .filter(spec => spec?.type === type);
}

function coverageHasCheck(metadata) {
  return (metadata.coverage || []).some(item =>
    ["existing", "planned", "gap"].includes(item.status) &&
    (item.command || item.evidence || item.path)
  );
}

function ownedSkillPathsByJob(docs) {
  const pathsBySkill = new Map();
  for (const doc of docs) {
    const metadata = doc.metadata;
    if (metadata?.type !== "job") continue;
    for (const pathRef of metadata.ownedPaths || []) {
      if (!/\/skills\/[^/]+\/SKILL\.md$/.test(pathRef.path)) continue;
      const owners = pathsBySkill.get(pathRef.path) || [];
      owners.push(metadata.id);
      pathsBySkill.set(pathRef.path, owners);
    }
  }
  return pathsBySkill;
}

const docs = loadSpecDocuments(targetRepo).filter(doc => doc.metadata);
const specsById = new Map(docs.map(doc => [doc.metadata.id, doc]));
const systemSpecs = docs.filter(doc => doc.metadata.type === "system");
const capabilitySpecs = docs.filter(doc => doc.metadata.type === "capability");
const jobSpecs = docs.filter(doc => doc.metadata.type === "job");
const technicalAndEvalSpecs = docs.filter(doc => ["technical", "eval"].includes(doc.metadata.type));
const templates = docs.filter(doc => doc.metadata.type === "template");

if (systemSpecs.length !== 1) {
  fail(`Foundation must have exactly one system spec; found ${systemSpecs.length}: ${systemSpecs.map(doc => doc.metadata.id).join(", ") || "none"}.`);
} else if (systemSpecs[0].metadata.id !== "foundation.operating-system.system") {
  fail(`The single system spec must be foundation.operating-system.system, found ${systemSpecs[0].metadata.id}.`);
}

const operatingSystem = specsById.get("foundation.operating-system.system")?.metadata;
if (!operatingSystem) {
  fail("Missing foundation.operating-system.system.");
} else {
  for (const capabilityId of CORE_CAPABILITY_IDS) {
    const capability = specsById.get(capabilityId)?.metadata;
    if (!capability) {
      fail(`Core capability spec is missing: ${capabilityId}.`);
      continue;
    }
    if (capability.type !== "capability") {
      fail(`${capabilityId} must have type capability, found ${capability.type}.`);
    }
    if (capability.parent !== "foundation.operating-system.system" && !(operatingSystem.children || []).includes(capabilityId)) {
      fail(`${capabilityId} must be directly attached to foundation.operating-system.system.`);
    }
  }
}

for (const doc of jobSpecs) {
  const metadata = doc.metadata;
  if (!hasLinkedType(metadata, specsById, new Set(["capability"]))) {
    fail(`${metadata.id}: job spec must support at least one capability through parent, children, or relatedSpecs.`);
  }
}

for (const doc of technicalAndEvalSpecs) {
  const metadata = doc.metadata;
  if (!hasLinkedType(metadata, specsById, new Set(["job", "capability"]))) {
    fail(`${metadata.id}: ${metadata.type} spec must link to a job or capability.`);
  }
}

for (const doc of capabilitySpecs) {
  const metadata = doc.metadata;
  const jobs = linkedSpecsOfType(metadata, specsById, "job");
  if (jobs.length === 0) fail(`${metadata.id}: capability must link to at least one job spec.`);
  if (!coverageHasCheck(metadata)) fail(`${metadata.id}: capability must declare coverage or evidence for an eval/check.`);
  const capabilityNode = (doc.graph?.nodes || []).find(node => node.type === "capability" && node.source?.specId === metadata.id);
  if (!capabilityNode) fail(`${metadata.id}: capability graph metadata must expose a capability node.`);
}

for (const template of templates) {
  if (!template.graph?.edges?.length) {
    fail(`${template.metadata.id}: template spec must link to what it scaffolds.`);
  }
}

const skillOwners = ownedSkillPathsByJob(docs);
for (const skillFile of walkSkillFiles(path.join(targetRepo, "skills"))) {
  const skillPath = repoPath(skillFile);
  if (!skillOwners.has(skillPath)) {
    fail(`${skillPath}: skill must be owned by a job spec ownedPaths entry.`);
  }
}

let graph;
try {
  const graphValidation = validateGraphMetadata(targetRepo);
  if ((graphValidation.summary.fail || 0) > 0) {
    fail(`Visible business graph validation failed with ${graphValidation.summary.fail} issue${graphValidation.summary.fail === 1 ? "" : "s"}. Run npm run foundation:visible-business-graph:check -- --repo ${targetRepo}.`);
  }
  graph = buildGraph(targetRepo);
} catch (error) {
  fail(`Could not build visible business graph: ${error.message}`);
}

if (graph) {
  const capabilityNodes = graph.nodes.filter(node => node.type === "capability");
  if (capabilityNodes.length < CORE_CAPABILITY_IDS.length) {
    fail(`Visible business graph must contain at least ${CORE_CAPABILITY_IDS.length} capability nodes; found ${capabilityNodes.length}.`);
  }
  const missingCoreNodes = CORE_CAPABILITY_IDS
    .map(id => `spec:${id}`)
    .filter(nodeId => !graph.nodes.some(node => node.id === nodeId && node.type === "capability"));
  for (const nodeId of missingCoreNodes) fail(`Visible business graph is missing core capability node ${nodeId}.`);
}

for (const capabilityId of CORE_CAPABILITY_IDS) {
  const capability = specsById.get(capabilityId)?.metadata;
  if (!capability) continue;
  const jobs = linkedSpecsOfType(capability, specsById, "job");
  if (jobs.length === 1 && capabilityId === "foundation.generate-maintain-agent-skills.capability") {
    warn(`${capabilityId}: currently reuses ${jobs[0].id}; consider a dedicated skill-authoring job once the workflow grows.`);
  }
}

if (errors.length > 0) {
  console.error(`Foundation self-map check failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length > 0) {
    console.error("");
    console.error(`Warnings (${warnings.length}):`);
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log(`Foundation self-map check passed: ${systemSpecs.length} system spec, ${capabilitySpecs.length} capability specs, ${jobSpecs.length} job specs, ${skillOwners.size} mapped skills.`);
if (warnings.length > 0) {
  console.log(`Warnings (${warnings.length}):`);
  for (const warning of warnings) console.log(`- ${warning}`);
}
