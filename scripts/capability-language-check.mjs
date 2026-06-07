#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadSpecDocuments,
  parseCliArgs
} from "./visible-business-graph-core.mjs";

const thisFile = fileURLToPath(import.meta.url);
const repoRoot = path.dirname(path.dirname(thisFile));

const childTitleWorkVerbs = [
  "author",
  "capture",
  "classify",
  "convert",
  "create",
  "define",
  "deploy",
  "evaluate",
  "fill",
  "gather",
  "generate",
  "implement",
  "install",
  "inventory",
  "map",
  "package",
  "record",
  "render",
  "review",
  "revise",
  "run",
  "update",
  "write"
];

const bannedArtifactOnlyTitles = new Set([
  "artifact inventory",
  "surface registry",
  "surface function map",
  "surface / function map",
  "capability map",
  "job spec queue",
  "spec job queue",
  "context pack",
  "process action map",
  "process / action map",
  "author specs",
  "graph evaluation",
  "handoff",
  "file registry"
]);

function stripTags(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function reliableOutcomeFor(html) {
  const match = html.match(/<tr><td>Reliable outcome<\/td><td>([\s\S]*?)<\/td><td>/);
  return match ? stripTags(match[1]) : "";
}

function startsWithWorkVerb(value) {
  const lower = value.trim().toLowerCase();
  return childTitleWorkVerbs.some(verb => lower === verb || lower.startsWith(`${verb} `));
}

function hasOutcomeMarker(value) {
  return /\b(can|is|are|becomes|become|has|have|receives|stays|stay|remains|remain|produces|produce)\b/i.test(value);
}

function looksLikePlaceholder(value) {
  return /\[[^\]]+\]/.test(value) || /\bTBD\b/i.test(value) || /\bTODO\b/i.test(value);
}

export function validateCapabilityLanguage(repoRoot) {
  const docs = loadSpecDocuments(repoRoot).filter(doc => doc.metadata?.type === "capability");
  const docsById = new Map(docs.map(doc => [doc.metadata.id, doc]));
  const results = [];

  for (const doc of docs) {
    const { metadata } = doc;
    const tags = new Set(metadata.tags || []);
    const title = String(metadata.title || "").trim();
    const lowerTitle = title.toLowerCase();
    const reliableOutcome = reliableOutcomeFor(doc.html);
    const prefix = `${metadata.id}`;

    if (!title) {
      results.push({ status: "fail", id: `${prefix}:title`, message: "Capability must have a visible title." });
    } else if (!tags.has("parent-capability") && startsWithWorkVerb(title)) {
      results.push({
        status: "fail",
        id: `${prefix}:child-title-outcome-shaped`,
        message: `Child capability title must be outcome-shaped, not job/phase-shaped: ${title}`
      });
    } else if (bannedArtifactOnlyTitles.has(lowerTitle)) {
      results.push({
        status: "fail",
        id: `${prefix}:artifact-title`,
        message: `Capability title is an artifact or layer name, not an outcome statement: ${title}`
      });
    } else {
      results.push({ status: "pass", id: `${prefix}:title`, message: "Capability title is present and not an artifact-only layer name." });
    }

    if (!reliableOutcome) {
      results.push({ status: "fail", id: `${prefix}:reliable-outcome`, message: "Capability must have an Outcome contract row named Reliable outcome." });
    } else if (looksLikePlaceholder(reliableOutcome)) {
      results.push({ status: "fail", id: `${prefix}:reliable-outcome-placeholder`, message: "Reliable outcome must not contain placeholders." });
    } else if (startsWithWorkVerb(reliableOutcome)) {
      results.push({
        status: "fail",
        id: `${prefix}:reliable-outcome-job-shaped`,
        message: `Reliable outcome starts with triggered-work language instead of a durable condition: ${reliableOutcome}`
      });
    } else if (!hasOutcomeMarker(reliableOutcome)) {
      results.push({
        status: "fail",
        id: `${prefix}:reliable-outcome-state`,
        message: `Reliable outcome must read as a standing ability or durable condition: ${reliableOutcome}`
      });
    } else {
      results.push({ status: "pass", id: `${prefix}:reliable-outcome`, message: "Reliable outcome reads as a standing ability or durable condition." });
    }

    if (tags.has("parent-capability")) {
      const childCapabilityIds = (metadata.children || []).filter(id => docsById.has(id));
      const gapCoverage = (metadata.coverage || []).some(item => item.status === "gap" && (item.evidence || item.path || item.command));
      if (childCapabilityIds.length === 0 && !gapCoverage) {
        results.push({
          status: "fail",
          id: `${prefix}:parent-children`,
          message: "Parent capability must contain child capability specs or an explicit scoped gap."
        });
      } else {
        results.push({ status: "pass", id: `${prefix}:parent-children`, message: "Parent capability has child capabilities or an explicit scoped gap." });
      }
    }

    if (!tags.has("parent-capability") && metadata.parent) {
      const parentDoc = docsById.get(metadata.parent);
      if (parentDoc && !(parentDoc.metadata.tags || []).includes("parent-capability")) {
        results.push({
          status: "warn",
          id: `${prefix}:parent-altitude`,
          message: `Child capability parent is another child capability rather than a parent family: ${metadata.parent}`
        });
      }
    }
  }

  return results;
}

function summarize(results) {
  return results.reduce((summary, result) => {
    summary[result.status] = (summary[result.status] || 0) + 1;
    return summary;
  }, { pass: 0, warn: 0, fail: 0 });
}

if (process.argv[1] === thisFile) {
  const args = parseCliArgs(process.argv.slice(2));
  const targetRepo = path.resolve(args.repo || repoRoot);
  const results = validateCapabilityLanguage(targetRepo);
  const summary = summarize(results);
  if (summary.fail > 0) {
    console.error(`Capability language check failed with ${summary.fail} issue${summary.fail === 1 ? "" : "s"}:`);
    for (const result of results.filter(item => item.status === "fail")) {
      console.error(`- ${result.id}: ${result.message}`);
    }
    process.exit(1);
  }
  for (const result of results.filter(item => item.status === "warn")) {
    console.warn(`WARN ${result.id}: ${result.message}`);
  }
  console.log(`Capability language check passed: ${summary.pass} pass, ${summary.warn} warn.`);
}
