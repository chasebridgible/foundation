#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const specsDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.dirname(specsDir);
const repoRoot = path.dirname(docsDir);
const repoName = path.basename(repoRoot);
const indexPath = path.join(specsDir, "index.html");
const schemaPath = path.join(specsDir, "spec-registry.schema.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));

const specRequired = new Set(schema.$defs.specEntry.required);
const specProperties = new Set(Object.keys(schema.$defs.specEntry.properties));
const pathKinds = new Set(schema.$defs.pathRef.properties.kind.enum);
const ownershipValues = new Set(schema.$defs.pathRef.properties.ownership.enum);
const specTypes = new Set(schema.$defs.specEntry.properties.type.enum);
const specStatuses = new Set(schema.$defs.specEntry.properties.status.enum);
const confidenceValues = new Set(schema.$defs.specEntry.properties.confidence.enum);
const relationships = new Set(schema.$defs.specLink.properties.relationship.enum);
const coverageLevels = new Set(schema.$defs.coverageRef.properties.level.enum);
const coverageStatuses = new Set(schema.$defs.coverageRef.properties.status.enum);
const errors = [];
let gitReadContext;
let existingRegistryByFile;

function fail(message) {
  errors.push(message);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!entry.isFile() || !entry.name.endsWith(".html")) return [];
    return [fullPath];
  });
}

function relativeSpecPath(file) {
  return path.relative(repoRoot, file).split(path.sep).join("/");
}

function gitOutput(args, { timeoutMs = 0 } = {}) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    timeout: timeoutMs
  });
}

function splitNull(value) {
  return value.split("\0").filter(Boolean);
}

function readGitContext() {
  if (gitReadContext) return gitReadContext;
  const context = { blobByPath: new Map(), workingTreePaths: new Set() };

  try {
    gitOutput(["rev-parse", "--is-inside-work-tree"]);
    for (const entry of splitNull(gitOutput(["ls-files", "-s", "-z", "--", "docs/specs"]))) {
      const match = entry.match(/^\d+ ([0-9a-f]+) (\d)\t(.+)$/);
      if (match && match[2] === "0") context.blobByPath.set(match[3], match[1]);
    }
  } catch {
    context.blobByPath.clear();
  }
  try {
    for (const file of splitNull(gitOutput(["ls-files", "-m", "-z", "--", "docs/specs"], { timeoutMs: 1000 }))) {
      context.workingTreePaths.add(file);
    }
  } catch {
    context.workingTreePaths.clear();
  }

  gitReadContext = context;
  return gitReadContext;
}

function readSpecText(file) {
  return fs.readFileSync(file, "utf8");
}

function isCleanTrackedSpec(file) {
  const relativeFile = relativeSpecPath(file);
  const context = readGitContext();
  const blob = context.blobByPath.get(relativeFile);
  return Boolean(blob && !context.workingTreePaths.has(relativeFile));
}

function existingRegistryEntriesByFile() {
  if (existingRegistryByFile) return existingRegistryByFile;
  existingRegistryByFile = new Map();
  try {
    const indexHtml = fs.readFileSync(indexPath, "utf8");
    const match = indexHtml.match(/<script type="application\/json" id="spec-registry">([\s\S]*?)<\/script>/);
    if (!match) return existingRegistryByFile;
    const registry = JSON.parse(match[1]);
    for (const spec of registry.specs || []) existingRegistryByFile.set(spec.file, spec);
  } catch {
    existingRegistryByFile.clear();
  }
  return existingRegistryByFile;
}

function isGeneratedNonSpecHtml(file) {
  const relativeFile = relativeSpecPath(file);
  return /^docs\/specs\/backfill\/(?:file|surface)-registry-(eval-summary|handoff)-\d{8}-\d{2}\.html$/.test(relativeFile) ||
    /^docs\/specs\/backfill\/capability-matrix-summary-\d{8}-\d{2}\.html$/.test(relativeFile) ||
    /^docs\/specs\/backfill\/split-queue-summary-\d{8}-\d{2}\.html$/.test(relativeFile);
}

function registryPathFor(file) {
  return `${repoName}/${relativeSpecPath(file)}`;
}

function extractJson(html, id, file) {
  const match = html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)<\\/script>`));
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`${file}: ${id} is not valid JSON (${error.message})`);
    return null;
  }
}

function sectionIds(html) {
  return new Set([...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map(match => match[1]));
}

function metaTag(html, name) {
  return html.match(new RegExp(`<meta name="${name}" content="([^"]+)">`))?.[1];
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
  }
  return value;
}

function same(a, b) {
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}

function hasDateShape(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function pathExists(pathRef) {
  if (!pathRef.path.startsWith(`${repoName}/`)) return true;
  return fs.existsSync(path.join(path.dirname(repoRoot), pathRef.path));
}

function validatePathRef(pathRef, context) {
  for (const key of ["path", "kind", "ownership"]) {
    if (!(key in pathRef)) fail(`${context}: path reference is missing ${key}`);
  }
  if (pathRef.kind && !pathKinds.has(pathRef.kind)) fail(`${context}: invalid path kind ${pathRef.kind}`);
  if (pathRef.ownership && !ownershipValues.has(pathRef.ownership)) {
    fail(`${context}: invalid ownership value ${pathRef.ownership}`);
  }
  if (pathRef.path && !pathExists(pathRef)) fail(`${context}: referenced path does not exist: ${pathRef.path}`);
}

function validateCoverage(coverage, context) {
  for (const key of ["id", "level", "status", "path"]) {
    if (!(key in coverage)) fail(`${context}: coverage reference is missing ${key}`);
  }
  if (coverage.level && !coverageLevels.has(coverage.level)) fail(`${context}: invalid coverage level ${coverage.level}`);
  if (coverage.status && !coverageStatuses.has(coverage.status)) {
    fail(`${context}: invalid coverage status ${coverage.status}`);
  }
}

function validateSpecShape(spec, context, { registryEntry = false } = {}) {
  const required = registryEntry ? specRequired : new Set([...specRequired].filter(key => key !== "file"));
  for (const key of required) {
    if (!(key in spec)) fail(`${context}: missing required field ${key}`);
  }
  for (const key of Object.keys(spec)) {
    if (!specProperties.has(key)) fail(`${context}: unknown field ${key}`);
    if (key === "owner") fail(`${context}: document-level owner metadata is not used in this repo`);
  }
  if (spec.type && !specTypes.has(spec.type)) fail(`${context}: invalid spec type ${spec.type}`);
  if (spec.status && !specStatuses.has(spec.status)) fail(`${context}: invalid status ${spec.status}`);
  if (spec.confidence && !confidenceValues.has(spec.confidence)) fail(`${context}: invalid confidence ${spec.confidence}`);
  if (spec.lastUpdated && !hasDateShape(spec.lastUpdated)) fail(`${context}: lastUpdated must be YYYY-MM-DD`);
  for (const pathRef of [...(spec.ownedPaths || []), ...(spec.implementationPaths || [])]) {
    validatePathRef(pathRef, context);
  }
  for (const coverage of spec.coverage || []) validateCoverage(coverage, context);
  for (const related of spec.relatedSpecs || []) {
    if (!relationships.has(related.relationship)) fail(`${context}: invalid relationship ${related.relationship}`);
  }
}

const specFiles = walk(specsDir).filter(file => !isGeneratedNonSpecHtml(file));
const specs = [];
const specsById = new Map();
const sectionsById = new Map();

for (const file of specFiles) {
  const relativeFile = relativeSpecPath(file);
  const registryFile = registryPathFor(file);
  const existing = existingRegistryEntriesByFile().get(registryFile);
  if (existing && isCleanTrackedSpec(file)) {
    const metadata = Object.fromEntries(Object.entries(existing).filter(([key]) => !["file", "canonicalSection"].includes(key)));
    validateSpecShape(metadata, `${metadata.id} metadata`);
    if (specsById.has(metadata.id)) fail(`${metadata.id}: duplicate spec id`);
    specs.push({ file, relativeFile, registryFile, html: "", metadata });
    specsById.set(metadata.id, { file, relativeFile, registryFile, html: "", metadata });
    sectionsById.set(metadata.id, {
      complete: false,
      sections: new Set(existing.canonicalSection ? [existing.canonicalSection] : [])
    });
    continue;
  }
  const html = readSpecText(file);
  if (html.includes('name="spec:owner"')) fail(`${relativeFile}: remove spec:owner meta tag`);
  const metadata = extractJson(html, "spec-metadata", relativeFile);
  if (!metadata) {
    fail(`${relativeFile}: missing spec-metadata JSON`);
    continue;
  }

  validateSpecShape(metadata, `${metadata.id} metadata`);
  for (const [tag, field] of [
    ["spec:id", "id"],
    ["spec:type", "type"],
    ["spec:status", "status"],
    ["spec:last-updated", "lastUpdated"]
  ]) {
    const value = metaTag(html, tag);
    if (value && value !== metadata[field]) fail(`${relativeFile}: ${tag} does not match spec-metadata.${field}`);
  }

  if (specsById.has(metadata.id)) fail(`${metadata.id}: duplicate spec id`);
  specs.push({ file, relativeFile, registryFile: registryPathFor(file), html, metadata });
  specsById.set(metadata.id, { file, relativeFile, registryFile: registryPathFor(file), html, metadata });
  sectionsById.set(metadata.id, { complete: true, sections: sectionIds(html) });
}

for (const { metadata } of specs) {
  const context = metadata.id;
  if (metadata.parent && !specsById.has(metadata.parent)) fail(`${context}: parent spec does not exist: ${metadata.parent}`);
  for (const child of metadata.children || []) {
    if (!specsById.has(child)) fail(`${context}: child spec does not exist: ${child}`);
  }
  for (const related of metadata.relatedSpecs || []) {
    if (!specsById.has(related.id)) fail(`${context}: related spec does not exist: ${related.id}`);
    for (const section of related.sections || []) {
      const sectionInfo = sectionsById.get(related.id);
      if (sectionInfo?.complete && !sectionInfo.sections.has(section)) fail(`${context}: related section does not exist: ${related.id}#${section}`);
    }
  }
  for (const coverage of metadata.coverage || []) {
    for (const mapsTo of coverage.mapsTo || []) {
      const [specId, section] = mapsTo.split("#");
      if (!specsById.has(specId)) fail(`${context}: coverage target spec does not exist: ${mapsTo}`);
      const sectionInfo = sectionsById.get(specId);
      if (section && sectionInfo?.complete && !sectionInfo.sections.has(section)) {
        fail(`${context}: coverage target section does not exist: ${mapsTo}`);
      }
    }
  }
}

const indexHtml = readSpecText(indexPath);
const registry = extractJson(indexHtml, "spec-registry", relativeSpecPath(indexPath));

if (!registry) {
  fail("docs/specs/index.html: missing spec-registry JSON");
} else {
  for (const key of schema.required) {
    if (!(key in registry)) fail(`spec-registry: missing required field ${key}`);
  }
  if (registry.lastUpdated && !hasDateShape(registry.lastUpdated)) fail("spec-registry: lastUpdated must be YYYY-MM-DD");
  if (!Array.isArray(registry.specs)) fail("spec-registry: specs must be an array");
  const registryById = new Map();
  for (const entry of registry.specs || []) {
    validateSpecShape(entry, `${entry.id} registry entry`, { registryEntry: true });
    if (registryById.has(entry.id)) fail(`${entry.id}: duplicate registry entry`);
    registryById.set(entry.id, entry);
    const source = specsById.get(entry.id);
    if (!source) {
      fail(`${entry.id}: registry entry has no matching spec-metadata`);
      continue;
    }
    if (entry.file !== source.registryFile) fail(`${entry.id}: registry file should be ${source.registryFile}`);
    const sectionInfo = sectionsById.get(entry.id);
    if (entry.canonicalSection && sectionInfo?.complete && !sectionInfo.sections.has(entry.canonicalSection)) {
      fail(`${entry.id}: canonicalSection does not exist: ${entry.canonicalSection}`);
    }
    for (const key of Object.keys(source.metadata)) {
      if (!same(entry[key], source.metadata[key])) fail(`${entry.id}: registry ${key} does not match canonical spec-metadata`);
    }
    for (const key of Object.keys(entry)) {
      if (!["file", "canonicalSection"].includes(key) && !(key in source.metadata)) {
        fail(`${entry.id}: registry field ${key} is not present in canonical spec-metadata`);
      }
    }
  }
  for (const { metadata } of specs) {
    if (!registryById.has(metadata.id)) fail(`${metadata.id}: missing from spec-registry`);
  }
}

if (errors.length > 0) {
  console.error(`Spec check failed with ${errors.length} issue${errors.length === 1 ? "" : "s"}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Spec check passed: ${specs.length} HTML specs, ${registry?.specs?.length || 0} registry entries.`);
