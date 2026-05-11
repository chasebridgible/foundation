#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const docsDir = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(docsDir, "site-map.js");

const groupOrder = [
  {
    group: "Core Concepts",
    include: file => !file.startsWith("specs/"),
    order: [
      "compounding-systems.html",
      "principles/core-principles.html",
      "principles/sw-principles.html",
      "general/operating-spec.html",
      "definitions/sw-definitions.html"
    ]
  },
  {
    group: "Spec System",
    include: file => /^specs\/(index|process|linking)\.html$/.test(file),
    order: ["specs/index.html", "specs/process.html", "specs/linking.html"]
  },
  {
    group: "Spec Templates",
    include: file => file.startsWith("specs/templates/"),
    order: [
      "specs/templates/descriptive-spec-template.html",
      "specs/templates/technical-spec-template.html",
      "specs/templates/test-spec-template.html"
    ]
  },
  {
    group: "Spec Examples",
    include: file => file.startsWith("specs/examples/"),
    order: [
      "specs/examples/descriptive-spec-example.html",
      "specs/examples/technical-spec-example.html",
      "specs/examples/test-spec-example.html"
    ]
  }
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    if (!entry.isFile() || !entry.name.endsWith(".html")) return [];
    return [path.relative(docsDir, fullPath).split(path.sep).join("/")];
  });
}

function readPage(file) {
  const html = fs.readFileSync(path.join(docsDir, file), "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() || file;
  const specId = html.match(/<meta name="spec:id" content="([^"]+)">/)?.[1];
  const cleanTitle = title
    .replace(/ - Foundation$/, "")
    .replace(/ \u2014 Core Concepts$/, "");
  return { title: cleanTitle, path: file, ...(specId ? { specId } : {}) };
}

function orderItems(files, order) {
  const index = new Map(order.map((file, position) => [file, position]));
  return files
    .slice()
    .sort((a, b) => {
      const ai = index.has(a) ? index.get(a) : Number.MAX_SAFE_INTEGER;
      const bi = index.has(b) ? index.get(b) : Number.MAX_SAFE_INTEGER;
      return ai - bi || a.localeCompare(b);
    })
    .map(readPage);
}

const htmlFiles = walk(docsDir);
const groups = groupOrder
  .map(group => ({
    group: group.group,
    items: orderItems(htmlFiles.filter(group.include), group.order)
  }))
  .filter(group => group.items.length > 0);

const contents = `window.FoundationSiteMap = ${JSON.stringify(groups, null, 2)};\n`;
fs.writeFileSync(outputPath, contents);
console.log(`Wrote ${path.relative(process.cwd(), outputPath)} with ${htmlFiles.length} HTML files.`);
