#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const docsDir = path.dirname(scriptPath);
const repoRoot = path.dirname(docsDir);
const defaultOutputPath = path.join(docsDir, "site-map.js");
const skipDirectoryNames = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "vendor"
]);

function usage() {
  return `Usage:
  node docs/generate-site-map.mjs
  node docs/generate-site-map.mjs --root docs --root knowledge-base --output docs/site-map.js

Options:
  --root <path>      HTML document root relative to repo root. Repeatable. Defaults to docs.
  --output <path>    Generated JS file relative to repo root. Defaults to docs/site-map.js.
  --repo-root <path> Repository root. Defaults to this script's parent directory.
  --help            Show this help`;
}

function slash(value) {
  return value.split(path.sep).join("/");
}

function parseArgs(argv) {
  const options = {
    outputPath: defaultOutputPath,
    repoRoot,
    roots: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { ...options, help: true };
    if (token === "--root" || token === "--output" || token === "--repo-root") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
      index += 1;
      if (token === "--root") options.roots.push(value);
      if (token === "--output") options.outputPath = value;
      if (token === "--repo-root") options.repoRoot = value;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  options.repoRoot = path.resolve(options.repoRoot);
  options.outputPath = path.resolve(options.repoRoot, options.outputPath);
  if (options.roots.length === 0) options.roots.push(slash(path.relative(options.repoRoot, docsDir)));
  options.roots = options.roots.map(root => path.resolve(options.repoRoot, root));
  return options;
}

function humanizeFolder(name) {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase());
}

function cleanTitle(title) {
  return title.replace(/ (?:\u2014|-) Core Concepts$/, "");
}

function readPage(file, outputDir, rootPath, options) {
  const html = fs.readFileSync(file, "utf8");
  const title = cleanTitle(html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || path.basename(file));
  const specId = html.match(/<meta name="spec:id" content="([^"]+)">/)?.[1];
  return {
    type: "file",
    name: path.basename(file),
    title,
    path: slash(path.relative(outputDir, file)),
    sourcePath: slash(path.relative(options.repoRoot, file)),
    rootPath: slash(path.relative(options.repoRoot, rootPath)),
    ...(specId ? { specId } : {})
  };
}

function entryRank(entry) {
  if (entry.isFile() && entry.name === "index.html") return 0;
  if (entry.isDirectory()) return 1;
  return 2;
}

function compareEntries(a, b) {
  const rank = entryRank(a) - entryRank(b);
  return rank || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
}

function shouldSkipEntry(entry) {
  return entry.name.startsWith(".") || skipDirectoryNames.has(entry.name);
}

function walkFolder(dir, rootPath, options) {
  if (!fs.existsSync(dir)) return [];

  const outputDir = path.dirname(options.outputPath);
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter(entry => !shouldSkipEntry(entry))
    .sort(compareEntries)
    .flatMap(entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const items = walkFolder(fullPath, rootPath, options);
        if (items.length === 0) return [];
        return [{
          type: "folder",
          name: entry.name,
          title: humanizeFolder(entry.name),
          sourcePath: slash(path.relative(options.repoRoot, fullPath)),
          items
        }];
      }
      if (!entry.isFile() || !entry.name.endsWith(".html")) return [];
      return [readPage(fullPath, outputDir, rootPath, options)];
    });
}

function rootNode(rootPath, options) {
  const name = path.basename(rootPath);
  return {
    type: "folder",
    name,
    title: name === "docs" ? "Documents" : humanizeFolder(name),
    sourcePath: slash(path.relative(options.repoRoot, rootPath)),
    items: walkFolder(rootPath, rootPath, options)
  };
}

function countFiles(items) {
  return items.reduce((count, item) => count + (item.type === "file" ? 1 : countFiles(item.items || [])), 0);
}

function buildSiteMap(options) {
  const roots = options.roots
    .map(root => rootNode(root, options))
    .filter(root => root.items.length > 0);
  const items = roots.length === 1 ? roots[0].items : roots;
  return {
    version: "2.0",
    label: "Documents",
    roots: roots.map(root => ({ title: root.title, sourcePath: root.sourcePath })),
    fileCount: countFiles(items),
    items
  };
}

let options;
try {
  options = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error.message);
  console.error("");
  console.error(usage());
  process.exit(2);
}

if (options.help) {
  console.log(usage());
  process.exit(0);
}

const siteMap = buildSiteMap(options);
const contents = `window.SubstrateSiteMap = ${JSON.stringify(siteMap, null, 2)};\n`;
fs.mkdirSync(path.dirname(options.outputPath), { recursive: true });
fs.writeFileSync(options.outputPath, contents);
console.log(`Wrote ${slash(path.relative(process.cwd(), options.outputPath))} with ${siteMap.fileCount} HTML files.`);
