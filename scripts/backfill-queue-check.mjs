#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

const VALID_STATUSES = new Set([
  "queued",
  "in-progress",
  "needs-revision",
  "revision-ready",
  "acceptable",
  "out-of-scope",
  "blocked-by-human"
]);

const VALID_OWNER_SKILLS = new Set([
  "backfill-repo-inventory",
  "backfill-user-flow-extraction",
  "backfill-descriptive-spec-author",
  "backfill-rendered-ux-spec",
  "backfill-technical-spec-author",
  "backfill-spec-adequacy-review",
  "evaluate-backfill-specs"
]);

function usage() {
  return `Usage:
  npm run backfill:queue:check -- <path-to-review-report.html>
  node scripts/backfill-queue-check.mjs <path-to-review-report.html>

Options:
  --json    Print JSON output
  --help    Show this help`;
}

function parseArgs(argv) {
  const options = { reportPath: null, json: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { ...options, help: true };
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token.startsWith("--")) throw new Error(`Unknown argument: ${token}`);
    if (options.reportPath) throw new Error(`Unexpected extra argument: ${token}`);
    options.reportPath = path.resolve(token);
  }

  if (!options.help && !options.reportPath) throw new Error("Missing report path");
  return options;
}

function result(id, status, message, details = null) {
  return { id, status, message, ...(details ? { details } : {}) };
}

function pass(id, message, details) {
  return result(id, "pass", message, details);
}

function warn(id, message, details) {
  return result(id, "warn", message, details);
}

function fail(id, message, details) {
  return result(id, "fail", message, details);
}

function extractJsonScript(html, scriptId) {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptPattern.exec(html))) {
    const attrs = match[1];
    const body = match[2].trim();
    const hasId = new RegExp(`\\bid=["']${scriptId}["']`, "i").test(attrs);
    const hasJsonType = /\btype=["']application\/json["']/i.test(attrs);
    if (hasId && hasJsonType) return body;
  }
  return null;
}

function isString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value) {
  return value === null || value === undefined || typeof value === "string";
}

function validateQueue(queue) {
  const results = [];

  results.push(isString(queue.runId)
    ? pass("run-id", "Queue has a run ID")
    : fail("run-id", "Queue must include non-empty runId"));

  results.push(isString(queue.targetRepo)
    ? pass("target-repo", "Queue has a target repo")
    : fail("target-repo", "Queue must include non-empty targetRepo"));

  results.push(Array.isArray(queue.slices) && queue.slices.length > 0
    ? pass("slices-present", `Queue has ${queue.slices?.length || 0} slice(s)`)
    : fail("slices-present", "Queue must include at least one slice"));

  if (!Array.isArray(queue.slices)) return results;

  const ids = new Set();
  const duplicates = [];
  for (const slice of queue.slices) {
    if (isString(slice?.id)) {
      if (ids.has(slice.id)) duplicates.push(slice.id);
      ids.add(slice.id);
    }
  }

  results.push(duplicates.length === 0
    ? pass("unique-slice-ids", "Slice IDs are unique")
    : fail("unique-slice-ids", "Slice IDs must be unique", { duplicates }));

  for (const field of ["currentSlice", "nextSlice"]) {
    const value = queue[field];
    if (!isNullableString(value) || value === "") {
      results.push(fail(field, `${field} must be null, omitted, or a slice ID`, { value }));
    } else if (value && !ids.has(value)) {
      results.push(fail(field, `${field} must refer to an existing slice`, { value }));
    } else {
      results.push(pass(field, `${field} is valid`));
    }
  }

  for (const [index, slice] of queue.slices.entries()) {
    const label = isString(slice?.id) ? slice.id : `slice-${index + 1}`;
    const prefix = `slice:${label}`;

    if (!isString(slice?.id)) results.push(fail(`${prefix}:id`, "Slice must have a non-empty id"));
    if (!isString(slice?.scope)) results.push(fail(`${prefix}:scope`, "Slice must have a non-empty scope"));

    if (!VALID_STATUSES.has(slice?.status)) {
      results.push(fail(`${prefix}:status`, "Slice status is not in the durable queue enum", {
        status: slice?.status,
        validStatuses: [...VALID_STATUSES]
      }));
    } else {
      results.push(pass(`${prefix}:status`, `Slice status is ${slice.status}`));
    }

    if (!VALID_OWNER_SKILLS.has(slice?.ownerSkill)) {
      results.push(fail(`${prefix}:owner-skill`, "Slice ownerSkill must name a Foundation backfill skill", {
        ownerSkill: slice?.ownerSkill,
        validOwnerSkills: [...VALID_OWNER_SKILLS]
      }));
    } else {
      results.push(pass(`${prefix}:owner-skill`, `Slice ownerSkill is ${slice.ownerSkill}`));
    }

    if (!isNullableString(slice?.descriptiveSpec)) {
      results.push(fail(`${prefix}:descriptive-spec`, "descriptiveSpec must be a string, null, or omitted"));
    }
    if (!isNullableString(slice?.technicalSpec)) {
      results.push(fail(`${prefix}:technical-spec`, "technicalSpec must be a string, null, or omitted"));
    }

    if (slice?.score !== null && slice?.score !== undefined && (typeof slice.score !== "number" || slice.score < 0 || slice.score > 100)) {
      results.push(fail(`${prefix}:score`, "score must be null, omitted, or a number from 0 to 100", { score: slice?.score }));
    }

    if (slice?.status === "acceptable" && (typeof slice.score !== "number" || slice.score < 96)) {
      results.push(fail(`${prefix}:acceptable-score`, "Acceptable slices must include score >= 96", { score: slice?.score }));
    }

    if (slice?.status === "needs-revision" || slice?.status === "revision-ready" || slice?.status === "in-progress") {
      if (!isString(slice?.nextAction)) {
        results.push(fail(`${prefix}:next-action`, "Active or revision slices must include a concrete nextAction"));
      }
      if (!isString(slice?.exitCriterion)) {
        results.push(fail(`${prefix}:exit-criterion`, "Active or revision slices must include a concrete exitCriterion"));
      }
    }

    if (!Array.isArray(slice?.blockingGaps)) {
      results.push(fail(`${prefix}:blocking-gaps`, "blockingGaps must be an array"));
    }
    if (!Array.isArray(slice?.evidence)) {
      results.push(fail(`${prefix}:evidence`, "evidence must be an array"));
    }
  }

  const unfinished = queue.slices.filter(slice => !["acceptable", "out-of-scope", "blocked-by-human"].includes(slice.status));
  if (unfinished.length > 0 && !queue.nextSlice) {
    results.push(warn("next-slice", "Queue has unfinished slices but no nextSlice", {
      unfinished: unfinished.map(slice => slice.id).filter(Boolean)
    }));
  }

  return results;
}

function validateReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return [fail("report-exists", `Report does not exist: ${reportPath}`)];
  }

  const html = fs.readFileSync(reportPath, "utf8");
  const jsonText = extractJsonScript(html, "backfill-slice-queue");
  if (!jsonText) {
    return [fail("queue-script", "Report must include <script type=\"application/json\" id=\"backfill-slice-queue\">")];
  }

  let queue;
  try {
    queue = JSON.parse(jsonText);
  } catch (error) {
    return [fail("queue-json", "Backfill slice queue JSON must parse", { error: error.message })];
  }

  return [
    pass("queue-script", "Report includes embedded durable queue"),
    pass("queue-json", "Backfill slice queue JSON parses"),
    ...validateQueue(queue)
  ];
}

function summarize(results) {
  return {
    pass: results.filter(item => item.status === "pass").length,
    warn: results.filter(item => item.status === "warn").length,
    fail: results.filter(item => item.status === "fail").length
  };
}

function renderText(results) {
  const summary = summarize(results);
  const lines = ["Backfill queue check"];
  for (const item of results) {
    lines.push(`${item.status.toUpperCase()} [${item.id}] ${item.message}`);
  }
  lines.push(`Summary: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`);
  return lines.join("\n");
}

function main() {
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
    return;
  }

  const results = validateReport(options.reportPath);
  const summary = summarize(results);
  if (options.json) console.log(JSON.stringify({ results, summary }, null, 2));
  else console.log(renderText(results));
  process.exit(summary.fail > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}

export { parseArgs, validateQueue, validateReport, renderText };
