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
      "general/system-philosophy.html",
      "compounding-systems.html",
      "principles/core-principles.html",
      "principles/business-principles.html",
      "principles/sw-dev-principles.html",
      "principles/ai-evals-principles.html",
      "principles/sw-design-principles.html",
      "general/operating-spec.html",
      "general/business-os.html",
      "general/business-capability-map.html",
      "definitions/sw-definitions.html"
    ]
  },
  {
    group: "Spec System",
    include: file => /^specs\/(index|process|linking)\.html$/.test(file),
    order: ["specs/index.html", "specs/process.html", "specs/linking.html"]
  },
  {
    group: "Foundation Specs",
    include: file => /^specs\/[^/]+\.html$/.test(file) && !/^specs\/(index|process|linking)\.html$/.test(file),
    order: [
      "specs/foundation-workspace-model.html",
      "specs/foundation-backfill-specs.html",
      "specs/foundation-backfill-orchestration-technical.html",
      "specs/foundation-backfill-quality-evaluation.html",
      "specs/foundation-backfill-artifact-inventory.html",
      "specs/foundation-backfill-artifact-inventory-technical.html",
      "specs/foundation-backfill-artifact-inventory-eval.html",
      "specs/foundation-backfill-surface-function-map.html",
      "specs/foundation-backfill-surface-function-map-technical.html",
      "specs/foundation-backfill-surface-function-map-eval.html",
      "specs/foundation-backfill-capability-map.html",
      "specs/foundation-backfill-capability-map-technical.html",
      "specs/foundation-backfill-capability-map-eval.html",
      "specs/foundation-backfill-spec-job-queue.html",
      "specs/foundation-backfill-spec-job-queue-technical.html",
      "specs/foundation-backfill-spec-job-queue-eval.html",
      "specs/foundation-backfill-context-pack.html",
      "specs/foundation-backfill-context-pack-technical.html",
      "specs/foundation-backfill-context-pack-eval.html",
      "specs/foundation-backfill-process-action-map.html",
      "specs/foundation-backfill-process-action-map-technical.html",
      "specs/foundation-backfill-process-action-map-eval.html",
      "specs/foundation-backfill-author-specs.html",
      "specs/foundation-backfill-author-specs-technical.html",
      "specs/foundation-backfill-author-specs-eval.html",
      "specs/foundation-backfill-job-slice-evaluation.html",
      "specs/foundation-backfill-job-slice-evaluation-technical.html",
      "specs/foundation-backfill-job-slice-evaluation-eval.html",
      "specs/foundation-backfill-system-coherence-evaluation.html",
      "specs/foundation-backfill-system-coherence-evaluation-technical.html",
      "specs/foundation-backfill-system-coherence-evaluation-eval.html",
      "specs/foundation-backfill-handoff.html",
      "specs/foundation-backfill-handoff-technical.html",
      "specs/foundation-backfill-handoff-eval.html",
      "specs/foundation-agents-load-canary-eval.html",
      "specs/foundation-workspace-doctor-technical.html",
      "specs/foundation-workspace-doctor-eval.html"
    ]
  },
  {
    group: "Spec Templates",
    include: file => file.startsWith("specs/templates/"),
    order: [
      "specs/templates/descriptive-spec-template.html",
      "specs/templates/technical-spec-template.html",
      "specs/templates/eval-spec-template.html"
    ]
  },
  {
    group: "Spec Examples",
    include: file => file.startsWith("specs/examples/"),
    order: [
      "specs/examples/backfill-golden-example.html",
      "specs/examples/descriptive-spec-example.html",
      "specs/examples/technical-spec-example.html",
      "specs/examples/eval-spec-example.html"
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
  const cleanTitle = title.replace(/ (?:\u2014|-) Core Concepts$/, "");
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

const contents = `window.SubstrateSiteMap = ${JSON.stringify(groups, null, 2)};\n`;
fs.writeFileSync(outputPath, contents);
console.log(`Wrote ${path.relative(process.cwd(), outputPath)} with ${htmlFiles.length} HTML files.`);
