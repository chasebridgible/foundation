#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.dirname(path.dirname(scriptPath));
const registryPath = path.join(repoRoot, "docs/specs/index.html");
const remapSpecPath = path.join(repoRoot, "docs/specs/foundation-capability-map-remap.html");
const requiredParentCapabilities = [
  "Understand Intent And Reality",
  "Preserve Knowledge As Useful Context",
  "Define The Right Work",
  "Make Outstanding Work Repeatable",
  "Build New Systems From Clear Specs",
  "Change Existing Systems Without Losing Intent",
  "Operate Systems In The Real World",
  "Show The System Clearly",
  "Evaluate, Learn, And Improve"
];
const expectedOperateChildCapabilities = [
  "foundation.systems-ship-safely.capability",
  "foundation.system-health-visible.capability",
  "foundation.failure-recovery-ready.capability",
  "foundation.operating-lessons-improve-system.capability"
];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function parseJsonScript(html, id, file) {
  const match = html.match(new RegExp(`<script type="application/json" id="${id}">\\n([\\s\\S]*?)\\n</script>`));
  if (!match) fail(`${file} is missing JSON script ${id}`);
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`${file} has invalid ${id} JSON: ${error.message}`);
  }
}

function stripTags(value) {
  return value
    .replace(/<code>/g, "")
    .replace(/<\/code>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tableRows(sectionHtml) {
  return [...sectionHtml.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map(row => [...row[1].matchAll(/<td>([\s\S]*?)<\/td>/g)].map(cell => stripTags(cell[1])))
    .filter(cells => cells.length > 0);
}

function section(html, id) {
  const match = html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`));
  if (!match) fail(`foundation-capability-map-remap.html is missing #${id}`);
  return match[0];
}

const registryHtml = fs.readFileSync(registryPath, "utf8");
const remapHtml = fs.readFileSync(remapSpecPath, "utf8");
const registry = parseJsonScript(registryHtml, "spec-registry", "docs/specs/index.html");
const specs = registry.specs || [];
const capabilityIds = specs
  .filter(spec => spec.type === "capability" && !(spec.tags || []).includes("parent-capability"))
  .map(spec => spec.id)
  .sort();
const capabilitySpecsById = new Map(specs.filter(spec => spec.type === "capability").map(spec => [spec.id, spec]));

const proposedRows = tableRows(section(remapHtml, "proposed-handling"));
const parentNames = new Set(proposedRows.filter(row => row.length === 3).map(row => row[1]));
const remapRows = proposedRows.filter(row => row.length === 4);
const remapBySpec = new Map(remapRows.map(row => [row[0], row]));
const errors = [];

for (const parent of requiredParentCapabilities) {
  if (!parentNames.has(parent)) errors.push(`Missing parent capability family row: ${parent}`);
}

for (const capabilityId of capabilityIds) {
  if (!remapBySpec.has(capabilityId)) errors.push(`Missing remap row for current capability spec: ${capabilityId}`);
}

for (const [specId, row] of remapBySpec) {
  const [currentSpec, currentClassification, proposedParent, actionNeeded] = row;
  if (!currentSpec || !currentClassification || !proposedParent || !actionNeeded) {
    errors.push(`${specId}: remap row has an empty required cell`);
  }
  if (currentSpec.startsWith("foundation.") && !capabilityIds.includes(currentSpec)) {
    errors.push(`${specId}: remap row references a capability spec not present in the registry`);
  }
  if (!requiredParentCapabilities.includes(proposedParent)) {
    errors.push(`${specId}: proposed parent is not one of the required parent capability families: ${proposedParent}`);
  }
}

for (const spec of capabilitySpecsById.values()) {
  for (const childId of spec.children || []) {
    const child = capabilitySpecsById.get(childId);
    if (child && child.parent !== spec.id) {
      errors.push(`${spec.id}: lists child capability ${childId}, but that child declares parent ${child.parent}`);
    }
  }
}

const operateGapRow = remapRows.find(row => row[0] === "Operate Systems In The Real World" && row[1] === "Parent capability gap");
if (operateGapRow) {
  errors.push("Operate Systems In The Real World must decompose into child capability rows; do not keep the old parent capability gap row.");
}

for (const capabilityId of expectedOperateChildCapabilities) {
  const row = remapBySpec.get(capabilityId);
  if (!row) {
    errors.push(`Missing Operate Systems In The Real World child capability remap row: ${capabilityId}`);
    continue;
  }
  if (row[2] !== "Operate Systems In The Real World") {
    errors.push(`${capabilityId}: expected proposed parent Operate Systems In The Real World, found ${row[2]}`);
  }
  if (!/Child capability/.test(row[1]) || !/scoped job gap/.test(row[1])) {
    errors.push(`${capabilityId}: operation child capability rows must be classified as child capabilities with scoped job gaps.`);
  }
}

for (const [specId, row] of remapBySpec) {
  const classification = row[1].toLowerCase();
  if (classification.includes("job-shaped") || classification.includes("phase-shaped")) {
    errors.push(`${specId}: remap classification still admits job-shaped or phase-shaped capability language.`);
  }
}

if (errors.length > 0) {
  console.error(`Capability map remap check failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Capability map remap check passed: ${capabilityIds.length} current capability specs mapped, ${requiredParentCapabilities.length} parent families present.`);
