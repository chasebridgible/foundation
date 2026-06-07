#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

const VALID_STATUSES = new Set([
  "pending",
  "ready",
  "in-progress",
  "acceptable",
  "out-of-scope",
  "blocked"
]);

const VALID_CAPABILITY_STATUSES = new Set([
  "unmapped",
  "mapped",
  "needs-split",
  "ready-for-queue",
  "queued",
  "in-progress",
  "needs-job",
  "needs-descriptive",
  "needs-technical",
  "needs-evaluation",
  "needs-revision",
  "acceptable",
  "blocked",
  "blocked-by-human",
  "out-of-scope"
]);

const VALID_CAPABILITY_ALTITUDES = new Set([
  "parent",
  "child",
  "sole",
  "needs-split",
  "blocked"
]);

const QUEUE_ELIGIBLE_CAPABILITY_ALTITUDES = new Set(["child", "sole"]);

const VALID_OWNER_SKILLS = new Set([
  "backfill-context-pack",
  "backfill-job-spec-author",
  "backfill-descriptive-spec-author",
  "backfill-rendered-ux-spec",
  "backfill-technical-spec-author",
  "backfill-spec-adequacy-review",
  "backfill-evaluate-specs",
  "evaluate-backfill-specs",
  "manual-decision"
]);

function usage() {
  return `Usage:
  npm run backfill:spec-job-queue:check -- <path-to-review-report.html>
  node scripts/spec-job-queue-report-check.mjs <path-to-review-report.html>

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
  const scriptIds = Array.isArray(scriptId) ? scriptId : [scriptId];
  for (const id of scriptIds) {
    const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = scriptPattern.exec(html))) {
      const attrs = match[1];
      const body = match[2].trim();
      const hasId = new RegExp(`\\bid=["']${id}["']`, "i").test(attrs);
      const hasJsonType = /\btype=["']application\/json["']/i.test(attrs);
      if (hasId && hasJsonType) return body;
    }
  }
  return null;
}

function isString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value) {
  return value === null || value === undefined || typeof value === "string";
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isString);
}

function hasOwn(object, field) {
  return Boolean(object && Object.prototype.hasOwnProperty.call(object, field));
}

function preferredField(object, primary, legacy) {
  return hasOwn(object, primary) ? object[primary] : object?.[legacy];
}

function warnLegacyField(results, object, prefix, primary, legacy) {
  if (hasOwn(object, legacy) && !hasOwn(object, primary)) {
    results.push(warn(`${prefix}:legacy-${legacy}`, `${legacy} is legacy; use ${primary}`));
  }
}

function validateNullableStringField(results, object, prefix, primary, legacy) {
  warnLegacyField(results, object, prefix, primary, legacy);
  const value = preferredField(object, primary, legacy);
  if (!isNullableString(value)) {
    results.push(fail(`${prefix}:${primary}`, `${primary} must be a string, null, or omitted`));
  }
  return value;
}

function validateStringArrayField(results, object, prefix, primary, legacy) {
  warnLegacyField(results, object, prefix, primary, legacy);
  const value = preferredField(object, primary, legacy);
  if (!isStringArray(value)) {
    results.push(fail(`${prefix}:${primary}`, `${primary} must be an array of non-empty strings`));
  }
  return value;
}

function validateCapabilityMap(matrix) {
  const results = [];

  results.push(isString(matrix.runId)
    ? pass("capability-run-id", "Capability Map has a run ID")
    : fail("capability-run-id", "Capability Map must include non-empty runId"));

  results.push(isString(matrix.targetRepo)
    ? pass("capability-target-repo", "Capability Map has a target repo")
    : fail("capability-target-repo", "Capability Map must include non-empty targetRepo"));

  results.push(Array.isArray(matrix.capabilities) && matrix.capabilities.length > 0
    ? pass("capabilities-present", `Capability Map has ${matrix.capabilities?.length || 0} row(s)`)
    : fail("capabilities-present", "Capability Map must include at least one capability row"));

  if (!Array.isArray(matrix.capabilities)) return results;

  const ids = new Set();
  const duplicates = [];
  for (const capability of matrix.capabilities) {
    if (isString(capability?.id)) {
      if (ids.has(capability.id)) duplicates.push(capability.id);
      ids.add(capability.id);
    }
  }

  results.push(duplicates.length === 0
    ? pass("unique-capability-ids", "Capability IDs are unique")
    : fail("unique-capability-ids", "Capability IDs must be unique", { duplicates }));

  const childParentIds = new Set(matrix.capabilities
    .filter(capability => capability?.capabilityAltitude === "child" && isString(capability?.parentCapabilityId))
    .map(capability => capability.parentCapabilityId));
  const parentWithoutChildren = matrix.capabilities
    .filter(capability => capability?.capabilityAltitude === "parent" && !childParentIds.has(capability.id))
    .map(capability => capability.id)
    .filter(isString);
  results.push(parentWithoutChildren.length === 0
    ? pass("parent-capabilities-have-children", "Parent capabilities decompose to child rows")
    : fail("parent-capabilities-have-children", "Parent capabilities must decompose to child capability rows", { parentWithoutChildren }));

  for (const [index, capability] of matrix.capabilities.entries()) {
    const label = isString(capability?.id) ? capability.id : `capability-${index + 1}`;
    const prefix = `capability:${label}`;

    if (!isString(capability?.id)) results.push(fail(`${prefix}:id`, "Capability must have a non-empty id"));
    if (!isString(capability?.name)) results.push(fail(`${prefix}:name`, "Capability must have a non-empty name"));
    if (!isString(capability?.capabilityTitle)) results.push(fail(`${prefix}:capability-title`, "Capability must have a non-empty capabilityTitle"));
    if (!isString(capability?.actor)) results.push(fail(`${prefix}:actor`, "Capability must have a non-empty actor"));
    if (!isString(capability?.intendedOutcome)) results.push(fail(`${prefix}:intended-outcome`, "Capability must have a non-empty intendedOutcome"));
    if (!isString(capability?.domainObject)) results.push(fail(`${prefix}:domain-object`, "Capability must have a non-empty domainObject"));

    for (const field of [
      "actions",
      "states",
      "permissionsAndRules",
      "surfaces",
      "backingContracts",
      "failureAndRecovery",
      "evidence",
      "technicalSections",
      "verificationTargets",
      "blockingGaps",
      "humanDecisions"
    ]) {
      if (!isStringArray(capability?.[field])) {
        results.push(fail(`${prefix}:${field}`, `${field} must be an array of non-empty strings`));
      }
    }

    const jobSpec = validateNullableStringField(results, capability, prefix, "jobSpec", "descriptiveSpec");
    const jobSections = validateStringArrayField(results, capability, prefix, "jobSections", "descriptiveSections");
    if (!isNullableString(capability?.technicalSpec)) {
      results.push(fail(`${prefix}:technical-spec`, "technicalSpec must be a string, null, or omitted"));
    }

    if (!VALID_CAPABILITY_STATUSES.has(capability?.status)) {
      results.push(fail(`${prefix}:status`, "Capability status is not in the Capability Map enum", {
        status: capability?.status,
        validStatuses: [...VALID_CAPABILITY_STATUSES]
      }));
    } else {
      results.push(pass(`${prefix}:status`, `Capability status is ${capability.status}`));
    }

    if (!VALID_CAPABILITY_ALTITUDES.has(capability?.capabilityAltitude)) {
      results.push(fail(`${prefix}:capability-altitude`, "Capability altitude is not in the Foundation capability model enum", {
        capabilityAltitude: capability?.capabilityAltitude,
        validAltitudes: [...VALID_CAPABILITY_ALTITUDES]
      }));
    } else {
      results.push(pass(`${prefix}:capability-altitude`, `Capability altitude is ${capability.capabilityAltitude}`));
    }

    if (typeof capability?.queueEligible !== "boolean") {
      results.push(fail(`${prefix}:queue-eligible`, "Capability must include boolean queueEligible"));
    }

    if (capability?.queueEligible === true && !QUEUE_ELIGIBLE_CAPABILITY_ALTITUDES.has(capability?.capabilityAltitude)) {
      results.push(fail(`${prefix}:queue-eligible-model`, "Only child or sole capability rows may be queueEligible", {
        capabilityAltitude: capability?.capabilityAltitude
      }));
    }

    if (QUEUE_ELIGIBLE_CAPABILITY_ALTITUDES.has(capability?.capabilityAltitude) && capability?.status === "ready-for-queue" && capability?.queueEligible !== true) {
      results.push(fail(`${prefix}:queue-eligible-required`, "Ready child or sole capability rows must set queueEligible true"));
    }

    if (capability?.capabilityAltitude === "child" && !isString(capability?.parentCapabilityId)) {
      results.push(fail(`${prefix}:parent-capability-id`, "Child capability rows must name parentCapabilityId"));
    }

    if (capability?.capabilityAltitude === "needs-split" && !isString(capability?.blockerOrSplitReason) && !isString(capability?.splitReason)) {
      results.push(fail(`${prefix}:split-reason`, "needs-split capability rows must name blockerOrSplitReason or splitReason"));
    }

    if (capability?.capabilityAltitude === "blocked" && !isString(capability?.blockerOrSplitReason) && (!Array.isArray(capability?.blockingGaps) || capability.blockingGaps.length === 0) && (!Array.isArray(capability?.humanDecisions) || capability.humanDecisions.length === 0)) {
      results.push(fail(`${prefix}:blocker-detail`, "blocked capability rows must name blockerOrSplitReason, blockingGaps, or humanDecisions"));
    }

    if (capability?.splitNeeded !== undefined && typeof capability.splitNeeded !== "boolean") {
      results.push(fail(`${prefix}:split-needed`, "splitNeeded must be a boolean when present", { splitNeeded: capability?.splitNeeded }));
    }

    if (capability?.status === "acceptable") {
      if (capability?.splitNeeded === true || capability?.status === "needs-split" || capability?.capabilityAltitude === "needs-split") {
        results.push(fail(`${prefix}:acceptable-split`, "Acceptable capabilities cannot need split"));
      }
      if (!isString(jobSpec)) results.push(fail(`${prefix}:acceptable-job-spec`, "Acceptable capabilities must name a jobSpec"));
      if (!isString(capability?.technicalSpec)) results.push(fail(`${prefix}:acceptable-technical-spec`, "Acceptable capabilities must name a technicalSpec"));
      if (!isStringArray(jobSections) || jobSections.length === 0) results.push(fail(`${prefix}:acceptable-job-sections`, "Acceptable capabilities must include jobSections"));
      if (!isStringArray(capability?.technicalSections) || capability.technicalSections.length === 0) results.push(fail(`${prefix}:acceptable-technical-sections`, "Acceptable capabilities must include technicalSections"));
      if (!isStringArray(capability?.verificationTargets) || capability.verificationTargets.length === 0) results.push(fail(`${prefix}:acceptable-verification-targets`, "Acceptable capabilities must include verificationTargets"));
      if (!isStringArray(capability?.evidence) || capability.evidence.length === 0) results.push(fail(`${prefix}:acceptable-evidence`, "Acceptable capabilities must include evidence"));
    }
  }

  return results;
}

function validateQueue(queue, capabilityById = null) {
  const results = [];

  results.push(isString(queue.runId)
    ? pass("run-id", "Queue has a run ID")
    : fail("run-id", "Queue must include non-empty runId"));

  results.push(isString(queue.targetRepo)
    ? pass("target-repo", "Queue has a target repo")
    : fail("target-repo", "Queue must include non-empty targetRepo"));

  results.push(queue.schema === "foundation.backfill.spec-job-queue.v1"
    ? pass("queue-schema", "Queue uses the canonical Spec Job Queue schema")
    : fail("queue-schema", "Queue must use foundation.backfill.spec-job-queue.v1", { schema: queue.schema }));

  results.push(Array.isArray(queue.queue) && queue.queue.length > 0
    ? pass("queue-present", `Queue has ${queue.queue?.length || 0} slice(s)`)
    : fail("queue-present", "Queue must include at least one queue row"));

  if (!Array.isArray(queue.queue)) return results;

  const ids = new Set();
  const duplicates = [];
  for (const slice of queue.queue) {
    if (isString(slice?.sliceId)) {
      if (ids.has(slice.sliceId)) duplicates.push(slice.sliceId);
      ids.add(slice.sliceId);
    }
  }

  results.push(duplicates.length === 0
    ? pass("unique-slice-ids", "Slice IDs are unique")
    : fail("unique-slice-ids", "Slice IDs must be unique", { duplicates }));

  for (const [index, slice] of queue.queue.entries()) {
    const label = isString(slice?.sliceId) ? slice.sliceId : `slice-${index + 1}`;
    const prefix = `slice:${label}`;

    if (!isString(slice?.sliceId)) results.push(fail(`${prefix}:id`, "Slice must have a non-empty sliceId"));
    if (!isString(slice?.name)) results.push(fail(`${prefix}:name`, "Slice must have a non-empty name"));
    if (!isString(slice?.scope)) results.push(fail(`${prefix}:scope`, "Slice must have a non-empty scope"));

    if (!isStringArray(slice?.upstreamCapabilityIds) || slice.upstreamCapabilityIds.length === 0) {
      results.push(fail(`${prefix}:capability-ids`, "Slice must list at least one upstreamCapabilityIds entry"));
    } else if (capabilityById) {
      const unknown = slice.upstreamCapabilityIds.filter(id => !capabilityById.has(id));
      if (unknown.length > 0) {
        results.push(fail(`${prefix}:capability-refs`, "Slice upstreamCapabilityIds must refer to Capability Map rows", { unknown }));
      } else {
        results.push(pass(`${prefix}:capability-refs`, "Slice upstreamCapabilityIds refer to Capability Map rows"));
      }
      const unqueueable = slice.upstreamCapabilityIds
        .map(id => capabilityById.get(id))
        .filter(Boolean)
        .filter(capability => capability.queueEligible !== true || !QUEUE_ELIGIBLE_CAPABILITY_ALTITUDES.has(capability.capabilityAltitude));
      if (unqueueable.length > 0) {
        results.push(fail(`${prefix}:queue-eligible-capability-refs`, "Slices may only reference queue-eligible child/sole capability rows", {
          unqueueable: unqueueable.map(capability => ({
            id: capability.id,
            capabilityAltitude: capability.capabilityAltitude,
            queueEligible: capability.queueEligible
          }))
        }));
      } else {
        results.push(pass(`${prefix}:queue-eligible-capability-refs`, "Slice references only queue-eligible child/sole capability rows"));
      }
    }

    if (!isString(slice?.capabilityAltitude)) {
      results.push(fail(`${prefix}:capability-altitude`, "Slice must preserve capabilityAltitude"));
    }

    if (!Array.isArray(slice?.capabilityRefs) || slice.capabilityRefs.length === 0) {
      results.push(fail(`${prefix}:capability-refs-array`, "Slice must preserve capabilityRefs from queue-eligible child/sole capability rows"));
    }

    if (!VALID_STATUSES.has(slice?.status)) {
      results.push(fail(`${prefix}:status`, "Slice status is not in the Spec Job Queue enum", {
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
      if (slice.ownerSkill === "backfill-descriptive-spec-author") {
        results.push(warn(`${prefix}:legacy-owner-skill`, "backfill-descriptive-spec-author is legacy; use backfill-job-spec-author"));
      }
    }

    const jobSpec = validateNullableStringField(results, slice, prefix, "jobSpec", "descriptiveSpec");
    const jobSections = hasOwn(slice, "jobSections") || hasOwn(slice, "descriptiveSections")
      ? validateStringArrayField(results, slice, prefix, "jobSections", "descriptiveSections")
      : undefined;
    if (!isNullableString(slice?.technicalSpec)) {
      results.push(fail(`${prefix}:technical-spec`, "technicalSpec must be a string, null, or omitted"));
    }

    if (slice?.status === "ready" || slice?.status === "in-progress") {
      if (!isString(slice?.nextAction)) {
        results.push(fail(`${prefix}:next-action`, "Ready or in-progress slices must include a concrete nextAction"));
      }
      if (!isString(slice?.exitCriterion)) {
        results.push(fail(`${prefix}:exit-criterion`, "Ready or in-progress slices must include a concrete exitCriterion"));
      }
    }

    if (slice?.status === "acceptable") {
      if (!isString(jobSpec)) results.push(fail(`${prefix}:acceptable-job-spec`, "Acceptable slices must name a jobSpec"));
      if (!isString(slice?.technicalSpec)) results.push(fail(`${prefix}:acceptable-technical-spec`, "Acceptable slices must name a technicalSpec"));
      if (!isStringArray(jobSections) || jobSections.length === 0) results.push(fail(`${prefix}:acceptable-job-sections`, "Acceptable slices must include jobSections"));
      if (!isStringArray(slice?.technicalSections) || slice.technicalSections.length === 0) results.push(fail(`${prefix}:acceptable-technical-sections`, "Acceptable slices must include technicalSections"));
      if (!isStringArray(slice?.verificationTargets) || slice.verificationTargets.length === 0) results.push(fail(`${prefix}:acceptable-verification-targets`, "Acceptable slices must include verificationTargets"));
    }

    if (!Array.isArray(slice?.blockingQuestions)) {
      results.push(fail(`${prefix}:blocking-questions`, "blockingQuestions must be an array"));
    }
    if (!Array.isArray(slice?.blockingGaps)) {
      results.push(fail(`${prefix}:blocking-gaps`, "blockingGaps must be an array"));
    }
    if (!Array.isArray(slice?.humanDecisions)) {
      results.push(fail(`${prefix}:human-decisions`, "humanDecisions must be an array"));
    }
  }

  const unfinished = queue.queue.filter(slice => !["acceptable", "out-of-scope", "blocked"].includes(slice.status));
  const active = queue.queue.some(slice => slice.status === "ready" || slice.status === "in-progress");
  if (unfinished.length > 0 && !active) {
    results.push(warn("next-slice", "Queue has unfinished slices but no ready or in-progress slice", {
      unfinished: unfinished.map(slice => slice.sliceId).filter(Boolean)
    }));
  }

  return results;
}

function validateReport(reportPath) {
  if (!fs.existsSync(reportPath)) {
    return [fail("report-exists", `Report does not exist: ${reportPath}`)];
  }

  const html = fs.readFileSync(reportPath, "utf8");
  const results = [];

  const matrixText = extractJsonScript(html, "backfill-capability-map");
  let capabilityById = null;
  if (!matrixText) {
    results.push(fail("capability-script", "Report must include <script type=\"application/json\" id=\"backfill-capability-map\">"));
  } else {
    try {
      const matrix = JSON.parse(matrixText);
      results.push(pass("capability-script", "Report includes embedded Capability Map"));
      results.push(pass("capability-json", "Backfill Capability Map JSON parses"));
      results.push(...validateCapabilityMap(matrix));
      if (Array.isArray(matrix.capabilities)) {
        capabilityById = new Map(matrix.capabilities
          .filter(capability => isString(capability?.id))
          .map(capability => [capability.id, capability]));
      }
    } catch (error) {
      results.push(fail("capability-json", "Backfill Capability Map JSON must parse", { error: error.message }));
    }
  }

  const jsonText = extractJsonScript(html, "backfill-spec-job-queue");
  if (!jsonText) {
    results.push(fail("queue-script", "Report must include <script type=\"application/json\" id=\"backfill-spec-job-queue\">"));
    return results;
  }

  let queue;
  try {
    queue = JSON.parse(jsonText);
  } catch (error) {
    results.push(fail("queue-json", "Backfill Spec Job Queue JSON must parse", { error: error.message }));
    return results;
  }

  return [
    ...results,
    pass("queue-script", "Report includes embedded Spec Job Queue"),
    pass("queue-json", "Backfill Spec Job Queue JSON parses"),
    ...validateQueue(queue, capabilityById)
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
  const lines = ["Spec Job Queue report check"];
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

export { parseArgs, validateCapabilityMap, validateQueue, validateReport, renderText };
