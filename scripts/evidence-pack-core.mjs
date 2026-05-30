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
  registryPathFor,
  renderResultsText,
  summarizeResults,
  warn,
  writeJson,
  writeJsonl
} from "./file-registry-core.mjs";
import {
  parseJsonScript,
  readCapabilityMatrixRows,
  readSurfaceRegistryRows
} from "./capability-matrix-core.mjs";
import {
  splitQueueArtifactFingerprint,
  splitQueueCheckPathFor,
  splitQueueEvalReceiptPathFor,
  splitQueuePathFor,
  splitQueueSummaryPathFor,
  validateSplitQueue
} from "./split-queue-core.mjs";

const READY_FOR_PROCESS_MAP_STATUS = "ready-for-process-map";
const LEGACY_READY_FOR_FLOW_STATUS = "ready-for-flow";
const VALID_EVIDENCE_PACK_STATUSES = new Set([
  "pending",
  "packed",
  "needs-evidence",
  READY_FOR_PROCESS_MAP_STATUS,
  LEGACY_READY_FOR_FLOW_STATUS
]);
const VALID_CONFIDENCE = new Set(["low", "medium", "high"]);
const VALID_REVIEW_FLAG_SEVERITY = new Set(["info", "warning", "blocking"]);
const ACTIVE_QUEUE_STATUSES_FOR_PACK = new Set(["ready", "acceptable"]);
const VALID_EVIDENCE_CATEGORIES = new Set([
  "queue-slice",
  "capability",
  "surface",
  "file",
  "test",
  "doc",
  "schema",
  "run-state",
  "decision",
  "gap"
]);
const SOURCE_EVIDENCE_CATEGORIES = new Set(["surface", "file", "test", "doc", "schema", "run-state"]);
const VERIFICATION_EVIDENCE_CATEGORIES = new Set(["test", "run-state"]);
const MAX_EVIDENCE_REFS = 40;
const DEFAULT_TOKEN_BUDGET = 12000;
const GENERIC_EVIDENCE_PATTERNS = [
  /agent[-\s]?read[-\s]?the[-\s]?file/i,
  /\bread\s+the\s+file\b/i,
  /\bread\s+file\b/i,
  /\bchecked\s+the\s+file\b/i,
  /\bfile\s+was\s+checked\b/i,
  /\b(full|entire|whole)\b.{0,48}\b(file|read)\b/i,
  /\bread\b.{0,32}\b(full|entire|whole)\b/i
];
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
  "capability",
  "context",
  "current",
  "evidence",
  "file",
  "flow",
  "pack",
  "queue",
  "receipt",
  "row",
  "slice",
  "spec",
  "surface",
  "system",
  "target",
  "upstream"
]);

function isReadyForProcessMapStatus(status) {
  return status === READY_FOR_PROCESS_MAP_STATUS || status === LEGACY_READY_FOR_FLOW_STATUS;
}

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

function evidencePackPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `evidence-pack-${runId}.jsonl`);
}

function evidencePackCheckPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `evidence-pack-check-${runId}.json`);
}

function evidencePackEvalReceiptPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `evidence-pack-eval-${runId}.jsonl`);
}

function evidencePackSummaryPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `evidence-pack-summary-${runId}.html`);
}

function evidencePackRefreshPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `evidence-pack-refresh-${runId}.json`);
}

function evidencePackArtifactFingerprint(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return fileFingerprint(evidencePackPathFor(repoRoot, runId, outDir));
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

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54);
}

function stablePackId(sliceId, name, ordinal = 1) {
  const semantic = `${sliceId}:${name}:${ordinal}`;
  return `ep-${slug(name || sliceId || "evidence-pack")}-${sha256Text(semantic).slice(0, 12)}`;
}

function sliceFingerprint(row) {
  return `sha256:${sha256Text(JSON.stringify(row))}`;
}

function upstreamSliceRef(row, queueFingerprint = null) {
  return {
    sliceId: row.sliceId,
    name: row.name,
    status: row.status,
    upstreamCapabilityIds: Array.isArray(row.upstreamCapabilityIds) ? row.upstreamCapabilityIds : [],
    queueFingerprint,
    sliceFingerprint: sliceFingerprint(row)
  };
}

function readEvalSummary(receiptPath) {
  if (!fs.existsSync(receiptPath)) return null;
  const parsed = readJsonl(receiptPath);
  return parsed.rows.find(row => row.receiptType === "summary") || null;
}

function readFileRegistryRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const registryPath = registryPathFor(repoRoot, runId, outDir);
  const parsed = readJsonl(registryPath);
  return { registryPath, ...parsed };
}

function readEvidencePackRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const packPath = evidencePackPathFor(repoRoot, runId, outDir);
  const parsed = readJsonl(packPath);
  return { packPath, ...parsed };
}

function activeQueueRows(queueRows) {
  return queueRows.filter(row => ACTIVE_QUEUE_STATUSES_FOR_PACK.has(row.status));
}

function validateSplitQueueHandoff(repoRoot, runId, outDir = defaultBackfillDir(repoRoot), reportPath = null) {
  const validation = validateSplitQueue({ repoRoot, runId, outDir, phase: "handoff", reportPath });
  const results = [...validation.results];

  const checkPath = splitQueueCheckPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(checkPath)) {
    results.push(fail("upstream-split-queue-check-artifact", "Passing Define Spec Jobs check artifact is required before Context Pack"));
  } else {
    const check = readJson(checkPath);
    results.push(check?.summary?.fail === 0
      ? pass("upstream-split-queue-check-artifact", "Define Spec Jobs check artifact passes")
      : fail("upstream-split-queue-check-artifact", "Define Spec Jobs check artifact must pass", { summary: check?.summary || null }));
  }

  const evalSummary = readEvalSummary(splitQueueEvalReceiptPathFor(repoRoot, runId, outDir));
  const currentQueueFingerprint = splitQueueArtifactFingerprint(repoRoot, runId, outDir);
  const evalQueueFresh = Boolean(evalSummary?.queueFingerprint) &&
    evalSummary.queueFingerprint === currentQueueFingerprint &&
    evalSummary.queueRowCount === validation.queueRows.length;
  results.push(evalSummary?.acceptabilityGate?.acceptable && evalQueueFresh
    ? pass("upstream-split-queue-eval", "Define Spec Jobs eval artifact passes and is current")
    : fail("upstream-split-queue-eval", "Passing current Define Spec Jobs eval receipt is required before Context Pack", {
      expectedQueueFingerprint: currentQueueFingerprint,
      actualQueueFingerprint: evalSummary?.queueFingerprint || null,
      expectedRowCount: validation.queueRows.length,
      actualRowCount: Number.isInteger(evalSummary?.queueRowCount) ? evalSummary.queueRowCount : null
    }));
  const revisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  results.push(revisionTargets.length === 0
    ? pass("upstream-split-queue-eval-revisions", "Define Spec Jobs eval has no revision targets")
    : fail("upstream-split-queue-eval-revisions", "Define Spec Jobs eval revision targets must be resolved before Context Pack", { revisionTargets }));

  const summaryPath = splitQueueSummaryPathFor(repoRoot, runId, outDir);
  results.push(fs.existsSync(summaryPath)
    ? pass("upstream-split-queue-eval-summary", "Define Spec Jobs HTML eval summary exists")
    : fail("upstream-split-queue-eval-summary", "Define Spec Jobs HTML eval summary is required before Context Pack", { summaryPath: path.relative(repoRoot, summaryPath) }));

  if (reportPath) {
    if (!fs.existsSync(reportPath)) {
      results.push(fail("upstream-split-queue-report-exists", "Define Spec Jobs report path does not exist", { reportPath }));
    } else {
      const state = parseJsonScript(fs.readFileSync(reportPath, "utf8"), "backfill-split-queue-state");
      results.push(state?.nextLayer === "Context Pack"
        ? pass("upstream-split-queue-report-handoff", "Define Spec Jobs report names Context Pack as next layer")
        : fail("upstream-split-queue-report-handoff", "Define Spec Jobs report must name Context Pack as next layer", { nextLayer: state?.nextLayer || null }));
    }
  }

  return {
    queuePath: validation.queuePath,
    capabilityMatrixPath: validation.capabilityMatrixPath,
    capabilityRows: validation.capabilityRows,
    queueRows: validation.queueRows,
    results
  };
}

function inferEvidenceCategory(ref) {
  const pathValue = String(ref?.path || "").toLowerCase();
  if (isNonEmptyString(ref?.sliceId) || isNonEmptyString(ref?.upstreamSliceId)) return "queue-slice";
  if (isNonEmptyString(ref?.capabilityId)) return "capability";
  if (isNonEmptyString(ref?.surfaceId)) return "surface";
  if (pathValue.includes("test") || pathValue.includes("spec")) return "test";
  if (pathValue.includes("docs/") || pathValue.endsWith(".md") || pathValue.endsWith(".html")) return "doc";
  if (pathValue.includes("schema") || pathValue.endsWith(".sql") || pathValue.endsWith(".graphql")) return "schema";
  if (isNonEmptyString(ref?.fileId) || isNonEmptyString(ref?.path)) return "file";
  return "gap";
}

function normalizeEvidenceRef(ref) {
  const rawCategory = ref?.category || ref?.kind || ref?.type;
  const category = isNonEmptyString(rawCategory) ? rawCategory.trim() : inferEvidenceCategory(ref);
  return {
    category,
    relationship: isNonEmptyString(ref?.relationship) ? ref.relationship.trim() : "",
    sliceId: normalizeNullableString(ref?.sliceId || ref?.upstreamSliceId),
    capabilityId: normalizeNullableString(ref?.capabilityId),
    surfaceId: normalizeNullableString(ref?.surfaceId),
    fileId: normalizeNullableString(ref?.fileId),
    path: normalizeNullableString(ref?.path),
    lineRange: normalizeNullableString(ref?.lineRange || ref?.lines),
    symbol: normalizeNullableString(ref?.symbol),
    snippet: normalizeNullableString(ref?.snippet || ref?.excerpt),
    detail: isNonEmptyString(ref?.detail || ref?.evidence)
      ? String(ref.detail || ref.evidence).trim()
      : "",
    questionAnswered: isNonEmptyString(ref?.questionAnswered || ref?.why)
      ? String(ref.questionAnswered || ref.why).trim()
      : ""
  };
}

function normalizeEvidenceRefs(value) {
  return asObjectArray(value).map(normalizeEvidenceRef);
}

function normalizeExcludedRefs(value) {
  return asObjectArray(value).map(ref => ({
    path: normalizeNullableString(ref.path),
    fileId: normalizeNullableString(ref.fileId),
    surfaceId: normalizeNullableString(ref.surfaceId),
    capabilityId: normalizeNullableString(ref.capabilityId),
    reason: isNonEmptyString(ref.reason) ? ref.reason.trim() : ""
  }));
}

function normalizeReviewFlags(value) {
  return asObjectArray(value).map(flag => ({
    severity: VALID_REVIEW_FLAG_SEVERITY.has(flag.severity) ? flag.severity : "warning",
    reason: isNonEmptyString(flag.reason) ? flag.reason.trim() : "Context Pack needs review.",
    evidence: isNonEmptyString(flag.evidence) ? flag.evidence.trim() : "",
    nextAction: isNonEmptyString(flag.nextAction) ? flag.nextAction.trim() : "Revise this Context Pack row."
  }));
}

function estimateEvidenceTokens(evidenceRefs, sufficiencyRationale = "") {
  const text = [
    sufficiencyRationale,
    ...evidenceRefs.map(ref => [
      ref.category,
      ref.relationship,
      ref.path,
      ref.lineRange,
      ref.symbol,
      ref.snippet,
      ref.detail,
      ref.questionAnswered
    ].filter(Boolean).join(" "))
  ].join(" ");
  return Math.ceil(text.length / 4);
}

function createTraceEvidenceRefs(queueRow) {
  return [
    {
      category: "queue-slice",
      relationship: "split-queue-row",
      sliceId: queueRow.sliceId,
      detail: `Context Pack is derived from Define Spec Jobs slice ${queueRow.sliceId}: ${queueRow.name}.`,
      questionAnswered: "Which queued slice does this Context Pack support?"
    },
    ...(queueRow.upstreamCapabilityIds || []).map(capabilityId => ({
      category: "capability",
      relationship: "upstream-capability",
      capabilityId,
      detail: `Context Pack preserves upstream Capability Map row ${capabilityId} named by the queued slice.`,
      questionAnswered: "Which upstream capability must this pack support?"
    }))
  ];
}

function createPendingEvidencePackRow(queueRow, queueFingerprint = null, ordinal = 1) {
  const now = nowIso();
  const name = `Pending Context Pack for ${queueRow.name}`;
  return {
    schema: "foundation.backfill.evidence-pack-row.v1",
    runId: queueRow.runId,
    packId: stablePackId(queueRow.sliceId, name, ordinal),
    upstreamSliceId: queueRow.sliceId,
    upstreamSliceRef: upstreamSliceRef(queueRow, queueFingerprint),
    upstreamCapabilityIds: Array.isArray(queueRow.upstreamCapabilityIds) ? [...queueRow.upstreamCapabilityIds] : [],
    upstreamSurfaceIds: [],
    upstreamFileIds: [],
    evidenceRefs: createTraceEvidenceRefs(queueRow),
    excludedRefs: [],
    explicitGaps: [],
    sufficiencyRationale: "",
    blockingQuestions: [],
    blockingGaps: [],
    humanDecisions: [],
    reviewFlags: [],
    tokenBudget: DEFAULT_TOKEN_BUDGET,
    estimatedTokens: estimateEvidenceTokens(createTraceEvidenceRefs(queueRow)),
    status: "pending",
    confidence: "low",
    createdAt: now,
    updatedAt: now
  };
}

function createInitialEvidencePackRows(queueRows, queueFingerprint = null) {
  return activeQueueRows(queueRows).map((row, index) => createPendingEvidencePackRow(row, queueFingerprint, index + 1));
}

function createAgentMarkedEvidencePackRow({ queueById, selectedSliceIds, spec, queueFingerprint, ordinal = 1 }) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error("Context Pack spec must be an object");
  }
  const selected = new Set(selectedSliceIds);
  const upstreamSliceId = isNonEmptyString(spec.upstreamSliceId || spec.sliceId)
    ? String(spec.upstreamSliceId || spec.sliceId).trim()
    : (selectedSliceIds.length === 1 ? selectedSliceIds[0] : null);
  if (!upstreamSliceId) throw new Error("Context Pack spec requires upstreamSliceId when filling multiple slices");
  if (!selected.has(upstreamSliceId)) throw new Error(`Context Pack references slice not included in --slice-ids: ${upstreamSliceId}`);
  const queueRow = queueById.get(upstreamSliceId);
  if (!queueRow) throw new Error(`Context Pack references unknown Define Spec Jobs slice: ${upstreamSliceId}`);
  if (!ACTIVE_QUEUE_STATUSES_FOR_PACK.has(queueRow.status)) {
    throw new Error(`Context Pack references non-active Define Spec Jobs slice: ${upstreamSliceId}`);
  }

  const traceRefs = createTraceEvidenceRefs(queueRow);
  const providedRefs = normalizeEvidenceRefs(spec.evidenceRefs || spec.evidence || []);
  const evidenceRefs = [...traceRefs, ...providedRefs];
  const explicitGaps = normalizeStringList(spec.explicitGaps || spec.gaps);
  const blockingQuestions = normalizeStringList(spec.blockingQuestions);
  const blockingGaps = normalizeStringList(spec.blockingGaps);
  const humanDecisions = normalizeStringList(spec.humanDecisions);
  const hasBlocker = blockingQuestions.length > 0 || blockingGaps.length > 0 || humanDecisions.length > 0;
  const statusFromSpec = isNonEmptyString(spec.status) ? spec.status.trim() : null;
  const status = statusFromSpec && VALID_EVIDENCE_PACK_STATUSES.has(statusFromSpec)
    ? (statusFromSpec === LEGACY_READY_FOR_FLOW_STATUS ? READY_FOR_PROCESS_MAP_STATUS : statusFromSpec)
    : (hasBlocker ? "needs-evidence" : READY_FOR_PROCESS_MAP_STATUS);
  const sufficiencyRationale = isNonEmptyString(spec.sufficiencyRationale || spec.rationale)
    ? String(spec.sufficiencyRationale || spec.rationale).trim()
    : "";
  const tokenBudget = Number.isInteger(spec.tokenBudget) && spec.tokenBudget > 0 ? spec.tokenBudget : DEFAULT_TOKEN_BUDGET;
  const estimatedTokens = Number.isInteger(spec.estimatedTokens) && spec.estimatedTokens >= 0
    ? spec.estimatedTokens
    : estimateEvidenceTokens(evidenceRefs, sufficiencyRationale);
  const name = isNonEmptyString(spec.name) ? spec.name.trim() : `Context Pack for ${queueRow.name}`;
  const packId = isNonEmptyString(spec.packId || spec.rowId || spec.id)
    ? String(spec.packId || spec.rowId || spec.id).trim()
    : stablePackId(upstreamSliceId, name, ordinal);
  const now = nowIso();

  return {
    schema: "foundation.backfill.evidence-pack-row.v1",
    runId: queueRow.runId,
    packId,
    upstreamSliceId,
    upstreamSliceRef: upstreamSliceRef(queueRow, queueFingerprint),
    upstreamCapabilityIds: Array.isArray(queueRow.upstreamCapabilityIds) ? [...queueRow.upstreamCapabilityIds] : [],
    upstreamSurfaceIds: normalizeStringList(spec.upstreamSurfaceIds || spec.surfaceIds),
    upstreamFileIds: normalizeStringList(spec.upstreamFileIds || spec.fileIds),
    evidenceRefs,
    excludedRefs: normalizeExcludedRefs(spec.excludedRefs || spec.excludedEvidence || []),
    explicitGaps,
    sufficiencyRationale,
    blockingQuestions,
    blockingGaps,
    humanDecisions,
    reviewFlags: normalizeReviewFlags(spec.reviewFlags),
    tokenBudget,
    estimatedTokens,
    status,
    confidence: VALID_CONFIDENCE.has(spec.confidence) ? spec.confidence : (isReadyForProcessMapStatus(status) ? "medium" : "low"),
    createdAt: now,
    updatedAt: now
  };
}

function parseSliceIds(value) {
  if (!isNonEmptyString(value)) return [];
  const raw = value.trim();
  if (raw.startsWith("[")) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("--slice-ids JSON must be an array");
    return normalizeStringList(parsed);
  }
  return normalizeStringList(raw.split(","));
}

function markEvidencePackRowsForSlices({ queueRows, packRows, sliceIds, packSpecs, queueFingerprint }) {
  const selectedSliceIds = normalizeStringList(sliceIds);
  if (selectedSliceIds.length === 0) throw new Error("Context Pack fill requires --slice-ids");
  if (!Array.isArray(packSpecs) || packSpecs.length === 0) {
    throw new Error("Context Pack fill requires at least one pack spec");
  }

  const queueById = new Map(queueRows.map(row => [row.sliceId, row]));
  for (const sliceId of selectedSliceIds) {
    const queueRow = queueById.get(sliceId);
    if (!queueRow) throw new Error(`Unknown Define Spec Jobs slice: ${sliceId}`);
    if (!ACTIVE_QUEUE_STATUSES_FOR_PACK.has(queueRow.status)) throw new Error(`Slice is not active for Context Pack: ${sliceId}`);
  }

  const nextRows = packSpecs.map((spec, index) => createAgentMarkedEvidencePackRow({
    queueById,
    selectedSliceIds,
    spec,
    queueFingerprint,
    ordinal: index + 1
  }));
  const covered = new Set(nextRows.map(row => row.upstreamSliceId));
  const missing = selectedSliceIds.filter(sliceId => !covered.has(sliceId));
  if (missing.length > 0) {
    throw new Error(`Context Pack specs did not cover selected slice ID(s): ${missing.join(", ")}`);
  }
  const selected = new Set(selectedSliceIds);
  const replacedRows = packRows.filter(row => selected.has(row.upstreamSliceId));
  const output = packRows.filter(row => !selected.has(row.upstreamSliceId));
  output.push(...nextRows);
  output.sort(compareEvidencePackRows);
  return {
    rows: output,
    markedSliceIds: selectedSliceIds,
    packCount: nextRows.length,
    revisionCount: replacedRows.filter(row => row.status !== "pending").length,
    replacedPackIds: replacedRows.map(row => row.packId)
  };
}

function rowHasBlockingFlag(row) {
  return Array.isArray(row?.reviewFlags) && row.reviewFlags.some(flag => flag.severity === "blocking");
}

function hasBlockingDetail(row) {
  return normalizeStringList(row?.blockingQuestions).length > 0 ||
    normalizeStringList(row?.blockingGaps).length > 0 ||
    normalizeStringList(row?.humanDecisions).length > 0;
}

function compareEvidencePackRows(left, right) {
  const statusRank = {
    pending: 0,
    "needs-evidence": 1,
    packed: 2,
    [READY_FOR_PROCESS_MAP_STATUS]: 3,
    [LEGACY_READY_FOR_FLOW_STATUS]: 3
  };
  const leftKey = `${statusRank[left.status] ?? 9}:${left.upstreamSliceId || ""}:${left.packId || ""}`;
  const rightKey = `${statusRank[right.status] ?? 9}:${right.upstreamSliceId || ""}:${right.packId || ""}`;
  return leftKey.localeCompare(rightKey);
}

function nextEvidencePackTarget({ queueRows, packRows }) {
  const queueById = new Map(queueRows.map(row => [row.sliceId, row]));
  const candidates = packRows
    .filter(row => row.status === "pending" || row.status === "packed" || (row.status === "needs-evidence" && !hasBlockingDetail(row)) || rowHasBlockingFlag(row))
    .sort((left, right) => {
      const leftRank = rowHasBlockingFlag(left) ? 0 : left.status === "needs-evidence" ? 1 : left.status === "packed" ? 2 : 3;
      const rightRank = rowHasBlockingFlag(right) ? 0 : right.status === "needs-evidence" ? 1 : right.status === "packed" ? 2 : 3;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return compareEvidencePackRows(left, right);
    });
  const target = candidates[0] || packRows.filter(row => isReadyForProcessMapStatus(row.status)).sort(compareEvidencePackRows)[0] || null;
  if (!target) return null;
  const queueRow = queueById.get(target.upstreamSliceId);
  return {
    packId: target.packId,
    status: target.status,
    upstreamSliceId: target.upstreamSliceId,
    upstreamSliceName: queueRow?.name || target.upstreamSliceRef?.name || null,
    upstreamCapabilityIds: target.upstreamCapabilityIds || [],
    queueScope: queueRow?.scope || "",
    queueExitCriterion: queueRow?.exitCriterion || "",
    evidenceRefCount: Array.isArray(target.evidenceRefs) ? target.evidenceRefs.length : 0,
    explicitGaps: target.explicitGaps || [],
    blockingGaps: target.blockingGaps || [],
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

function evidenceRefSpecificityIssue(ref) {
  const detail = `${ref?.detail || ""}`.trim();
  const questionAnswered = `${ref?.questionAnswered || ""}`.trim();
  const snippet = `${ref?.snippet || ""}`.trim();
  const haystack = `${detail}\n${questionAnswered}\n${snippet}`;
  if (detail.length < 24) return "Evidence ref detail is too short to be specific.";
  if (GENERIC_EVIDENCE_PATTERNS.some(pattern => pattern.test(haystack))) {
    return "Evidence ref uses generic read-the-file or full-file wording instead of exact evidence.";
  }
  if (SOURCE_EVIDENCE_CATEGORIES.has(ref?.category) && (ref.category === "file" || ref.category === "test" || ref.category === "doc" || ref.category === "schema")) {
    if (!isNonEmptyString(ref.path)) return "File-like evidence refs require a path.";
    if (!isNonEmptyString(ref.lineRange) && !isNonEmptyString(ref.snippet) && !isNonEmptyString(ref.symbol)) {
      return "File-like evidence refs require lineRange, snippet, or symbol.";
    }
  }
  return null;
}

function explicitGapCovers(row, matcher) {
  return normalizeStringList(row?.explicitGaps).some(gap => matcher(gap.toLowerCase())) ||
    asObjectArray(row?.evidenceRefs).some(ref => ref.category === "gap" && matcher(`${ref.detail || ""} ${ref.questionAnswered || ""}`.toLowerCase()));
}

function evidencePackCoverageFindings(row) {
  const refs = asObjectArray(row.evidenceRefs);
  const findings = [];
  const hasQueueEvidence = refs.some(ref => ref.category === "queue-slice" || ref.sliceId === row.upstreamSliceId);
  if (!hasQueueEvidence) findings.push({ category: "categoryCoverage", severity: "blocking", message: "Context Pack lacks a queue-slice evidence reference." });

  for (const capabilityId of row.upstreamCapabilityIds || []) {
    if (!refs.some(ref => ref.capabilityId === capabilityId)) {
      findings.push({ category: "categoryCoverage", severity: "blocking", message: `Context Pack lacks evidence for upstream capability ${capabilityId}.` });
    }
  }

  const hasSourceEvidence = refs.some(ref => SOURCE_EVIDENCE_CATEGORIES.has(ref.category));
  if (!hasSourceEvidence && !explicitGapCovers(row, text => text.includes("source") || text.includes("file") || text.includes("surface"))) {
    findings.push({ category: "categoryCoverage", severity: "blocking", message: "Context Pack requires source evidence or an explicit source gap." });
  }

  const hasVerificationEvidence = refs.some(ref => VERIFICATION_EVIDENCE_CATEGORIES.has(ref.category));
  if (!hasVerificationEvidence && !explicitGapCovers(row, text => text.includes("verification") || text.includes("test") || text.includes("check"))) {
    findings.push({ category: "categoryCoverage", severity: "blocking", message: "Context Pack requires verification evidence or an explicit verification gap." });
  }

  return findings;
}

function validateEvidenceRef(ref, prefix, results, maps, row) {
  if (!VALID_EVIDENCE_CATEGORIES.has(ref?.category)) {
    results.push(fail(`${prefix}:category`, "Evidence ref category is outside enum", { category: ref?.category }));
  }
  const issue = evidenceRefSpecificityIssue(ref);
  if (issue) results.push(fail(`${prefix}:specificity`, issue, { category: ref?.category, path: ref?.path || null }));

  if (isNonEmptyString(ref?.sliceId) && !maps.queueById.has(ref.sliceId)) {
    results.push(fail(`${prefix}:slice-resolves`, "Evidence ref sliceId must resolve to Define Spec Jobs", { sliceId: ref.sliceId }));
  }
  if (isNonEmptyString(ref?.sliceId) && row?.upstreamSliceId && ref.sliceId !== row.upstreamSliceId) {
    results.push(fail(`${prefix}:slice-alignment`, "Evidence ref sliceId must match the pack upstreamSliceId", { sliceId: ref.sliceId, upstreamSliceId: row.upstreamSliceId }));
  }
  if (isNonEmptyString(ref?.capabilityId) && !maps.capabilityById.has(ref.capabilityId)) {
    results.push(fail(`${prefix}:capability-resolves`, "Evidence ref capabilityId must resolve to Capability Map", { capabilityId: ref.capabilityId }));
  }
  if (isNonEmptyString(ref?.surfaceId) && !maps.surfaceById.has(ref.surfaceId)) {
    results.push(fail(`${prefix}:surface-resolves`, "Evidence ref surfaceId must resolve to Surface / Function Map", { surfaceId: ref.surfaceId }));
  }
  if (isNonEmptyString(ref?.fileId) && !maps.fileById.has(ref.fileId)) {
    results.push(fail(`${prefix}:file-id-resolves`, "Evidence ref fileId must resolve to Artifact Inventory", { fileId: ref.fileId }));
  }
  if (isNonEmptyString(ref?.path) && !maps.fileByPath.has(ref.path)) {
    results.push(fail(`${prefix}:path-resolves`, "Evidence ref path must resolve to Artifact Inventory", { path: ref.path }));
  }
}

function validateEvidencePackRowShape(row, prefix, results, phase) {
  if (row?.schema !== "foundation.backfill.evidence-pack-row.v1") {
    results.push(fail(`${prefix}:schema`, "Context Pack row schema is invalid", { schema: row?.schema }));
  }
  if (!isNonEmptyString(row?.runId)) results.push(fail(`${prefix}:run-id`, "Context Pack row requires runId"));
  if (!isNonEmptyString(row?.packId)) results.push(fail(`${prefix}:pack-id`, "Context Pack row requires packId"));
  if (!isNonEmptyString(row?.upstreamSliceId)) results.push(fail(`${prefix}:upstream-slice-id`, "Context Pack row requires upstreamSliceId"));
  if (!VALID_EVIDENCE_PACK_STATUSES.has(row?.status)) {
    results.push(fail(`${prefix}:status`, "Context Pack status is outside enum", { status: row?.status }));
  }
  if (!VALID_CONFIDENCE.has(row?.confidence)) {
    results.push(fail(`${prefix}:confidence`, "Context Pack confidence is outside enum", { confidence: row?.confidence }));
  }
  for (const field of [
    "upstreamCapabilityIds",
    "upstreamSurfaceIds",
    "upstreamFileIds",
    "evidenceRefs",
    "excludedRefs",
    "explicitGaps",
    "blockingQuestions",
    "blockingGaps",
    "humanDecisions",
    "reviewFlags"
  ]) {
    if (!Array.isArray(row?.[field])) results.push(fail(`${prefix}:${field}`, `${field} must be an array`));
  }
  if (!row?.upstreamSliceRef || typeof row.upstreamSliceRef !== "object" || Array.isArray(row.upstreamSliceRef)) {
    results.push(fail(`${prefix}:upstream-slice-ref`, "upstreamSliceRef must be an object"));
  }
  validateReviewFlags(row, prefix, results);

  if (isReadyForProcessMapStatus(row?.status)) {
    if (!Array.isArray(row?.evidenceRefs) || row.evidenceRefs.length === 0) {
      results.push(fail(`${prefix}:evidence-refs:terminal`, "ready-for-process-map rows require evidenceRefs"));
    }
    if (!isNonEmptyString(row?.sufficiencyRationale) || row.sufficiencyRationale.trim().length < 40) {
      results.push(fail(`${prefix}:sufficiency-rationale`, "ready-for-process-map rows require a specific sufficiencyRationale"));
    }
  }
  if (row?.status === "needs-evidence" && phase === "handoff" && !hasBlockingDetail(row)) {
    results.push(fail(`${prefix}:needs-evidence-detail`, "needs-evidence handoff rows require blockingQuestions, blockingGaps, or humanDecisions"));
  }
  if (phase === "handoff" && (row?.status === "pending" || row?.status === "packed")) {
    results.push(fail(`${prefix}:non-terminal-handoff`, "Handoff requires no pending or packed Context Pack rows", { status: row?.status }));
  }
  if ((isReadyForProcessMapStatus(row?.status) || row?.status === "packed") && rowHasBlockingFlag(row)) {
    results.push(fail(`${prefix}:blocking-flags`, "Ready or packed Context Pack rows cannot carry blocking review flags"));
  }
  if (!Number.isInteger(row?.tokenBudget) || row.tokenBudget <= 0) {
    results.push(fail(`${prefix}:token-budget`, "Context Pack rows require positive integer tokenBudget"));
  }
  if (!Number.isInteger(row?.estimatedTokens) || row.estimatedTokens < 0) {
    results.push(fail(`${prefix}:estimated-tokens`, "Context Pack rows require non-negative integer estimatedTokens"));
  }
}

function validateEvidencePackRows({ queueRows, capabilityRows, surfaceRows, fileRows, packRows, phase = "handoff" }) {
  const results = [];
  const queueById = new Map(queueRows.map(row => [row.sliceId, row]));
  const capabilityById = new Map(capabilityRows.map(row => [row.capabilityId, row]));
  const surfaceById = new Map(surfaceRows.map(row => [row.surfaceId, row]));
  const fileById = new Map(fileRows.map(row => [row.fileId, row]));
  const fileByPath = new Map(fileRows.map(row => [row.path, row]));
  const maps = { queueById, capabilityById, surfaceById, fileById, fileByPath };
  const rowsBySlice = new Map();
  const stale = [];
  const pending = [];
  const packed = [];
  const unblockedNeedsEvidence = [];

  results.push(validateUnique(packRows, "packId", "evidence-pack"));

  for (const [index, row] of packRows.entries()) {
    const prefix = `evidence-pack:${row?.packId || index + 1}`;
    validateEvidencePackRowShape(row, prefix, results, phase);
    if (isNonEmptyString(row?.upstreamSliceId)) {
      if (!rowsBySlice.has(row.upstreamSliceId)) rowsBySlice.set(row.upstreamSliceId, []);
      rowsBySlice.get(row.upstreamSliceId).push(row);
    }
    if (row.status === "pending") pending.push(row.packId);
    if (row.status === "packed") packed.push(row.packId);
    if (row.status === "needs-evidence" && !hasBlockingDetail(row)) unblockedNeedsEvidence.push(row.packId);

    const queueRow = queueById.get(row.upstreamSliceId);
    if (!queueRow) {
      results.push(fail(`${prefix}:upstream-slice-resolves`, "Context Pack row references missing Define Spec Jobs slice", { upstreamSliceId: row.upstreamSliceId }));
    } else {
      if (!ACTIVE_QUEUE_STATUSES_FOR_PACK.has(queueRow.status)) {
        results.push(fail(`${prefix}:upstream-slice-active`, "Context Pack row references a Define Spec Jobs slice that is not active for Context Pack", { upstreamSliceId: row.upstreamSliceId, status: queueRow.status }));
      }
      if (row.upstreamSliceRef?.sliceFingerprint !== sliceFingerprint(queueRow)) {
        stale.push({ packId: row.packId, upstreamSliceId: row.upstreamSliceId, name: queueRow.name });
      }
      const missingCapabilities = (queueRow.upstreamCapabilityIds || []).filter(capabilityId => !(row.upstreamCapabilityIds || []).includes(capabilityId));
      if (missingCapabilities.length > 0) {
        results.push(fail(`${prefix}:upstream-capability-coverage`, "Context Pack row must carry every upstream capability ID from its queue slice", { missingCapabilities }));
      }
    }

    for (const capabilityId of row.upstreamCapabilityIds || []) {
      if (!capabilityById.has(capabilityId)) {
        results.push(fail(`${prefix}:capability-resolves`, "upstreamCapabilityIds must resolve to Capability Map", { capabilityId }));
      }
    }
    for (const surfaceId of row.upstreamSurfaceIds || []) {
      if (!surfaceById.has(surfaceId)) {
        results.push(fail(`${prefix}:surface-resolves`, "upstreamSurfaceIds must resolve to Surface / Function Map", { surfaceId }));
      }
    }
    for (const fileId of row.upstreamFileIds || []) {
      if (!fileById.has(fileId)) {
        results.push(fail(`${prefix}:file-resolves`, "upstreamFileIds must resolve to Artifact Inventory", { fileId }));
      }
    }
    for (const [refIndex, ref] of asObjectArray(row.evidenceRefs).entries()) {
      validateEvidenceRef(ref, `${prefix}:evidence-refs:${refIndex + 1}`, results, maps, row);
    }
    for (const [refIndex, ref] of asObjectArray(row.excludedRefs).entries()) {
      const label = `${prefix}:excluded-refs:${refIndex + 1}`;
      if (!isNonEmptyString(ref.reason)) results.push(fail(`${label}:reason`, "Excluded evidence refs require reason"));
      if (isNonEmptyString(ref.fileId) && !fileById.has(ref.fileId)) results.push(fail(`${label}:file-id-resolves`, "Excluded fileId must resolve to Artifact Inventory", { fileId: ref.fileId }));
      if (isNonEmptyString(ref.path) && !fileByPath.has(ref.path)) results.push(fail(`${label}:path-resolves`, "Excluded path must resolve to Artifact Inventory", { path: ref.path }));
      if (isNonEmptyString(ref.surfaceId) && !surfaceById.has(ref.surfaceId)) results.push(fail(`${label}:surface-resolves`, "Excluded surfaceId must resolve to Surface / Function Map", { surfaceId: ref.surfaceId }));
      if (isNonEmptyString(ref.capabilityId) && !capabilityById.has(ref.capabilityId)) results.push(fail(`${label}:capability-resolves`, "Excluded capabilityId must resolve to Capability Map", { capabilityId: ref.capabilityId }));
    }
    if (isReadyForProcessMapStatus(row.status)) {
      for (const finding of evidencePackCoverageFindings(row)) {
        results.push(fail(`${prefix}:${finding.category}`, finding.message));
      }
    }
    if ((row.evidenceRefs || []).length > MAX_EVIDENCE_REFS) {
      results.push(fail(`${prefix}:pack-size`, "Context Pack row has too many evidenceRefs", { max: MAX_EVIDENCE_REFS, actual: (row.evidenceRefs || []).length }));
    }
    if (Number.isInteger(row.estimatedTokens) && Number.isInteger(row.tokenBudget) && row.estimatedTokens > row.tokenBudget) {
      results.push(fail(`${prefix}:token-budget-exceeded`, "Context Pack row estimatedTokens exceeds tokenBudget", { estimatedTokens: row.estimatedTokens, tokenBudget: row.tokenBudget }));
    }
  }

  results.push(stale.length === 0
    ? pass("evidence-pack-upstream-fresh", "Context Pack upstream slice fingerprints match Define Spec Jobs rows")
    : fail("evidence-pack-upstream-fresh", "Context Pack rows must be refreshed when upstream Define Spec Jobs rows change", { stale }));

  const duplicateSlicePacks = [...rowsBySlice.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([upstreamSliceId, rows]) => ({ upstreamSliceId, packIds: rows.map(row => row.packId) }));
  results.push(duplicateSlicePacks.length === 0
    ? pass("evidence-pack-one-row-per-slice", "Each queued slice has at most one Context Pack row")
    : fail("evidence-pack-one-row-per-slice", "Each queued slice must have at most one Context Pack row", { duplicateSlicePacks }));

  const uncovered = [];
  for (const queueRow of activeQueueRows(queueRows)) {
    const attached = rowsBySlice.get(queueRow.sliceId) || [];
    if (attached.length === 0) uncovered.push({ sliceId: queueRow.sliceId, name: queueRow.name, status: queueRow.status });
  }
  if (uncovered.length === 0) {
    results.push(pass("evidence-pack-covers-active-slices", "Every active Define Spec Jobs slice has Context Pack coverage"));
  } else if (phase === "handoff") {
    results.push(fail("evidence-pack-covers-active-slices", "Context Pack must cover every active Define Spec Jobs slice before Process / Action Map", { uncovered }));
  } else {
    results.push(warn("evidence-pack-covers-active-slices", `${uncovered.length} active queue slice(s) still need Context Pack coverage`, { uncovered }));
  }

  if (phase === "handoff") {
    results.push(pending.length === 0
      ? pass("handoff-no-pending-packs", "No pending Context Pack rows remain")
      : fail("handoff-no-pending-packs", "Handoff requires zero pending Context Pack rows", { pending }));
    results.push(packed.length === 0
      ? pass("handoff-no-packed-packs", "No packed-but-unready Context Pack rows remain")
      : fail("handoff-no-packed-packs", "Handoff requires no packed Context Pack rows", { packed }));
    results.push(unblockedNeedsEvidence.length === 0
      ? pass("handoff-needs-evidence-blocked", "Every needs-evidence row has explicit blocker detail")
      : fail("handoff-needs-evidence-blocked", "needs-evidence rows require explicit blocker detail before handoff", { unblockedNeedsEvidence }));
  } else {
    results.push(warn("batch-pending-packs-allowed", `${pending.length} pending Context Pack row(s) remain in batch phase`, { pendingCount: pending.length }));
  }

  return results;
}

function readEvidencePackEvalSummary(repoRoot, runId, outDir) {
  return readEvalSummary(evidencePackEvalReceiptPathFor(repoRoot, runId, outDir));
}

function validateEvidencePackEvalFreshness({ repoRoot, runId, outDir, packRows, phase = "handoff" }) {
  const evalSummary = readEvidencePackEvalSummary(repoRoot, runId, outDir);
  if (!evalSummary) return [];
  const currentFingerprint = evidencePackArtifactFingerprint(repoRoot, runId, outDir);
  const expectedRowCount = packRows.length;
  const actualRowCount = Number.isInteger(evalSummary.packRowCount) ? evalSummary.packRowCount : null;
  const fresh = Boolean(evalSummary.packFingerprint) &&
    evalSummary.packFingerprint === currentFingerprint &&
    actualRowCount === expectedRowCount;
  const results = fresh
    ? [pass("evidence-pack-eval-current", "Context Pack eval receipt matches the current pack artifact")]
    : [fail("evidence-pack-eval-current", "Context Pack eval must be regenerated after pack artifact changes", {
      expectedPackFingerprint: currentFingerprint,
      actualPackFingerprint: evalSummary.packFingerprint || null,
      expectedRowCount,
      actualRowCount
    })];
  if (phase === "handoff") {
    const revisionTargets = Array.isArray(evalSummary.revisionTargets) ? evalSummary.revisionTargets : [];
    results.push(revisionTargets.length === 0
      ? pass("evidence-pack-eval-revisions", "Context Pack eval has no revision targets")
      : fail("evidence-pack-eval-revisions", "Context Pack eval revision targets must be resolved before Process / Action Map", { revisionTargets }));
  }
  return results;
}

function validateEvidencePackReportState({ repoRoot, runId, outDir, reportPath, queueRows, capabilityRows, surfaceRows, fileRows, packRows }) {
  if (!reportPath) return [];
  if (!fs.existsSync(reportPath)) return [fail("evidence-pack-report-exists", "Report path passed to checker does not exist", { reportPath })];
  const html = fs.readFileSync(reportPath, "utf8");
  const state = parseJsonScript(html, "backfill-evidence-pack-state");
  if (!state) return [fail("evidence-pack-report-state", "Report is missing backfill-evidence-pack-state JSON script")];
  const expected = buildEvidencePackReportState({ repoRoot, runId, outDir, queueRows, capabilityRows, surfaceRows, fileRows, packRows });
  const drift = [];
  for (const [field, value] of Object.entries(expected)) {
    if (field === "generatedAt" || field === "latestRunLogSequence") continue;
    if (state[field] !== value) drift.push({ field, expected: value, actual: state[field] });
  }
  return drift.length === 0
    ? [pass("evidence-pack-report-state-current", "Context Pack report state matches canonical artifacts")]
    : [fail("evidence-pack-report-state-current", "Context Pack report state must match canonical artifacts", { drift })];
}

function validateEvidencePack({ repoRoot, runId, outDir = defaultBackfillDir(repoRoot), phase = "handoff", reportPath = null, skipEvalFreshness = false }) {
  const upstream = validateSplitQueueHandoff(repoRoot, runId, outDir);
  const results = [...upstream.results];
  const fileRegistry = readFileRegistryRows(repoRoot, runId, outDir);
  const surfaceRegistry = readSurfaceRegistryRows(repoRoot, runId, outDir);
  const capabilityMatrix = readCapabilityMatrixRows(repoRoot, runId, outDir);

  for (const [label, parsed] of [
    ["file-registry", fileRegistry],
    ["surface-registry", surfaceRegistry],
    ["capability-matrix", capabilityMatrix]
  ]) {
    if (parsed.errors.length > 0) {
      results.push(...parsed.errors.map(error => fail(`evidence-pack-upstream-${label}-jsonl:${error.line}`, `${label} JSONL line must parse`, error)));
    }
  }

  const packPath = evidencePackPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(packPath)) {
    return {
      packPath,
      queuePath: upstream.queuePath,
      queueRows: upstream.queueRows,
      capabilityRows: capabilityMatrix.rows,
      surfaceRows: surfaceRegistry.rows,
      fileRows: fileRegistry.rows,
      packRows: [],
      results: [...results, fail("evidence-pack-exists", `Context Pack artifact does not exist: ${packPath}`)]
    };
  }
  const parsed = readJsonl(packPath);
  results.push(pass("evidence-pack-exists", "Context Pack artifact exists"));
  if (parsed.errors.length > 0) {
    results.push(...parsed.errors.map(error => fail(`evidence-pack-jsonl:${error.line}`, "Context Pack JSONL line must parse", error)));
    return {
      packPath,
      queuePath: upstream.queuePath,
      queueRows: upstream.queueRows,
      capabilityRows: capabilityMatrix.rows,
      surfaceRows: surfaceRegistry.rows,
      fileRows: fileRegistry.rows,
      packRows: parsed.rows,
      results
    };
  }
  results.push(pass("evidence-pack-jsonl", "Every Context Pack line parses as JSON"));
  results.push(...validateEvidencePackRows({
    queueRows: upstream.queueRows,
    capabilityRows: capabilityMatrix.rows,
    surfaceRows: surfaceRegistry.rows,
    fileRows: fileRegistry.rows,
    packRows: parsed.rows,
    phase
  }));
  if (!skipEvalFreshness) {
    results.push(...validateEvidencePackEvalFreshness({ repoRoot, runId, outDir, packRows: parsed.rows, phase }));
  }
  results.push(...validateEvidencePackReportState({
    repoRoot,
    runId,
    outDir,
    reportPath,
    queueRows: upstream.queueRows,
    capabilityRows: capabilityMatrix.rows,
    surfaceRows: surfaceRegistry.rows,
    fileRows: fileRegistry.rows,
    packRows: parsed.rows
  }));
  return {
    packPath,
    queuePath: upstream.queuePath,
    queueRows: upstream.queueRows,
    capabilityRows: capabilityMatrix.rows,
    surfaceRows: surfaceRegistry.rows,
    fileRows: fileRegistry.rows,
    packRows: parsed.rows,
    results
  };
}

function selectEvidencePackEvalSample(packRows, mode = "risk") {
  if (mode === "all" || packRows.length <= 120) return packRows;
  const selected = new Map();
  for (const row of packRows) {
    if (!isReadyForProcessMapStatus(row.status)) selected.set(row.packId, row);
    if (rowHasBlockingFlag(row) || row.status === "needs-evidence") selected.set(row.packId, row);
    if ((row.evidenceRefs || []).length > 25 || row.estimatedTokens > row.tokenBudget * 0.8) selected.set(row.packId, row);
  }
  for (const row of packRows) {
    const categories = [...new Set((row.evidenceRefs || []).map(ref => ref.category).filter(Boolean))].sort().join(",");
    const stratum = `${row.status}:${categories || "none"}`;
    if (![...selected.values()].some(existing => {
      const existingCategories = [...new Set((existing.evidenceRefs || []).map(ref => ref.category).filter(Boolean))].sort().join(",");
      return `${existing.status}:${existingCategories || "none"}` === stratum;
    })) {
      selected.set(row.packId, row);
    }
  }
  return [...selected.values()].sort((left, right) => left.packId.localeCompare(right.packId));
}

function textWords(value) {
  return isNonEmptyString(value) ? (value.toLowerCase().match(/[a-z0-9]+/g) || []) : [];
}

function semanticTokensFromText(value) {
  return new Set(textWords(Array.isArray(value) ? value.join(" ") : value)
    .filter(word => word.length >= 3)
    .filter(word => !SEMANTIC_STOPWORDS.has(word)));
}

function rationaleIsSpecific(value) {
  const tokens = semanticTokensFromText(value);
  return isNonEmptyString(value) && value.trim().length >= 50 && tokens.size >= 6;
}

function scoreEvidencePackRow(row, queueById = new Map()) {
  const findings = [];
  const categoryScores = {
    upstreamTraceability: 20,
    evidenceSpecificity: 20,
    categoryCoverage: 20,
    boundedContext: 20,
    processActionReadiness: 20
  };

  const queueRow = queueById.get(row.upstreamSliceId);
  if (!queueRow) {
    findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Context Pack has no resolvable upstream Define Spec Jobs slice." });
    categoryScores.upstreamTraceability = 0;
  } else {
    if (!ACTIVE_QUEUE_STATUSES_FOR_PACK.has(queueRow.status)) {
      findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Context Pack references a Define Spec Jobs slice that is not active." });
      categoryScores.upstreamTraceability = 0;
    }
    if (row.upstreamSliceRef?.sliceFingerprint !== sliceFingerprint(queueRow)) {
      findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Context Pack has stale upstream slice fingerprint." });
      categoryScores.upstreamTraceability = 0;
    }
    const missing = (queueRow.upstreamCapabilityIds || []).filter(id => !(row.upstreamCapabilityIds || []).includes(id));
    if (missing.length > 0) {
      findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Context Pack omitted upstream capability IDs from its queue slice." });
      categoryScores.upstreamTraceability = 0;
    }
  }

  if (row.status === "needs-evidence" && hasBlockingDetail(row)) {
    findings.push({ category: "processActionReadiness", severity: "info", message: "Context Pack is explicitly blocked with named blocker detail." });
    return {
      subjectRowId: row.packId,
      upstreamSliceId: row.upstreamSliceId,
      status: row.status,
      categoryScores,
      score: Object.values(categoryScores).reduce((sum, value) => sum + value, 0),
      findings,
      acceptabilityGate: {
        acceptable: true,
        threshold: "Explicitly blocked rows are acceptable when blocker detail is named and deterministic checks pass"
      }
    };
  }

  if (!Array.isArray(row.evidenceRefs) || row.evidenceRefs.length === 0) {
    findings.push({ category: "evidenceSpecificity", severity: "blocking", message: "Context Pack lacks evidenceRefs." });
    categoryScores.evidenceSpecificity = 0;
  } else {
    const specificityIssues = row.evidenceRefs
      .map(ref => evidenceRefSpecificityIssue(ref))
      .filter(Boolean);
    if (specificityIssues.length > 0) {
      findings.push({ category: "evidenceSpecificity", severity: "blocking", message: "Evidence refs are generic, path-only, full-file, or lack exact line/snippet evidence." });
      categoryScores.evidenceSpecificity = 0;
    }
  }

  const coverageFindings = evidencePackCoverageFindings(row);
  if (coverageFindings.length > 0) {
    findings.push(...coverageFindings);
    categoryScores.categoryCoverage = 0;
  }

  if ((row.evidenceRefs || []).length > MAX_EVIDENCE_REFS) {
    findings.push({ category: "boundedContext", severity: "blocking", message: "Context Pack exceeds max evidence ref count." });
    categoryScores.boundedContext = 0;
  } else if ((row.evidenceRefs || []).length > 25) {
    findings.push({ category: "boundedContext", severity: "warning", message: "Context Pack is large enough to need tightening before handoff." });
    categoryScores.boundedContext = Math.min(categoryScores.boundedContext, 18);
  }
  if (Number.isInteger(row.estimatedTokens) && Number.isInteger(row.tokenBudget) && row.estimatedTokens > row.tokenBudget) {
    findings.push({ category: "boundedContext", severity: "blocking", message: "Context Pack estimated tokens exceed budget." });
    categoryScores.boundedContext = 0;
  } else if (Number.isInteger(row.estimatedTokens) && Number.isInteger(row.tokenBudget) && row.estimatedTokens > row.tokenBudget * 0.8) {
    findings.push({ category: "boundedContext", severity: "warning", message: "Context Pack is near the token budget and should be tightened." });
    categoryScores.boundedContext = Math.min(categoryScores.boundedContext, 18);
  }

  if (!isReadyForProcessMapStatus(row.status)) {
    findings.push({ category: "processActionReadiness", severity: "blocking", message: "Context Pack is not ready-for-process-map or explicitly blocked." });
    categoryScores.processActionReadiness = 0;
  }
  if (!rationaleIsSpecific(row.sufficiencyRationale)) {
    findings.push({ category: "processActionReadiness", severity: "blocking", message: "Context Pack sufficiencyRationale is missing or too vague." });
    categoryScores.processActionReadiness = 0;
  }
  if (!Array.isArray(row.excludedRefs)) {
    findings.push({ category: "processActionReadiness", severity: "blocking", message: "Context Pack excludedRefs must be an array." });
    categoryScores.processActionReadiness = 0;
  }

  const score = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  return {
    subjectRowId: row.packId,
    upstreamSliceId: row.upstreamSliceId,
    status: row.status,
    categoryScores,
    score,
    findings,
    acceptabilityGate: {
      acceptable: findings.every(finding => finding.severity !== "blocking") && score >= 90,
      threshold: "No blocking findings for row-level Context Pack receipt"
    }
  };
}

function aggregateEvidencePackEval(checkResults, rowReceipts) {
  const checkSummary = summarizeResults(checkResults);
  if (rowReceipts.length === 0) {
    const categoryScores = {
      upstreamCoverageAndFreshness: checkSummary.fail === 0 ? 20 : 0,
      evidenceSpecificity: 20,
      categoryCoverage: 20,
      boundedContext: 20,
      processActionReadiness: 20
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
    evidenceSpecificity: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.evidenceSpecificity), 20),
    categoryCoverage: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.categoryCoverage), 20),
    boundedContext: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.boundedContext), 20),
    processActionReadiness: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.processActionReadiness), 20)
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

function mergeEvidencePackRowsForRefresh({ queueRows, existingPackRows, queueFingerprint = null }) {
  const active = activeQueueRows(queueRows);
  const activeById = new Map(active.map(row => [row.sliceId, row]));
  const covered = new Set();
  const changed = [];
  const removed = [];
  const output = [];

  for (const row of existingPackRows) {
    const queueRow = activeById.get(row.upstreamSliceId);
    if (!queueRow) {
      removed.push(row.packId);
      continue;
    }
    const stale = row.upstreamSliceRef?.sliceFingerprint !== sliceFingerprint(queueRow);
    if (stale) {
      changed.push(row.upstreamSliceId);
      output.push(createPendingEvidencePackRow(queueRow, queueFingerprint));
      continue;
    }
    covered.add(row.upstreamSliceId);
    output.push(row);
  }

  for (const queueRow of active) {
    if (covered.has(queueRow.sliceId) || changed.includes(queueRow.sliceId)) continue;
    changed.push(queueRow.sliceId);
    output.push(createPendingEvidencePackRow(queueRow, queueFingerprint));
  }

  output.sort(compareEvidencePackRows);
  return { rows: output, changed: [...new Set(changed)], removed };
}

function buildEvidencePackPayload({ runId, repoRoot, packRows }) {
  return {
    schema: "foundation.backfill.evidence-pack.v1",
    runId,
    targetRepo: path.basename(repoRoot),
    packs: packRows.map(row => ({
      packId: row.packId,
      upstreamSliceId: row.upstreamSliceId,
      upstreamCapabilityIds: row.upstreamCapabilityIds,
      upstreamSurfaceIds: row.upstreamSurfaceIds,
      upstreamFileIds: row.upstreamFileIds,
      status: row.status,
      confidence: row.confidence,
      evidenceRefCount: Array.isArray(row.evidenceRefs) ? row.evidenceRefs.length : 0,
      sourceEvidenceCount: (row.evidenceRefs || []).filter(ref => SOURCE_EVIDENCE_CATEGORIES.has(ref.category)).length,
      verificationEvidenceCount: (row.evidenceRefs || []).filter(ref => VERIFICATION_EVIDENCE_CATEGORIES.has(ref.category)).length,
      explicitGaps: row.explicitGaps,
      sufficiencyRationale: row.sufficiencyRationale,
      blockingQuestions: row.blockingQuestions,
      blockingGaps: row.blockingGaps,
      humanDecisions: row.humanDecisions,
      tokenBudget: row.tokenBudget,
      estimatedTokens: row.estimatedTokens,
      reviewFlags: row.reviewFlags
    }))
  };
}

function buildEvidencePackReportState({ repoRoot, runId, outDir, queueRows, capabilityRows, surfaceRows, fileRows, packRows, runLogPath = null }) {
  const checkPath = evidencePackCheckPathFor(repoRoot, runId, outDir);
  const check = fs.existsSync(checkPath) ? readJson(checkPath) : null;
  const evalReceiptPath = evidencePackEvalReceiptPathFor(repoRoot, runId, outDir);
  const evalSummary = readEvidencePackEvalSummary(repoRoot, runId, outDir);
  const packFingerprint = evidencePackArtifactFingerprint(repoRoot, runId, outDir);
  const checkPackFingerprint = check?.packFingerprint || null;
  const checkPackFresh = Boolean(checkPackFingerprint) && checkPackFingerprint === packFingerprint;
  const evalPackFingerprint = evalSummary?.packFingerprint || null;
  const evalPackRowCount = Number.isInteger(evalSummary?.packRowCount) ? evalSummary.packRowCount : null;
  const checkerPass = check?.summary?.fail === 0 && checkPackFresh;
  const evalPass = Boolean(evalSummary?.acceptabilityGate?.acceptable);
  const evalRevisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  const evalFindings = Array.isArray(evalSummary?.findings) ? evalSummary.findings : [];
  const pendingCount = packRows.filter(row => row.status === "pending").length;
  const packedCount = packRows.filter(row => row.status === "packed").length;
  const needsEvidenceCount = packRows.filter(row => row.status === "needs-evidence").length;
  const blockedNeedsEvidenceCount = packRows.filter(row => row.status === "needs-evidence" && hasBlockingDetail(row)).length;
  const readyForProcessMapCount = packRows.filter(row => isReadyForProcessMapStatus(row.status)).length;
  const activeSliceCount = activeQueueRows(queueRows).length;
  const latestRunLogSequence = (() => {
    if (!runLogPath || !fs.existsSync(runLogPath)) return null;
    const parsed = readJsonl(runLogPath);
    const sequences = parsed.rows.map(row => row.sequence).filter(Number.isInteger);
    return sequences.length > 0 ? Math.max(...sequences) : null;
  })();
  const evalPackFresh = Boolean(evalPackFingerprint) &&
    evalPackFingerprint === packFingerprint &&
    evalPackRowCount === packRows.length;
  const evalHandoffReady = evalPass && evalRevisionTargets.length === 0 && evalPackFresh;
  const currentTarget = nextEvidencePackTarget({ queueRows, packRows });
  const unresolvedNeedsEvidenceCount = needsEvidenceCount - blockedNeedsEvidenceCount;

  return {
    schema: "foundation.backfill.evidence-pack-report-state.v1",
    runId,
    generatedAt: new Date().toISOString(),
    packPath: path.relative(repoRoot, evidencePackPathFor(repoRoot, runId, outDir)),
    packFingerprint,
    checkerPath: path.relative(repoRoot, checkPath),
    checkerResult: checkerPass ? "pass" : "fail-or-missing",
    checkPackFingerprint,
    checkPackFresh,
    evalReceiptPath: path.relative(repoRoot, evalReceiptPath),
    summaryPath: path.relative(repoRoot, evidencePackSummaryPathFor(repoRoot, runId, outDir)),
    evalResult: evalHandoffReady ? "pass" : (evalPass ? "pass-with-revisions" : "fail-or-missing"),
    evalScore: evalSummary?.totalScore ?? null,
    evalPackFingerprint,
    evalPackFresh,
    evalRevisionTargetCount: evalRevisionTargets.length,
    evalWarningCount: evalFindings.filter(finding => finding?.severity === "warning").length,
    evalBlockingFindingCount: evalFindings.filter(finding => finding?.severity === "blocking").length,
    queueSliceCount: queueRows.length,
    activeSliceCount,
    capabilityCount: capabilityRows.length,
    surfaceCount: surfaceRows.length,
    fileCount: fileRows.length,
    packCount: packRows.length,
    pendingCount,
    packedCount,
    needsEvidenceCount,
    blockedNeedsEvidenceCount,
    unresolvedNeedsEvidenceCount,
    readyForProcessMapCount,
    currentPackId: currentTarget?.packId || null,
    currentSliceId: currentTarget?.upstreamSliceId || null,
    latestRunLogSequence,
    nextLayer: activeSliceCount === packRows.length &&
      pendingCount === 0 &&
      packedCount === 0 &&
      unresolvedNeedsEvidenceCount === 0 &&
      checkerPass &&
      evalHandoffReady
      ? "Process / Action Map"
      : "Context Pack revision"
  };
}

export {
  ACTIVE_QUEUE_STATUSES_FOR_PACK,
  DEFAULT_TOKEN_BUDGET,
  MAX_EVIDENCE_REFS,
  VALID_EVIDENCE_CATEGORIES,
  VALID_EVIDENCE_PACK_STATUSES,
  appendRunLogEvent,
  aggregateEvidencePackEval,
  buildEvidencePackPayload,
  buildEvidencePackReportState,
  compareEvidencePackRows,
  createAgentMarkedEvidencePackRow,
  createInitialEvidencePackRows,
  createPendingEvidencePackRow,
  defaultBackfillDir,
  ensureDir,
  evidencePackArtifactFingerprint,
  evidencePackCheckPathFor,
  evidencePackEvalReceiptPathFor,
  evidencePackPathFor,
  evidencePackRefreshPathFor,
  evidencePackSummaryPathFor,
  markEvidencePackRowsForSlices,
  mergeEvidencePackRowsForRefresh,
  nextEvidencePackTarget,
  parseCliArgs,
  parseSliceIds,
  readEvidencePackRows,
  readFileRegistryRows,
  readJson,
  readJsonl,
  renderResultsText,
  scoreEvidencePackRow,
  selectEvidencePackEvalSample,
  summarizeResults,
  upstreamSliceRef,
  validateEvidencePack,
  validateEvidencePackRows,
  validateSplitQueueHandoff,
  writeJson,
  writeJsonl
};
