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
const checkOnly = process.argv.includes("--check");

const registryPattern = /<script type="application\/json" id="spec-registry">[\s\S]*?<\/script>/;
const preferredOrder = [
  "docs/specs/index.html",
  "docs/specs/process.html",
  "docs/specs/linking.html",
  "docs/specs/templates/descriptive-spec-template.html",
  "docs/specs/templates/technical-spec-template.html",
  "docs/specs/templates/test-spec-template.html",
  "docs/specs/examples/descriptive-spec-example.html",
  "docs/specs/examples/technical-spec-example.html",
  "docs/specs/examples/test-spec-example.html"
];
const preferredOrderByPath = new Map(preferredOrder.map((file, index) => [file, index]));
let gitReadContext;
let existingRegistryByFile;

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

function isGeneratedNonSpecHtml(file) {
  const relativeFile = relativeSpecPath(file);
  return /^docs\/specs\/backfill\/(?:file|surface)-registry-(eval-summary|handoff)-\d{8}-\d{2}\.html$/.test(relativeFile) ||
    /^docs\/specs\/backfill\/capability-matrix-summary-\d{8}-\d{2}\.html$/.test(relativeFile) ||
    /^docs\/specs\/backfill\/split-queue-summary-\d{8}-\d{2}\.html$/.test(relativeFile);
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
    const match = indexHtml.match(registryPattern);
    if (!match) return existingRegistryByFile;
    const registry = JSON.parse(match[0].replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""));
    for (const spec of registry.specs || []) existingRegistryByFile.set(spec.file, spec);
  } catch {
    existingRegistryByFile.clear();
  }
  return existingRegistryByFile;
}

function registryPathFor(file) {
  return `${repoName}/${relativeSpecPath(file)}`;
}

function extractJson(html, id, file) {
  const match = html.match(new RegExp(`<script type="application/json" id="${id}">([\\s\\S]*?)<\\/script>`));
  if (!match) throw new Error(`${file}: missing ${id} JSON`);
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`${file}: ${id} is not valid JSON (${error.message})`);
  }
}

function attributesFromTag(tag) {
  return Object.fromEntries([...tag.matchAll(/([a-zA-Z0-9:-]+)="([^"]*)"/g)].map(match => [match[1], match[2]]));
}

function sectionEntries(html) {
  return [...html.matchAll(/<section\b[^>]*>/g)]
    .map(match => attributesFromTag(match[0]))
    .filter(attributes => attributes.id);
}

function canonicalSection(html, file) {
  const sections = sectionEntries(html);
  const canonicalSections = sections.filter(section => section["data-spec-canonical"] === "true");

  if (canonicalSections.length > 1) {
    const ids = canonicalSections.map(section => section.id).join(", ");
    throw new Error(`${file}: only one section can set data-spec-canonical="true" (${ids})`);
  }

  if (canonicalSections.length === 1) return canonicalSections[0].id;

  const firstSpecSection = sections.find(section => section["data-spec-section"]);
  if (firstSpecSection) return firstSpecSection.id;

  if (sections.length > 0) return sections[0].id;

  throw new Error(`${file}: cannot derive canonicalSection because no sections have an id`);
}

function orderedSpecFiles() {
  return walk(specsDir).filter(file => !isGeneratedNonSpecHtml(file)).sort((left, right) => {
    const leftPath = relativeSpecPath(left);
    const rightPath = relativeSpecPath(right);
    const leftRank = preferredOrderByPath.get(leftPath) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = preferredOrderByPath.get(rightPath) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return leftPath.localeCompare(rightPath);
  });
}

function addIfPresent(entry, metadata, key) {
  if (Object.prototype.hasOwnProperty.call(metadata, key)) entry[key] = metadata[key];
}

function registryEntry(file) {
  const relativeFile = relativeSpecPath(file);
  const existing = existingRegistryEntriesByFile().get(registryPathFor(file));
  if (existing && isCleanTrackedSpec(file)) return existing;
  const html = readSpecText(file);
  const metadata = extractJson(html, "spec-metadata", relativeFile);
  const entry = {
    id: metadata.id,
    title: metadata.title,
    type: metadata.type,
    status: metadata.status,
    file: registryPathFor(file),
    canonicalSection: canonicalSection(html, relativeFile),
    lastUpdated: metadata.lastUpdated,
    reviewCadence: metadata.reviewCadence,
    confidence: metadata.confidence
  };

  for (const key of [
    "replaces",
    "replacedBy",
    "parent",
    "children",
    "relatedSpecs",
    "ownedPaths",
    "implementationPaths",
    "coverage",
    "boardCards",
    "tags"
  ]) {
    addIfPresent(entry, metadata, key);
  }

  return entry;
}

function buildRegistry() {
  const specs = orderedSpecFiles().map(registryEntry);
  const lastUpdated = specs
    .map(spec => spec.lastUpdated)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    registryVersion: "1.0",
    lastUpdated,
    description: "Generated index from canonical spec-metadata embedded in HTML spec files. Paths are repo-relative with the repository name prefix.",
    specs
  };
}

function renderRegistry(registry) {
  return `<script type="application/json" id="spec-registry">\n${JSON.stringify(registry, null, 2)}\n</script>`;
}

function replaceRegistry(indexHtml, renderedRegistry) {
  if (!registryPattern.test(indexHtml)) {
    throw new Error("docs/specs/index.html: missing spec-registry script");
  }
  return indexHtml.replace(registryPattern, renderedRegistry);
}

const indexHtml = fs.readFileSync(indexPath, "utf8");
const nextIndexHtml = replaceRegistry(indexHtml, renderRegistry(buildRegistry()));

if (checkOnly) {
  if (nextIndexHtml !== indexHtml) {
    console.error("Spec registry is stale. Run npm run spec:registry.");
    process.exit(1);
  }
  console.log("Spec registry is current.");
} else {
  fs.writeFileSync(indexPath, nextIndexHtml);
  console.log(`Updated ${relativeSpecPath(indexPath)} from canonical spec metadata.`);
}
