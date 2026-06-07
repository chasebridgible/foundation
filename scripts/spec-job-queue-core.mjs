#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  ensureDir,
  fail,
  parseCliArgs,
  pass,
  readJson,
  readJsonl,
  renderResultsText,
  summarizeResults,
  warn,
  writeJson,
  writeJsonl
} from "./artifact-inventory-core.mjs";
import {
  capabilityAltitudeFor,
  capabilityCheckPathFor,
  capabilityEvalReceiptPathFor,
  capabilityMapPathFor,
  capabilityModelCounts,
  capabilitySummaryPathFor,
  isQueueEligibleCapability,
  parseJsonScript,
  readCapabilityMapRows,
  validateCapabilityMap
} from "./capability-map-core.mjs";

const VALID_SPEC_JOB_QUEUE_STATUSES = new Set(["pending", "ready", "in-progress", "acceptable", "blocked", "out-of-scope"]);
const VALID_CONFIDENCE = new Set(["low", "medium", "high"]);
const VALID_REVIEW_FLAG_SEVERITY = new Set(["info", "warning", "blocking"]);
const TERMINAL_QUEUE_STATUSES = new Set(["ready", "acceptable", "blocked", "out-of-scope"]);
const ACTIVE_QUEUE_STATUSES = new Set(["ready", "in-progress"]);
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
const GENERIC_SCOPE_WORDS = new Set([
  "all",
  "any",
  "entire",
  "everything",
  "whole",
  "various",
  "misc",
  "miscellaneous",
  "stuff",
  "things",
  "system",
  "platform",
  "application"
]);
const OBJECTIVE_EXIT_WORDS = new Set([
  "artifact",
  "receipt",
  "spec",
  "test",
  "check",
  "passes",
  "fails",
  "assert",
  "verified",
  "documents",
  "evidence",
  "row",
  "section"
]);
const SEMANTIC_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "this",
  "to",
  "with",
  "about",
  "against",
  "backfill",
  "behavior",
  "behaviors",
  "capability",
  "capture",
  "child",
  "collect",
  "current",
  "descriptive",
  "detail",
  "details",
  "doc",
  "docs",
  "document",
  "evidence",
  "file",
  "files",
  "foundation",
  "handoff",
  "pack",
  "proof",
  "queue",
  "receipt",
  "receipts",
  "record",
  "row",
  "rows",
  "slice",
  "slices",
  "spec",
  "specs",
  "system",
  "target",
  "targets",
  "technical",
  "upstream",
  "verification",
  "verify",
  "verifies",
  "verified",
  "write"
]);

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function fileFingerprint(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return `sha256:${sha256Text(fs.readFileSync(filePath, "utf8"))}`;
}

function nowIso() {
  return new Date().toISOString();
}

function specJobQueuePathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `spec-job-queue-${runId}.jsonl`);
}

function specJobQueueCheckPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `spec-job-queue-check-${runId}.json`);
}

function specJobQueueEvalReceiptPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `spec-job-queue-eval-${runId}.jsonl`);
}

function specJobQueueSummaryPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `spec-job-queue-summary-${runId}.html`);
}

function specJobQueueRefreshPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `spec-job-queue-refresh-${runId}.json`);
}

function specJobQueueArtifactFingerprint(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return fileFingerprint(specJobQueuePathFor(repoRoot, runId, outDir));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function asObjectArray(value) {
  return Array.isArray(value) ? value.filter(item => item && typeof item === "object" && !Array.isArray(item)) : [];
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter(isNonEmptyString)
    .map(item => item.trim())
    .filter(Boolean))];
}

function normalizeNullableString(value) {
  return isNonEmptyString(value) ? value.trim() : null;
}

function preferredField(source, primary, legacy) {
  return source?.[primary] !== undefined ? source[primary] : source?.[legacy];
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 52);
}

function stableSliceId(capabilityIds, name, ordinal = 1) {
  const semantic = `${capabilityIds.slice().sort().join("|")}:${name}:${ordinal}`;
  return `slice-${slug(name || "queue-slice")}-${sha256Text(semantic).slice(0, 12)}`;
}

function capabilityFingerprint(row) {
  return `sha256:${sha256Text(JSON.stringify(row))}`;
}

function upstreamCapabilityRef(row) {
  return {
    capabilityId: row.capabilityId,
    name: row.name,
    capabilityTitle: row.capabilityTitle || row.name,
    capabilityAltitude: capabilityAltitudeFor(row),
    parentCapabilityId: row.parentCapabilityId || null,
    parentCapabilityName: row.parentCapabilityName || null,
    queueEligible: isQueueEligibleCapability(row),
    status: row.status,
    splitNeeded: row.splitNeeded === true,
    splitCriteria: Array.isArray(row.splitCriteria) ? row.splitCriteria : [],
    capabilityFingerprint: capabilityFingerprint(row)
  };
}

function terminalCapabilityRows(capabilityRows) {
  return capabilityRows.filter(isQueueEligibleCapability);
}

function readEvalSummary(receiptPath) {
  if (!fs.existsSync(receiptPath)) return null;
  const parsed = readJsonl(receiptPath);
  return parsed.rows.find(row => row.receiptType === "summary") || null;
}

function validateCapabilityMapHandoff(repoRoot, runId, outDir = defaultBackfillDir(repoRoot), reportPath = null) {
  const validation = validateCapabilityMap({ repoRoot, runId, outDir, phase: "handoff", reportPath });
  const results = [...validation.results];

  const checkPath = capabilityCheckPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(checkPath)) {
    results.push(fail("upstream-capability-map-check-artifact", "Passing Capability Map check artifact is required before Define Spec Jobs"));
  } else {
    const check = readJson(checkPath);
    results.push(check?.summary?.fail === 0
      ? pass("upstream-capability-map-check-artifact", "Capability Map check artifact passes")
      : fail("upstream-capability-map-check-artifact", "Capability Map check artifact must pass", { summary: check?.summary || null }));
  }

  const evalSummary = readEvalSummary(capabilityEvalReceiptPathFor(repoRoot, runId, outDir));
  results.push(evalSummary?.acceptabilityGate?.acceptable
    ? pass("upstream-capability-map-eval", "Capability Map eval artifact passes")
    : fail("upstream-capability-map-eval", "Passing Capability Map eval receipt is required before Define Spec Jobs"));
  const revisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  results.push(revisionTargets.length === 0
    ? pass("upstream-capability-map-eval-revisions", "Capability Map eval has no revision targets")
    : fail("upstream-capability-map-eval-revisions", "Capability Map eval revision targets must be resolved before Define Spec Jobs", { revisionTargets }));

  const summaryPath = capabilitySummaryPathFor(repoRoot, runId, outDir);
  results.push(fs.existsSync(summaryPath)
    ? pass("upstream-capability-map-eval-summary", "Capability Map HTML eval summary exists")
    : fail("upstream-capability-map-eval-summary", "Capability Map HTML eval summary is required before Define Spec Jobs", { summaryPath: path.relative(repoRoot, summaryPath) }));

  results.push(...validateSpecJobQueueStartSemanticAudit(validation.capabilityRows));

  return {
    capabilityMapPath: validation.registryPath,
    surfaceFunctionMapPath: validation.surfaceFunctionMapPath,
    surfaceRows: validation.surfaceRows,
    capabilityRows: validation.capabilityRows,
    results
  };
}

function readSpecJobQueueRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const queuePath = specJobQueuePathFor(repoRoot, runId, outDir);
  const parsed = readJsonl(queuePath);
  return { queuePath, ...parsed };
}

function createPendingSliceRow(capabilityRow, ordinal = 1) {
  const now = nowIso();
  const name = `Pending queue slice for ${capabilityRow.name}`;
  return {
    schema: "foundation.backfill.spec-job-queue-row.v1",
    runId: capabilityRow.runId,
    sliceId: stableSliceId([capabilityRow.capabilityId], name, ordinal),
    name,
    upstreamCapabilityIds: [capabilityRow.capabilityId],
    upstreamCapabilityRefs: [upstreamCapabilityRef(capabilityRow)],
    capabilityAltitude: capabilityAltitudeFor(capabilityRow),
    parentCapabilityId: capabilityRow.parentCapabilityId || null,
    parentCapabilityName: capabilityRow.parentCapabilityName || null,
    capabilityRefs: [{
      capabilityId: capabilityRow.capabilityId,
      name: capabilityRow.name,
      capabilityTitle: capabilityRow.capabilityTitle || capabilityRow.name,
      capabilityAltitude: capabilityAltitudeFor(capabilityRow),
      parentCapabilityId: capabilityRow.parentCapabilityId || null,
      parentCapabilityName: capabilityRow.parentCapabilityName || null,
      queueEligible: isQueueEligibleCapability(capabilityRow),
      status: capabilityRow.status,
      splitNeeded: capabilityRow.splitNeeded === true
    }],
    evidenceRefs: [{
      capabilityId: capabilityRow.capabilityId,
      relationship: "capability-map-row",
      detail: `Initialized from Capability Map row ${capabilityRow.capabilityId}: ${capabilityRow.name}.`
    }],
    ownerSkill: "",
    scope: "",
    includedBehaviors: [],
    excludedBehaviors: [],
    exitCriterion: "",
    nextAction: "",
    jobSpec: normalizeNullableString(preferredField(capabilityRow, "jobSpec", "descriptiveSpec")),
    technicalSpec: normalizeNullableString(capabilityRow.technicalSpec),
    jobSections: normalizeStringList(preferredField(capabilityRow, "jobSections", "descriptiveSections")),
    technicalSections: normalizeStringList(capabilityRow.technicalSections),
    verificationTargets: normalizeStringList(capabilityRow.verificationTargets),
    childSliceRationale: "",
    blockingQuestions: [],
    blockingGaps: [],
    humanDecisions: [],
    reviewFlags: [],
    status: "pending",
    confidence: "low",
    createdAt: now,
    updatedAt: now
  };
}

function createInitialSpecJobQueueRows(capabilityRows) {
  return terminalCapabilityRows(capabilityRows).map((row, index) => createPendingSliceRow(row, index + 1));
}

function normalizeReviewFlags(value) {
  return asObjectArray(value).map(flag => ({
    severity: VALID_REVIEW_FLAG_SEVERITY.has(flag.severity) ? flag.severity : "warning",
    reason: isNonEmptyString(flag.reason) ? flag.reason.trim() : "Queue slice needs review.",
    evidence: isNonEmptyString(flag.evidence) ? flag.evidence.trim() : "",
    nextAction: isNonEmptyString(flag.nextAction) ? flag.nextAction.trim() : "Revise this Define Spec Jobs row."
  }));
}

function createAgentMarkedSpecJobQueueRow(capabilityById, selectedCapabilityIds, spec, ordinal = 1) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error("Spec Job Queue slice spec must be an object");
  }

  const selectedSet = new Set(selectedCapabilityIds);
  const upstreamCapabilityIds = normalizeStringList(spec.upstreamCapabilityIds);
  const rowCapabilityIds = upstreamCapabilityIds.length > 0 ? upstreamCapabilityIds : selectedCapabilityIds;
  if (rowCapabilityIds.length === 0) throw new Error("Spec Job Queue slice requires at least one upstream capability ID");
  for (const capabilityId of rowCapabilityIds) {
    if (!selectedSet.has(capabilityId)) throw new Error(`Spec Job Queue slice references capability not included in --capability-ids: ${capabilityId}`);
    const capability = capabilityById.get(capabilityId);
    if (!capability) throw new Error(`Spec Job Queue slice references unknown capability: ${capabilityId}`);
    if (!isQueueEligibleCapability(capability)) {
      throw new Error(`Spec Job Queue slice references capability that is not queueEligible child/sole work: ${capabilityId}`);
    }
  }

  const capabilities = rowCapabilityIds.map(capabilityId => capabilityById.get(capabilityId));
  const statusFromSpec = isNonEmptyString(spec.status) ? spec.status.trim() : null;
  const status = statusFromSpec && VALID_SPEC_JOB_QUEUE_STATUSES.has(statusFromSpec) ? statusFromSpec : "ready";
  const name = isNonEmptyString(spec.name)
    ? spec.name.trim()
    : `${capabilities.map(row => row.name).join(" + ")} queue slice`;
  const sliceId = isNonEmptyString(spec.sliceId || spec.rowId || spec.id)
    ? String(spec.sliceId || spec.rowId || spec.id).trim()
    : stableSliceId(rowCapabilityIds, name, ordinal);
  const now = nowIso();
  const verificationTargets = normalizeStringList(spec.verificationTargets);

  return {
    schema: "foundation.backfill.spec-job-queue-row.v1",
    runId: capabilities[0].runId,
    sliceId,
    name,
    upstreamCapabilityIds: rowCapabilityIds,
    upstreamCapabilityRefs: capabilities.map(upstreamCapabilityRef),
    capabilityAltitude: capabilities.length === 1 ? capabilityAltitudeFor(capabilities[0]) : "mixed",
    parentCapabilityId: capabilities.length === 1 ? capabilities[0].parentCapabilityId || null : null,
    parentCapabilityName: capabilities.length === 1 ? capabilities[0].parentCapabilityName || null : null,
    capabilityRefs: capabilities.map(capability => ({
      capabilityId: capability.capabilityId,
      name: capability.name,
      capabilityTitle: capability.capabilityTitle || capability.name,
      capabilityAltitude: capabilityAltitudeFor(capability),
      parentCapabilityId: capability.parentCapabilityId || null,
      parentCapabilityName: capability.parentCapabilityName || null,
      queueEligible: isQueueEligibleCapability(capability),
      status: capability.status,
      splitNeeded: capability.splitNeeded === true
    })),
    evidenceRefs: [
      ...capabilities.map(capability => ({
        capabilityId: capability.capabilityId,
        relationship: "capability-map-row",
        detail: `Queue slice is derived from Capability Map row ${capability.capabilityId}: ${capability.name}.`
      })),
      ...asObjectArray(spec.evidenceRefs)
    ],
    ownerSkill: isNonEmptyString(spec.ownerSkill) ? spec.ownerSkill.trim() : "backfill-context-pack",
    scope: isNonEmptyString(spec.scope) ? spec.scope.trim() : "",
    includedBehaviors: normalizeStringList(spec.includedBehaviors || spec.inScope),
    excludedBehaviors: normalizeStringList(spec.excludedBehaviors || spec.outOfScope),
    exitCriterion: isNonEmptyString(spec.exitCriterion) ? spec.exitCriterion.trim() : "",
    nextAction: isNonEmptyString(spec.nextAction) ? spec.nextAction.trim() : "",
    jobSpec: normalizeNullableString(preferredField(spec, "jobSpec", "descriptiveSpec")),
    technicalSpec: normalizeNullableString(spec.technicalSpec),
    jobSections: normalizeStringList(preferredField(spec, "jobSections", "descriptiveSections")),
    technicalSections: normalizeStringList(spec.technicalSections),
    verificationTargets: verificationTargets.length > 0
      ? verificationTargets
      : normalizeStringList(capabilities.flatMap(capability => capability.verificationTargets || [])),
    childSliceRationale: isNonEmptyString(spec.childSliceRationale || spec.splitRationale)
      ? String(spec.childSliceRationale || spec.splitRationale).trim()
      : "",
    blockingQuestions: normalizeStringList(spec.blockingQuestions),
    blockingGaps: normalizeStringList(spec.blockingGaps),
    humanDecisions: normalizeStringList(spec.humanDecisions),
    reviewFlags: normalizeReviewFlags(spec.reviewFlags),
    status,
    confidence: VALID_CONFIDENCE.has(spec.confidence) ? spec.confidence : "medium",
    createdAt: now,
    updatedAt: now
  };
}

function parseCapabilityIds(value) {
  if (!isNonEmptyString(value)) return [];
  const raw = value.trim();
  if (raw.startsWith("[")) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("--capability-ids JSON must be an array");
    return normalizeStringList(parsed);
  }
  return normalizeStringList(raw.split(","));
}

function markSpecJobQueueRowsForCapabilities({ capabilityRows, queueRows, capabilityIds, sliceSpecs }) {
  const selectedCapabilityIds = normalizeStringList(capabilityIds);
  if (selectedCapabilityIds.length === 0) throw new Error("Define Spec Jobs fill requires --capability-ids");
  if (!Array.isArray(sliceSpecs) || sliceSpecs.length === 0) {
    throw new Error("Define Spec Jobs fill requires at least one slice spec");
  }

  const capabilityById = new Map(capabilityRows.map(row => [row.capabilityId, row]));
  for (const capabilityId of selectedCapabilityIds) {
    const capability = capabilityById.get(capabilityId);
    if (!capability) throw new Error(`Unknown Capability Map row: ${capabilityId}`);
    if (!isQueueEligibleCapability(capability)) {
      throw new Error(`Capability is not queueEligible child/sole work for Define Spec Jobs: ${capabilityId}`);
    }
  }

  const nextRows = sliceSpecs.map((spec, index) => createAgentMarkedSpecJobQueueRow(
    capabilityById,
    selectedCapabilityIds,
    spec,
    index + 1
  ));
  const covered = new Set(nextRows.flatMap(row => row.upstreamCapabilityIds));
  const missing = selectedCapabilityIds.filter(capabilityId => !covered.has(capabilityId));
  if (missing.length > 0) {
    throw new Error(`Spec Job Queue slice specs did not cover selected capability ID(s): ${missing.join(", ")}`);
  }
  const alignmentIssues = auditSpecJobQueueSemanticAlignment({
    capabilityRows: selectedCapabilityIds.map(capabilityId => capabilityById.get(capabilityId)).filter(Boolean),
    queueRows: nextRows
  });
  if (alignmentIssues.length > 0) {
    const details = alignmentIssues
      .slice(0, 5)
      .map(issue => `${issue.sliceId}: ${issue.message}`)
      .join("; ");
    throw new Error(`Spec Job Queue semantic alignment failed; revise child slice names, scopes, includedBehaviors, or split rationales to match capability identity and splitCriteria. ${details}`);
  }

  const selected = new Set(selectedCapabilityIds);
  const replacedRows = queueRows.filter(row => (row.upstreamCapabilityIds || []).some(capabilityId => selected.has(capabilityId)));
  const replacedIds = new Set(replacedRows.map(row => row.sliceId));
  const revisionCount = replacedRows.filter(row => row.status !== "pending").length;
  const output = queueRows.filter(row => !(row.upstreamCapabilityIds || []).some(capabilityId => selected.has(capabilityId)));
  output.push(...nextRows);
  output.sort(compareQueueRows);

  return {
    rows: output,
    markedCapabilityIds: selectedCapabilityIds,
    sliceCount: nextRows.length,
    revisionCount,
    replacedSliceIds: [...replacedIds]
  };
}

function rowHasBlockingFlag(row) {
  return Array.isArray(row?.reviewFlags) && row.reviewFlags.some(flag => flag.severity === "blocking");
}

function compareQueueRows(left, right) {
  const leftKey = `${left.status === "pending" ? "0" : "1"}:${left.upstreamCapabilityIds?.[0] || ""}:${left.name || left.sliceId}`;
  const rightKey = `${right.status === "pending" ? "0" : "1"}:${right.upstreamCapabilityIds?.[0] || ""}:${right.name || right.sliceId}`;
  return leftKey.localeCompare(rightKey) || left.sliceId.localeCompare(right.sliceId);
}

function nextSpecJobQueueTarget({ capabilityRows, queueRows }) {
  const capabilityById = new Map(capabilityRows.map(row => [row.capabilityId, row]));
  const candidates = queueRows
    .filter(row => row.status === "pending" || row.status === "in-progress" || rowHasBlockingFlag(row))
    .sort((left, right) => {
      const leftNeedsSplit = (left.upstreamCapabilityIds || []).some(id => capabilityById.get(id)?.status === "needs-split");
      const rightNeedsSplit = (right.upstreamCapabilityIds || []).some(id => capabilityById.get(id)?.status === "needs-split");
      if (leftNeedsSplit !== rightNeedsSplit) return leftNeedsSplit ? -1 : 1;
      const leftRank = rowHasBlockingFlag(left) ? 0 : left.status === "in-progress" ? 1 : 2;
      const rightRank = rowHasBlockingFlag(right) ? 0 : right.status === "in-progress" ? 1 : 2;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return compareQueueRows(left, right);
    });
  const target = candidates[0] || queueRows.filter(row => row.status === "ready").sort(compareQueueRows)[0] || null;
  if (!target) return null;
  return {
    sliceId: target.sliceId,
    status: target.status,
    name: target.name,
    upstreamCapabilityIds: target.upstreamCapabilityIds || [],
    upstreamCapabilities: (target.upstreamCapabilityIds || []).map(id => {
      const row = capabilityById.get(id);
      return row ? {
        capabilityId: row.capabilityId,
        name: row.name,
        status: row.status,
        splitNeeded: row.splitNeeded === true,
        splitCriteria: row.splitCriteria || []
      } : { capabilityId: id, missing: true };
    }),
    scope: target.scope,
    exitCriterion: target.exitCriterion,
    nextAction: target.nextAction,
    ownerSkill: target.ownerSkill,
    reviewFlags: target.reviewFlags || []
  };
}

function validateUnique(rows, field, label) {
  const seen = new Set();
  const duplicates = [];
  for (const row of rows) {
    if (!isNonEmptyString(row?.[field])) continue;
    if (seen.has(row[field])) duplicates.push(row[field]);
    seen.add(row[field]);
  }
  return duplicates.length === 0
    ? pass(`${label}-${field}-unique`, `${label} ${field} values are unique`)
    : fail(`${label}-${field}-unique`, `${label} ${field} values must be unique`, { duplicates });
}

function validateReviewFlags(row, prefix, results) {
  if (!Array.isArray(row?.reviewFlags)) {
    results.push(fail(`${prefix}:review-flags`, "reviewFlags must be an array"));
    return;
  }
  for (const [index, flag] of row.reviewFlags.entries()) {
    const label = `${prefix}:review-flags:${index + 1}`;
    if (!VALID_REVIEW_FLAG_SEVERITY.has(flag?.severity)) results.push(fail(`${label}:severity`, "Review flag severity is invalid"));
    if (!isNonEmptyString(flag?.reason)) results.push(fail(`${label}:reason`, "Review flag requires reason"));
    if (!isNonEmptyString(flag?.nextAction)) results.push(fail(`${label}:next-action`, "Review flag requires nextAction"));
  }
}

function validateSpecJobQueueRowShape(row, prefix, results, phase) {
  if (row?.schema !== "foundation.backfill.spec-job-queue-row.v1") {
    results.push(fail(`${prefix}:schema`, "Spec Job Queue row schema is invalid", { schema: row?.schema }));
  }
  if (!isNonEmptyString(row?.runId)) results.push(fail(`${prefix}:run-id`, "Spec Job Queue row requires runId"));
  if (!isNonEmptyString(row?.sliceId)) results.push(fail(`${prefix}:slice-id`, "Spec Job Queue row requires sliceId"));
  if (!isNonEmptyString(row?.name)) results.push(fail(`${prefix}:name`, "Spec Job Queue row requires name"));
  if (!VALID_SPEC_JOB_QUEUE_STATUSES.has(row?.status)) {
    results.push(fail(`${prefix}:status`, "Spec Job Queue status is outside enum", { status: row?.status }));
  }
  if (!VALID_CONFIDENCE.has(row?.confidence)) {
    results.push(fail(`${prefix}:confidence`, "Spec Job Queue confidence is outside enum", { confidence: row?.confidence }));
  }
  for (const field of [
    "upstreamCapabilityIds",
    "includedBehaviors",
    "excludedBehaviors",
    "technicalSections",
    "verificationTargets",
    "blockingQuestions",
    "blockingGaps",
    "humanDecisions",
    "reviewFlags"
  ]) {
    if (!Array.isArray(row?.[field])) results.push(fail(`${prefix}:${field}`, `${field} must be an array`));
  }
  const jobSections = preferredField(row, "jobSections", "descriptiveSections");
  if (!Array.isArray(jobSections)) {
    results.push(fail(`${prefix}:jobSections`, "jobSections must be an array"));
  }
  if (!Array.isArray(row?.upstreamCapabilityRefs) || !row.upstreamCapabilityRefs.every(ref => ref && typeof ref === "object" && !Array.isArray(ref))) {
    results.push(fail(`${prefix}:upstream-capability-refs`, "upstreamCapabilityRefs must be an array of objects"));
  }
  if (!Array.isArray(row?.capabilityRefs) || !row.capabilityRefs.every(ref => ref && typeof ref === "object" && !Array.isArray(ref))) {
    results.push(fail(`${prefix}:capability-refs`, "capabilityRefs must be an array of objects"));
  }
  if (row?.status !== "pending") {
    if (!isNonEmptyString(row?.capabilityAltitude)) {
      results.push(fail(`${prefix}:capability-altitude`, "Non-pending queue rows must carry capabilityAltitude from the upstream child/sole capability"));
    }
    if (row?.capabilityAltitude === "parent" || row?.capabilityAltitude === "needs-split" || row?.capabilityAltitude === "blocked") {
      results.push(fail(`${prefix}:capability-altitude-queueable`, "Queue rows cannot be derived from parent, needs-split, or blocked capability rows", { capabilityAltitude: row.capabilityAltitude }));
    }
  }
  if (!Array.isArray(row?.evidenceRefs) || row.evidenceRefs.length === 0) {
    results.push(fail(`${prefix}:evidence-refs`, "Spec Job Queue rows require evidenceRefs"));
  }
  validateReviewFlags(row, prefix, results);

  if (phase === "handoff" && row?.status === "pending") {
    results.push(fail(`${prefix}:pending-handoff`, "Handoff requires every queue row to be ready, acceptable, blocked, or out-of-scope"));
  }
  if (phase === "handoff" && row?.status === "in-progress") {
    results.push(fail(`${prefix}:in-progress-handoff`, "Handoff requires no in-progress queue rows"));
  }
  if (row?.status !== "pending") {
    if (!VALID_OWNER_SKILLS.has(row?.ownerSkill)) {
      results.push(fail(`${prefix}:owner-skill`, "Non-pending queue rows require a valid ownerSkill", { ownerSkill: row?.ownerSkill }));
    }
    if (!isNonEmptyString(row?.scope)) results.push(fail(`${prefix}:scope`, "Non-pending queue rows require scope"));
    if (!isNonEmptyString(row?.exitCriterion)) results.push(fail(`${prefix}:exit-criterion`, "Non-pending queue rows require exitCriterion"));
  }
  if (ACTIVE_QUEUE_STATUSES.has(row?.status) && !isNonEmptyString(row?.nextAction)) {
    results.push(fail(`${prefix}:next-action`, "Active queue rows require exactly one current nextAction string"));
  }
  if ((row?.status === "ready" || row?.status === "acceptable") && (!isStringArray(row?.verificationTargets) || row.verificationTargets.length === 0)) {
    results.push(fail(`${prefix}:verification-targets:terminal`, "Ready or acceptable queue rows require verificationTargets"));
  }
  if (row?.status === "blocked" && !hasBlockingDetail(row)) {
    results.push(fail(`${prefix}:blocked-detail`, "Blocked queue rows require blockingQuestions, blockingGaps, or humanDecisions"));
  }
  if (row?.status === "out-of-scope" && (!isStringArray(row?.humanDecisions) || row.humanDecisions.length === 0)) {
    results.push(fail(`${prefix}:out-of-scope-decision`, "Out-of-scope queue rows require a named human decision"));
  }
}

function hasBlockingDetail(row) {
  return normalizeStringList(row?.blockingQuestions).length > 0 ||
    normalizeStringList(row?.blockingGaps).length > 0 ||
    normalizeStringList(row?.humanDecisions).length > 0;
}

function validateSpecJobQueueRows({ capabilityRows, queueRows, phase = "handoff" }) {
  const results = [];
  const capabilityById = new Map(capabilityRows.map(row => [row.capabilityId, row]));
  const rowsByCapability = new Map();
  const stale = [];
  const pending = [];
  const inProgress = [];
  const terminalCapabilities = terminalCapabilityRows(capabilityRows);

  results.push(validateUnique(queueRows, "sliceId", "spec-job-queue"));

  for (const [index, row] of queueRows.entries()) {
    const prefix = `spec-job-queue:${row?.sliceId || index + 1}`;
    validateSpecJobQueueRowShape(row, prefix, results, phase);
    if (row.status === "pending") pending.push(row.sliceId);
    if (row.status === "in-progress") inProgress.push(row.sliceId);

    for (const capabilityId of row.upstreamCapabilityIds || []) {
      if (!rowsByCapability.has(capabilityId)) rowsByCapability.set(capabilityId, []);
      rowsByCapability.get(capabilityId).push(row);
      const capability = capabilityById.get(capabilityId);
      if (!capability) {
        results.push(fail(`${prefix}:upstream-capability-resolves`, "Spec Job Queue row references missing Capability Map row", { capabilityId }));
      } else if (!isQueueEligibleCapability(capability)) {
        results.push(fail(`${prefix}:upstream-capability-queue-eligible`, "Spec Job Queue row references a capability that is not queueEligible child/sole work", {
          capabilityId,
          status: capability.status,
          capabilityAltitude: capabilityAltitudeFor(capability),
          queueEligible: capability.queueEligible === true
        }));
      }
    }

    for (const ref of row.upstreamCapabilityRefs || []) {
      const capability = capabilityById.get(ref.capabilityId);
      if (!capability) continue;
      if (ref.capabilityFingerprint !== capabilityFingerprint(capability)) {
        stale.push({ sliceId: row.sliceId, capabilityId: ref.capabilityId, name: ref.name });
      }
    }
  }

  results.push(stale.length === 0
    ? pass("spec-job-queue-upstream-fresh", "Spec Job Queue upstream capability fingerprints match Capability Map rows")
    : fail("spec-job-queue-upstream-fresh", "Spec Job Queue rows must be refreshed when upstream Capability Map rows change", { stale }));

  const uncovered = [];
  for (const capability of terminalCapabilities) {
    const attached = rowsByCapability.get(capability.capabilityId) || [];
    const hasQueue = attached.some(row => VALID_SPEC_JOB_QUEUE_STATUSES.has(row.status));
    if (!hasQueue) uncovered.push({ capabilityId: capability.capabilityId, name: capability.name, status: capability.status });
  }
  if (uncovered.length === 0) {
    results.push(pass("spec-job-queue-covers-capabilities", "Every terminal Capability Map row has queue coverage"));
  } else if (phase === "handoff") {
    results.push(fail("spec-job-queue-covers-capabilities", "Define Spec Jobs must cover every terminal Capability Map row before Context Pack", { uncovered }));
  } else {
    results.push(warn("spec-job-queue-covers-capabilities", `${uncovered.length} terminal capability row(s) still need queue coverage`, { uncovered }));
  }

  const unqueueableReferences = queueRows
    .flatMap(row => (row.upstreamCapabilityIds || []).map(capabilityId => ({ row, capability: capabilityById.get(capabilityId), capabilityId })))
    .filter(item => item.capability && !isQueueEligibleCapability(item.capability))
    .map(item => ({
      sliceId: item.row.sliceId,
      capabilityId: item.capabilityId,
      capabilityAltitude: capabilityAltitudeFor(item.capability),
      status: item.capability.status,
      queueEligible: item.capability.queueEligible === true
    }));
  results.push(unqueueableReferences.length === 0
    ? pass("spec-job-queue-only-queue-eligible-capabilities", "Queue rows only reference child or sole queue-eligible capabilities")
    : fail("spec-job-queue-only-queue-eligible-capabilities", "Parent, needs-split, blocked, and non-capability rows cannot enter Define Spec Jobs", { unqueueableReferences }));

  const semanticAlignmentIssues = auditSpecJobQueueSemanticAlignment({ capabilityRows, queueRows });
  results.push(semanticAlignmentIssues.length === 0
    ? pass("spec-job-queue-semantic-alignment", "Queue slices align with capability identity and splitCriteria")
    : fail("spec-job-queue-semantic-alignment", "Queue slices must be semantically aligned to upstream capability identity, not incidental source paths or unrelated domains", { issues: semanticAlignmentIssues }));

  if (phase === "handoff") {
    results.push(pending.length === 0
      ? pass("handoff-no-pending-slices", "No pending queue slices remain")
      : fail("handoff-no-pending-slices", "Handoff requires zero pending queue slices", { pending }));
    results.push(inProgress.length === 0
      ? pass("handoff-no-in-progress-slices", "No in-progress queue slices remain")
      : fail("handoff-no-in-progress-slices", "Handoff requires no in-progress queue slices", { inProgress }));
  } else {
    results.push(warn("batch-pending-slices-allowed", `${pending.length} pending queue slice(s) remain in batch phase`, { pendingCount: pending.length }));
  }

  return results;
}

function readSpecJobQueueEvalSummary(repoRoot, runId, outDir) {
  return readEvalSummary(specJobQueueEvalReceiptPathFor(repoRoot, runId, outDir));
}

function validateSpecJobQueueEvalFreshness({ repoRoot, runId, outDir, queueRows }) {
  const evalSummary = readSpecJobQueueEvalSummary(repoRoot, runId, outDir);
  if (!evalSummary) return [];
  const currentFingerprint = specJobQueueArtifactFingerprint(repoRoot, runId, outDir);
  const expectedRowCount = queueRows.length;
  const actualRowCount = Number.isInteger(evalSummary.queueRowCount) ? evalSummary.queueRowCount : null;
  const fresh = Boolean(evalSummary.queueFingerprint) &&
    evalSummary.queueFingerprint === currentFingerprint &&
    actualRowCount === expectedRowCount;
  return fresh
    ? [pass("spec-job-queue-eval-current", "Define Spec Jobs eval receipt matches the current queue artifact")]
    : [fail("spec-job-queue-eval-current", "Define Spec Jobs eval must be regenerated after queue artifact changes", {
      expectedQueueFingerprint: currentFingerprint,
      actualQueueFingerprint: evalSummary.queueFingerprint || null,
      expectedRowCount,
      actualRowCount
    })];
}

function validateSpecJobQueueReportState({ repoRoot, runId, outDir, reportPath, capabilityRows, queueRows }) {
  if (!reportPath) return [];
  if (!fs.existsSync(reportPath)) return [fail("spec-job-queue-report-exists", "Report path passed to checker does not exist", { reportPath })];
  const html = fs.readFileSync(reportPath, "utf8");
  const state = parseJsonScript(html, "backfill-spec-job-queue-state");
  if (!state) return [fail("spec-job-queue-report-state", "Report is missing backfill-spec-job-queue-state JSON script")];
  const expected = buildSpecJobQueueReportState({ repoRoot, runId, outDir, capabilityRows, queueRows });
  const drift = [];
  for (const [field, value] of Object.entries(expected)) {
    if (field === "generatedAt" || field === "latestRunLogSequence") continue;
    if (state[field] !== value) drift.push({ field, expected: value, actual: state[field] });
  }
  return drift.length === 0
    ? [pass("spec-job-queue-report-state-current", "Define Spec Jobs report state matches canonical artifacts")]
    : [fail("spec-job-queue-report-state-current", "Define Spec Jobs report state must match canonical artifacts", { drift })];
}

function validateSpecJobQueue({ repoRoot, runId, outDir = defaultBackfillDir(repoRoot), phase = "handoff", reportPath = null, skipEvalFreshness = false }) {
  const upstream = validateCapabilityMapHandoff(repoRoot, runId, outDir);
  const results = [...upstream.results];
  const queuePath = specJobQueuePathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(queuePath)) {
    return {
      queuePath,
      capabilityMapPath: upstream.capabilityMapPath,
      capabilityRows: upstream.capabilityRows,
      queueRows: [],
      results: [...results, fail("spec-job-queue-exists", `Define Spec Jobs artifact does not exist: ${queuePath}`)]
    };
  }
  const parsed = readJsonl(queuePath);
  results.push(pass("spec-job-queue-exists", "Define Spec Jobs artifact exists"));
  if (parsed.errors.length > 0) {
    results.push(...parsed.errors.map(error => fail(`spec-job-queue-jsonl:${error.line}`, "Define Spec Jobs JSONL line must parse", error)));
    return { queuePath, capabilityMapPath: upstream.capabilityMapPath, capabilityRows: upstream.capabilityRows, queueRows: parsed.rows, results };
  }
  results.push(pass("spec-job-queue-jsonl", "Every Define Spec Jobs line parses as JSON"));
  results.push(...validateSpecJobQueueRows({ capabilityRows: upstream.capabilityRows, queueRows: parsed.rows, phase }));
  if (!skipEvalFreshness) {
    results.push(...validateSpecJobQueueEvalFreshness({ repoRoot, runId, outDir, queueRows: parsed.rows }));
  }
  results.push(...validateSpecJobQueueReportState({ repoRoot, runId, outDir, reportPath, capabilityRows: upstream.capabilityRows, queueRows: parsed.rows }));
  return {
    queuePath,
    capabilityMapPath: upstream.capabilityMapPath,
    capabilityRows: upstream.capabilityRows,
    queueRows: parsed.rows,
    results
  };
}

function selectSpecJobQueueEvalSample(queueRows, mode = "risk") {
  if (mode === "all" || queueRows.length <= 120) return queueRows;
  const selected = new Map();
  for (const row of queueRows) {
    if (!TERMINAL_QUEUE_STATUSES.has(row.status)) selected.set(row.sliceId, row);
    if (rowHasBlockingFlag(row) || row.status === "blocked") selected.set(row.sliceId, row);
    if ((row.upstreamCapabilityRefs || []).some(ref => ref.splitNeeded)) selected.set(row.sliceId, row);
  }
  for (const row of queueRows) {
    const stratum = `${row.ownerSkill}:${row.status}:${row.upstreamCapabilityIds?.length || 0}`;
    if (![...selected.values()].some(existing => `${existing.ownerSkill}:${existing.status}:${existing.upstreamCapabilityIds?.length || 0}` === stratum)) {
      selected.set(row.sliceId, row);
    }
  }
  return [...selected.values()].sort((left, right) => left.sliceId.localeCompare(right.sliceId));
}

function textWords(value) {
  return isNonEmptyString(value) ? (value.toLowerCase().match(/[a-z0-9]+/g) || []) : [];
}

function semanticStem(word) {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("s")) return word.slice(0, -1);
  return word;
}

function semanticTokensFromText(value) {
  return new Set(textWords(Array.isArray(value) ? value.join(" ") : value)
    .map(semanticStem)
    .filter(word => word.length >= 3)
    .filter(word => !SEMANTIC_STOPWORDS.has(word)));
}

function tokenIntersection(left, right) {
  const matches = [];
  for (const token of left) {
    if (right.has(token)) matches.push(token);
  }
  return matches.sort();
}

function capabilitySemanticText(capability) {
  return [
    capability?.name,
    capability?.actor,
    capability?.intendedOutcome,
    capability?.domainObject,
    capability?.experience,
    ...(capability?.actions || []),
    ...(capability?.states || []),
    ...(capability?.rules || []),
    ...(capability?.backingContracts || []),
    ...(capability?.failureAndRecovery || []),
    capability?.splitReason,
    ...(capability?.splitCriteria || [])
  ].filter(Boolean).join(" ");
}

function capabilitySemanticTokens(capability) {
  return semanticTokensFromText(capabilitySemanticText(capability));
}

function sliceSemanticText(row) {
  return [
    row?.name,
    row?.scope,
    ...(row?.includedBehaviors || []),
    row?.childSliceRationale
  ].filter(Boolean).join(" ");
}

function sliceSemanticTokens(row) {
  return semanticTokensFromText(sliceSemanticText(row));
}

function splitCriteriaSemanticTokens(capability) {
  return semanticTokensFromText(capability?.splitCriteria || []);
}

function specJobQueueSemanticAlignmentFindings(row, capabilities) {
  const findings = [];
  if (row?.status === "pending" || row?.status === "blocked" || row?.status === "out-of-scope") return findings;
  const rowTokens = sliceSemanticTokens(row);
  if (rowTokens.size === 0) {
    findings.push({
      category: "semanticAlignment",
      severity: "blocking",
      message: "Queue slice name, scope, included behaviors, or rationale carry no capability-specific semantic anchors."
    });
    return findings;
  }

  for (const capability of capabilities) {
    const capabilityTokens = capabilitySemanticTokens(capability);
    if (capabilityTokens.size === 0) {
      findings.push({
        category: "semanticAlignment",
        severity: "blocking",
        message: `Upstream capability ${capability.capabilityId} has no usable semantic anchors for Job / Spec Queue alignment.`
      });
      continue;
    }

    const identityMatches = tokenIntersection(rowTokens, capabilityTokens);
    const minimumIdentityMatches = capability.status === "needs-split" ? 2 : 1;
    if (identityMatches.length < minimumIdentityMatches) {
      findings.push({
        category: "semanticAlignment",
        severity: "blocking",
        message: `Queue slice does not align with upstream capability identity: ${capability.capabilityId}.`
      });
    }

    if (capability.status === "needs-split") {
      const criteriaTokens = splitCriteriaSemanticTokens(capability);
      const criteriaMatches = tokenIntersection(rowTokens, criteriaTokens);
      if (criteriaTokens.size > 0 && criteriaMatches.length === 0) {
        findings.push({
          category: "semanticAlignment",
          severity: "blocking",
          message: `Child slice does not align with the splitCriteria for needs-split capability ${capability.capabilityId}.`
        });
      }
    }
  }

  return findings;
}

function validateSpecJobQueueStartSemanticAudit(capabilityRows) {
  const auditIssues = [];
  for (const capability of terminalCapabilityRows(capabilityRows)) {
    const tokens = capabilitySemanticTokens(capability);
    if (tokens.size < 2) {
      auditIssues.push({
        capabilityId: capability.capabilityId,
        name: capability.name,
        reason: "Capability identity is too semantically thin for durable Job / Spec Queue classification."
      });
      continue;
    }
  }
  return auditIssues.length === 0
    ? [pass("spec-job-queue-upstream-semantic-audit", "Terminal Capability Map rows have semantic anchors for Define Spec Jobs")]
    : [fail("spec-job-queue-upstream-semantic-audit", "Define Spec Jobs requires capability identity and splitCriteria anchors before queue initialization", { auditIssues })];
}

function auditSpecJobQueueSemanticAlignment({ capabilityRows, queueRows }) {
  const capabilityById = new Map(capabilityRows.map(row => [row.capabilityId, row]));
  const issues = [];
  for (const row of queueRows) {
    const capabilities = (row.upstreamCapabilityIds || []).map(id => capabilityById.get(id)).filter(Boolean);
    const findings = specJobQueueSemanticAlignmentFindings(row, capabilities);
    for (const finding of findings) {
      issues.push({
        sliceId: row.sliceId,
        name: row.name,
        upstreamCapabilityIds: row.upstreamCapabilityIds || [],
        message: finding.message
      });
    }
  }
  return issues;
}

function textIsVague(value) {
  const words = textWords(value);
  if (words.length < 5) return true;
  const genericCount = words.filter(word => GENERIC_SCOPE_WORDS.has(word)).length;
  return genericCount > 0 && words.length < 10;
}

function textIsBroad(value) {
  const words = textWords(value);
  const joined = ` ${words.join(" ")} `;
  return words.some(word => GENERIC_SCOPE_WORDS.has(word)) ||
    joined.includes(" all ") ||
    joined.includes(" and more ") ||
    joined.includes(" end to end ") ||
    joined.includes(" full system ");
}

function exitCriterionIsObjective(value) {
  const words = new Set(textWords(value));
  if (words.size < 6) return false;
  return [...words].some(word => OBJECTIVE_EXIT_WORDS.has(word));
}

function listIsSpecific(value) {
  return Array.isArray(value) && value.length > 0 && value.every(item => isNonEmptyString(item) && item.trim().length >= 8);
}

function evidenceRefsAreSpecific(row) {
  if (!Array.isArray(row.evidenceRefs) || row.evidenceRefs.length === 0) return false;
  return row.evidenceRefs.every(ref => {
    const detail = `${ref?.detail || ""}`.trim();
    if (detail.length < 20) return false;
    const lower = detail.toLowerCase();
    return lower !== "agent-read-the-file" && lower !== "read the file" && !lower.includes("agent read the file");
  });
}

function scoreSpecJobQueueRow(row, capabilityById, siblingRowsByCapabilityId = new Map()) {
  const findings = [];
  const categoryScores = {
    upstreamTraceability: 20,
    sliceSpecificity: 20,
    exitCriteria: 20,
    splitDiscipline: 20,
    evidenceSupport: 20
  };

  const capabilities = (row.upstreamCapabilityIds || []).map(id => capabilityById.get(id)).filter(Boolean);
  if (capabilities.length === 0) {
    findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Queue slice has no resolvable upstream capability rows." });
    categoryScores.upstreamTraceability = 0;
  }
  if (!Array.isArray(row.upstreamCapabilityRefs) || row.upstreamCapabilityRefs.length === 0) {
    findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Queue slice lacks upstreamCapabilityRefs." });
    categoryScores.upstreamTraceability = 0;
  }
  const stale = (row.upstreamCapabilityRefs || []).some(ref => {
    const capability = capabilityById.get(ref.capabilityId);
    return capability && ref.capabilityFingerprint !== capabilityFingerprint(capability);
  });
  if (stale) {
    findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Queue slice has stale upstream capability fingerprints." });
    categoryScores.upstreamTraceability = 0;
  }
  const semanticAlignmentFindings = specJobQueueSemanticAlignmentFindings(row, capabilities);
  if (semanticAlignmentFindings.length > 0) {
    findings.push(...semanticAlignmentFindings);
    categoryScores.splitDiscipline = 0;
  }
  const nonQueueableCapabilities = capabilities.filter(capability => !isQueueEligibleCapability(capability));
  if (nonQueueableCapabilities.length > 0) {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "Queue slice references parent, needs-split, blocked, or otherwise non-queueEligible capability rows." });
    categoryScores.splitDiscipline = 0;
  }

  if (textIsVague(row.name) || textIsVague(row.scope)) {
    findings.push({ category: "sliceSpecificity", severity: "warning", message: "Queue slice name or scope is too vague to be a durable work item." });
    categoryScores.sliceSpecificity = Math.min(categoryScores.sliceSpecificity, 16);
  }
  if (!listIsSpecific(row.includedBehaviors)) {
    findings.push({ category: "sliceSpecificity", severity: "warning", message: "Queue slice needs concrete includedBehaviors." });
    categoryScores.sliceSpecificity = Math.min(categoryScores.sliceSpecificity, 18);
  }
  if (textIsBroad(`${row.name} ${row.scope}`)) {
    findings.push({ category: "sliceSpecificity", severity: "blocking", message: "Queue slice uses broad parent-scope language instead of a bounded slice." });
    categoryScores.sliceSpecificity = 0;
  }

  if (!exitCriterionIsObjective(row.exitCriterion)) {
    findings.push({ category: "exitCriteria", severity: "blocking", message: "Queue slice exitCriterion is not objective enough to verify completion." });
    categoryScores.exitCriteria = 0;
  }
  if (ACTIVE_QUEUE_STATUSES.has(row.status) && !isNonEmptyString(row.nextAction)) {
    findings.push({ category: "exitCriteria", severity: "blocking", message: "Active queue slice lacks a current nextAction." });
    categoryScores.exitCriteria = 0;
  }
  if ((row.status === "ready" || row.status === "acceptable") && !listIsSpecific(row.verificationTargets)) {
    findings.push({ category: "exitCriteria", severity: "blocking", message: "Ready or acceptable queue slice lacks concrete verificationTargets." });
    categoryScores.exitCriteria = 0;
  }

  if ((row.upstreamCapabilityIds || []).length > 3) {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "Queue slice references too many capabilities for one durable work item." });
    categoryScores.splitDiscipline = 0;
  }
  if ((row.status === "acceptable" || row.status === "ready") && rowHasBlockingFlag(row)) {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "Ready or acceptable queue slice cannot carry blocking review flags." });
    categoryScores.splitDiscipline = 0;
  }

  if (!evidenceRefsAreSpecific(row)) {
    findings.push({ category: "evidenceSupport", severity: "blocking", message: "Queue slice evidenceRefs are missing, too short, or generic." });
    categoryScores.evidenceSupport = 0;
  }
  const evidenceText = `${(row.evidenceRefs || []).map(ref => `${ref.capabilityId || ""} ${ref.detail || ""}`).join(" ")} ${(row.verificationTargets || []).join(" ")}`;
  const unsupported = (row.upstreamCapabilityIds || []).filter(id => !evidenceText.includes(id));
  if (unsupported.length > 0) {
    findings.push({ category: "evidenceSupport", severity: "warning", message: "Some upstream capability IDs are not named in evidence or verification text." });
    categoryScores.evidenceSupport = Math.min(categoryScores.evidenceSupport, 18);
  }

  const score = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  return {
    subjectRowId: row.sliceId,
    name: row.name,
    status: row.status,
    upstreamCapabilityIds: row.upstreamCapabilityIds || [],
    categoryScores,
    score,
    findings,
    acceptabilityGate: {
      acceptable: findings.every(finding => finding.severity !== "blocking") && score >= 90,
      threshold: "No blocking findings for row-level Define Spec Jobs receipt"
    }
  };
}

function aggregateSpecJobQueueEval(checkResults, rowReceipts) {
  const checkSummary = summarizeResults(checkResults);
  if (rowReceipts.length === 0) {
    const categoryScores = {
      upstreamCoverageAndFreshness: checkSummary.fail === 0 ? 20 : 0,
      sliceSpecificity: 20,
      exitCriteria: 20,
      splitDiscipline: 20,
      evidenceSupport: 20
    };
    const totalScore = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
    return {
      categoryScores,
      totalScore,
      normalizedMinimum: Math.min(...Object.values(categoryScores).map(score => score / 2)),
      acceptable: checkSummary.fail === 0
    };
  }
  const categoryScores = {
    upstreamCoverageAndFreshness: checkSummary.fail === 0 ? 20 : 0,
    sliceSpecificity: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.sliceSpecificity), 20),
    exitCriteria: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.exitCriteria), 20),
    splitDiscipline: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.splitDiscipline), 20),
    evidenceSupport: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.evidenceSupport), 20)
  };
  const totalScore = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  const normalizedMinimum = Math.min(...Object.values(categoryScores).map(score => score / 2));
  return {
    categoryScores,
    totalScore,
    normalizedMinimum,
    acceptable: checkSummary.fail === 0 &&
      rowReceipts.every(receipt => receipt.acceptabilityGate.acceptable) &&
      totalScore >= 96 &&
      normalizedMinimum >= 9
  };
}

function siblingRowsByCapabilityId(queueRows) {
  const map = new Map();
  for (const row of queueRows) {
    for (const capabilityId of row.upstreamCapabilityIds || []) {
      if (!map.has(capabilityId)) map.set(capabilityId, []);
      map.get(capabilityId).push(row);
    }
  }
  return map;
}

function mergeSpecJobQueueRowsForRefresh({ capabilityRows, existingQueueRows }) {
  const terminal = terminalCapabilityRows(capabilityRows);
  const terminalById = new Map(terminal.map(row => [row.capabilityId, row]));
  const covered = new Set();
  const changed = [];
  const removed = [];
  const output = [];

  for (const row of existingQueueRows) {
    const ids = row.upstreamCapabilityIds || [];
    const missing = ids.filter(id => !terminalById.has(id));
    if (missing.length > 0) {
      removed.push(row.sliceId);
      continue;
    }
    const stale = (row.upstreamCapabilityRefs || []).some(ref => {
      const capability = terminalById.get(ref.capabilityId);
      return !capability || ref.capabilityFingerprint !== capabilityFingerprint(capability);
    });
    if (stale) {
      changed.push(...ids);
      for (const id of ids) output.push(createPendingSliceRow(terminalById.get(id)));
      continue;
    }
    ids.forEach(id => covered.add(id));
    output.push(row);
  }

  for (const capability of terminal) {
    if (covered.has(capability.capabilityId) || changed.includes(capability.capabilityId)) continue;
    const alreadyPending = output.some(row => (row.upstreamCapabilityIds || []).includes(capability.capabilityId));
    if (!alreadyPending) {
      changed.push(capability.capabilityId);
      output.push(createPendingSliceRow(capability));
    }
  }

  output.sort(compareQueueRows);
  return { rows: output, changed: [...new Set(changed)], removed };
}

function buildSpecJobQueuePayload({ runId, repoRoot, queueRows }) {
  return {
    schema: "foundation.backfill.spec-job-queue.v1",
    runId,
    targetRepo: path.basename(repoRoot),
    queue: queueRows.map(row => ({
      sliceId: row.sliceId,
      name: row.name,
      upstreamCapabilityIds: row.upstreamCapabilityIds,
      capabilityAltitude: row.capabilityAltitude || null,
      parentCapabilityId: row.parentCapabilityId || null,
      parentCapabilityName: row.parentCapabilityName || null,
      capabilityRefs: row.capabilityRefs || [],
      status: row.status,
      confidence: row.confidence,
      ownerSkill: row.ownerSkill,
      scope: row.scope,
      includedBehaviors: row.includedBehaviors,
      excludedBehaviors: row.excludedBehaviors,
      exitCriterion: row.exitCriterion,
      nextAction: row.nextAction,
      jobSpec: preferredField(row, "jobSpec", "descriptiveSpec"),
      technicalSpec: row.technicalSpec,
      jobSections: preferredField(row, "jobSections", "descriptiveSections") || [],
      technicalSections: row.technicalSections,
      verificationTargets: row.verificationTargets,
      childSliceRationale: row.childSliceRationale,
      blockingQuestions: row.blockingQuestions,
      blockingGaps: row.blockingGaps,
      humanDecisions: row.humanDecisions,
      reviewFlags: row.reviewFlags
    }))
  };
}

function buildSpecJobQueueReportState({ repoRoot, runId, outDir, capabilityRows, queueRows, runLogPath = null }) {
  const checkPath = specJobQueueCheckPathFor(repoRoot, runId, outDir);
  const check = fs.existsSync(checkPath) ? readJson(checkPath) : null;
  const evalReceiptPath = specJobQueueEvalReceiptPathFor(repoRoot, runId, outDir);
  const evalSummary = readSpecJobQueueEvalSummary(repoRoot, runId, outDir);
  const queueFingerprint = specJobQueueArtifactFingerprint(repoRoot, runId, outDir);
  const evalQueueFingerprint = evalSummary?.queueFingerprint || null;
  const evalQueueRowCount = Number.isInteger(evalSummary?.queueRowCount) ? evalSummary.queueRowCount : null;
  const checkerPass = check?.summary?.fail === 0;
  const evalPass = Boolean(evalSummary?.acceptabilityGate?.acceptable);
  const evalRevisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  const evalFindings = Array.isArray(evalSummary?.findings) ? evalSummary.findings : [];
  const pendingCount = queueRows.filter(row => row.status === "pending").length;
  const readyCount = queueRows.filter(row => row.status === "ready").length;
  const inProgressCount = queueRows.filter(row => row.status === "in-progress").length;
  const acceptableCount = queueRows.filter(row => row.status === "acceptable").length;
  const blockedCount = queueRows.filter(row => row.status === "blocked").length;
  const outOfScopeCount = queueRows.filter(row => row.status === "out-of-scope").length;
  const modelCounts = capabilityModelCounts(capabilityRows);
  const unqueueableReferenceCount = queueRows
    .flatMap(row => row.upstreamCapabilityIds || [])
    .filter(capabilityId => {
      const capability = capabilityRows.find(row => row.capabilityId === capabilityId);
      return capability && !isQueueEligibleCapability(capability);
    }).length;
  const latestRunLogSequence = (() => {
    if (!runLogPath || !fs.existsSync(runLogPath)) return null;
    const parsed = readJsonl(runLogPath);
    const sequences = parsed.rows.map(row => row.sequence).filter(Number.isInteger);
    return sequences.length > 0 ? Math.max(...sequences) : null;
  })();
  const evalQueueFresh = Boolean(evalQueueFingerprint) &&
    evalQueueFingerprint === queueFingerprint &&
    evalQueueRowCount === queueRows.length;
  const evalHandoffReady = evalPass && evalRevisionTargets.length === 0 && evalQueueFresh;
  const nextTarget = nextSpecJobQueueTarget({ capabilityRows, queueRows });

  return {
    schema: "foundation.backfill.spec-job-queue-report-state.v1",
    runId,
    generatedAt: new Date().toISOString(),
    queuePath: path.relative(repoRoot, specJobQueuePathFor(repoRoot, runId, outDir)),
    queueFingerprint,
    checkerPath: path.relative(repoRoot, checkPath),
    checkerResult: checkerPass ? "pass" : "fail-or-missing",
    evalReceiptPath: path.relative(repoRoot, evalReceiptPath),
    summaryPath: path.relative(repoRoot, specJobQueueSummaryPathFor(repoRoot, runId, outDir)),
    evalResult: evalHandoffReady ? "pass" : (evalPass ? "pass-with-revisions" : "fail-or-missing"),
    evalScore: evalSummary?.totalScore ?? null,
    evalQueueFingerprint,
    evalQueueFresh,
    evalRevisionTargetCount: evalRevisionTargets.length,
    evalWarningCount: evalFindings.filter(finding => finding?.severity === "warning").length,
    evalBlockingFindingCount: evalFindings.filter(finding => finding?.severity === "blocking").length,
    capabilityCount: terminalCapabilityRows(capabilityRows).length,
    parentCapabilityCount: modelCounts.parentCapabilityCount,
    childCapabilityCount: modelCounts.childCapabilityCount,
    soleCapabilityCount: modelCounts.soleCapabilityCount,
    needsSplitCount: modelCounts.needsSplitCount,
    blockedCapabilityCount: modelCounts.blockedCapabilityCount,
    queueEligibleCapabilityCount: modelCounts.queueEligibleCapabilityCount,
    unqueueableReferenceCount,
    queueSliceCount: queueRows.length,
    pendingCount,
    readyCount,
    inProgressCount,
    acceptableCount,
    blockedCount,
    outOfScopeCount,
    currentSliceId: nextTarget?.sliceId || null,
    latestRunLogSequence,
    nextLayer: pendingCount === 0 && inProgressCount === 0 && unqueueableReferenceCount === 0 && checkerPass && evalHandoffReady
      ? "Context Pack"
      : "Define Spec Jobs revision"
  };
}

export {
  ACTIVE_QUEUE_STATUSES,
  TERMINAL_QUEUE_STATUSES,
  VALID_OWNER_SKILLS,
  VALID_SPEC_JOB_QUEUE_STATUSES,
  appendRunLogEvent,
  aggregateSpecJobQueueEval,
  buildSpecJobQueuePayload,
  buildSpecJobQueueReportState,
  capabilityFingerprint,
  createAgentMarkedSpecJobQueueRow,
  createInitialSpecJobQueueRows,
  createPendingSliceRow,
  defaultBackfillDir,
  ensureDir,
  markSpecJobQueueRowsForCapabilities,
  mergeSpecJobQueueRowsForRefresh,
  nextSpecJobQueueTarget,
  parseCapabilityIds,
  parseCliArgs,
  readCapabilityMapRows,
  readJson,
  readJsonl,
  readSpecJobQueueRows,
  renderResultsText,
  scoreSpecJobQueueRow,
  selectSpecJobQueueEvalSample,
  siblingRowsByCapabilityId,
  specJobQueueArtifactFingerprint,
  specJobQueueCheckPathFor,
  specJobQueueEvalReceiptPathFor,
  specJobQueuePathFor,
  specJobQueueRefreshPathFor,
  specJobQueueSummaryPathFor,
  summarizeResults,
  validateCapabilityMapHandoff,
  validateSpecJobQueue,
  validateSpecJobQueueRows,
  writeJson,
  writeJsonl
};
