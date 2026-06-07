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
import { parseJsonScript } from "./capability-map-core.mjs";
import {
  contextPackArtifactFingerprint,
  contextPackCheckPathFor,
  contextPackEvalReceiptPathFor,
  contextPackPathFor,
  contextPackSummaryPathFor,
  readContextPackRows,
  validateContextPack
} from "./context-pack-core.mjs";

const READY_FOR_SPECS_STATUS = "ready-for-specs";
const VALID_PROCESS_ACTION_MAP_STATUSES = new Set([
  "pending",
  "extracted",
  "needs-evidence",
  READY_FOR_SPECS_STATUS
]);
const VALID_CONFIDENCE = new Set(["low", "medium", "high"]);
const VALID_REVIEW_FLAG_SEVERITY = new Set(["info", "warning", "blocking"]);
const ACTIVE_CONTEXT_PACK_STATUSES = new Set(["ready-for-process-map", "needs-evidence"]);
const PROCESS_READY_CONTEXT_PACK_STATUS = "ready-for-process-map";

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

function processActionMapPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `process-action-map-${runId}.jsonl`);
}

function processActionMapCheckPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `process-action-map-check-${runId}.json`);
}

function processActionMapEvalReceiptPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `process-action-map-eval-${runId}.jsonl`);
}

function processActionMapSummaryPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `process-action-map-summary-${runId}.html`);
}

function processActionMapRefreshPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `process-action-map-refresh-${runId}.json`);
}

function processActionMapArtifactFingerprint(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return fileFingerprint(processActionMapPathFor(repoRoot, runId, outDir));
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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
    .slice(0, 52);
}

function stableProcessMapId(packId, name, ordinal = 1) {
  const semantic = `${packId}:${name}:${ordinal}`;
  return `pam-${slug(name || packId || "process-action-map")}-${sha256Text(semantic).slice(0, 12)}`;
}

function contextPackRowFingerprint(row) {
  return `sha256:${sha256Text(JSON.stringify(row))}`;
}

function processActionMapRowFingerprint(row) {
  return `sha256:${sha256Text(JSON.stringify(row))}`;
}

function upstreamPackRef(row, packArtifactFingerprint = null) {
  return {
    packId: row.packId,
    upstreamSliceId: row.upstreamSliceId,
    status: row.status,
    packArtifactFingerprint,
    packRowFingerprint: contextPackRowFingerprint(row)
  };
}

function isReadyForSpecsStatus(status) {
  return status === READY_FOR_SPECS_STATUS;
}

function hasBlockingDetail(row) {
  return normalizeStringList(row?.blockingQuestions).length > 0 ||
    normalizeStringList(row?.blockingGaps).length > 0 ||
    normalizeStringList(row?.humanDecisions).length > 0;
}

function rowHasBlockingFlag(row) {
  return Array.isArray(row?.reviewFlags) && row.reviewFlags.some(flag => flag.severity === "blocking");
}

function normalizeReviewFlags(value) {
  return asObjectArray(value).map(flag => ({
    severity: VALID_REVIEW_FLAG_SEVERITY.has(flag.severity) ? flag.severity : "warning",
    reason: isNonEmptyString(flag.reason) ? flag.reason.trim() : "Process / Action Map row needs review.",
    evidence: isNonEmptyString(flag.evidence) ? flag.evidence.trim() : "",
    nextAction: isNonEmptyString(flag.nextAction) ? flag.nextAction.trim() : "Revise this Process / Action Map row."
  }));
}

function normalizeEvidenceRefs(value) {
  return asObjectArray(value).map(ref => ({
    category: isNonEmptyString(ref.category || ref.kind || ref.type) ? String(ref.category || ref.kind || ref.type).trim() : "context-pack",
    relationship: isNonEmptyString(ref.relationship) ? ref.relationship.trim() : "",
    packId: normalizeNullableString(ref.packId || ref.upstreamPackId),
    sliceId: normalizeNullableString(ref.sliceId || ref.upstreamSliceId),
    capabilityId: normalizeNullableString(ref.capabilityId),
    surfaceId: normalizeNullableString(ref.surfaceId),
    fileId: normalizeNullableString(ref.fileId),
    path: normalizeNullableString(ref.path),
    lineRange: normalizeNullableString(ref.lineRange || ref.lines),
    symbol: normalizeNullableString(ref.symbol),
    snippet: normalizeNullableString(ref.snippet || ref.excerpt),
    detail: isNonEmptyString(ref.detail || ref.evidence) ? String(ref.detail || ref.evidence).trim() : "",
    questionAnswered: isNonEmptyString(ref.questionAnswered || ref.why) ? String(ref.questionAnswered || ref.why).trim() : ""
  }));
}

function normalizeStateModel(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    states: normalizeStringList(source.states),
    transitions: normalizeStringList(source.transitions),
    emptyStates: normalizeStringList(source.emptyStates),
    loadingStates: normalizeStringList(source.loadingStates),
    errorStates: normalizeStringList(source.errorStates)
  };
}

function normalizeGraphHints(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    processLabel: normalizeNullableString(source.processLabel),
    actorNodes: normalizeStringList(source.actorNodes),
    toolNodes: normalizeStringList(source.toolNodes),
    evidenceNodes: normalizeStringList(source.evidenceNodes),
    metricNodes: normalizeStringList(source.metricNodes),
    gapNodes: normalizeStringList(source.gapNodes)
  };
}

function normalizeSpecTargets(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    jobSpecId: normalizeNullableString(source.jobSpecId),
    technicalSpecId: normalizeNullableString(source.technicalSpecId),
    evalSpecId: normalizeNullableString(source.evalSpecId),
    sections: normalizeStringList(source.sections)
  };
}

function createTraceEvidenceRefs(packRow) {
  return [
    {
      category: "context-pack",
      relationship: "upstream-context-pack",
      packId: packRow.packId,
      sliceId: packRow.upstreamSliceId,
      detail: `Process / Action Map is derived from Context Pack ${packRow.packId} for slice ${packRow.upstreamSliceId}.`,
      questionAnswered: "Which bounded Context Pack does this process row consume?"
    },
    ...normalizeStringList(packRow.upstreamCapabilityIds).map(capabilityId => ({
      category: "capability",
      relationship: "upstream-capability",
      capabilityId,
      detail: `Process / Action Map preserves upstream capability ${capabilityId} from the Context Pack.`,
      questionAnswered: "Which capability must this process preserve?"
    }))
  ];
}

function createPendingProcessActionMapRow(packRow, packArtifactFingerprint = null, ordinal = 1) {
  const now = nowIso();
  const hasBlocker = packRow.status === "needs-evidence" && hasBlockingDetail(packRow);
  const name = `Pending Process / Action Map for ${packRow.upstreamSliceRef?.name || packRow.upstreamSliceId || packRow.packId}`;
  return {
    schema: "foundation.backfill.process-action-map-row.v1",
    runId: packRow.runId,
    processMapId: stableProcessMapId(packRow.packId, name, ordinal),
    upstreamPackId: packRow.packId,
    upstreamPackRef: upstreamPackRef(packRow, packArtifactFingerprint),
    upstreamSliceId: packRow.upstreamSliceId,
    upstreamCapabilityIds: normalizeStringList(packRow.upstreamCapabilityIds),
    capabilityRefs: asObjectArray(packRow.capabilityRefs),
    actor: "",
    role: "",
    trigger: "",
    intendedOutcome: "",
    domainObject: "",
    actions: [],
    stateModel: normalizeStateModel({}),
    permissions: [],
    rules: [],
    visibleBehavior: [],
    edgeCases: [],
    recoveryPaths: [],
    evidenceRefs: createTraceEvidenceRefs(packRow),
    graphHints: normalizeGraphHints({}),
    specTargets: normalizeSpecTargets({}),
    explicitGaps: normalizeStringList(packRow.explicitGaps),
    blockingQuestions: hasBlocker ? normalizeStringList(packRow.blockingQuestions) : [],
    blockingGaps: hasBlocker ? normalizeStringList(packRow.blockingGaps) : [],
    humanDecisions: hasBlocker ? normalizeStringList(packRow.humanDecisions) : [],
    reviewFlags: [],
    status: hasBlocker ? "needs-evidence" : "pending",
    confidence: hasBlocker ? "medium" : "low",
    createdAt: now,
    updatedAt: now
  };
}

function activeContextPackRows(packRows) {
  return packRows.filter(row => ACTIVE_CONTEXT_PACK_STATUSES.has(row.status));
}

function createInitialProcessActionMapRows(packRows, packArtifactFingerprint = null) {
  return activeContextPackRows(packRows)
    .map((row, index) => createPendingProcessActionMapRow(row, packArtifactFingerprint, index + 1))
    .sort(compareProcessActionMapRows);
}

function createAgentMarkedProcessActionMapRow({ packById, packBySliceId, selectedPackIds, selectedSliceIds, spec, packArtifactFingerprint, ordinal = 1 }) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error("Process / Action Map spec must be an object");
  }
  const upstreamPackId = normalizeNullableString(spec.upstreamPackId || spec.packId);
  const upstreamSliceId = normalizeNullableString(spec.upstreamSliceId || spec.sliceId);
  let packRow = upstreamPackId ? packById.get(upstreamPackId) : null;
  if (!packRow && upstreamSliceId) packRow = packBySliceId.get(upstreamSliceId);
  if (!packRow) {
    throw new Error("Process / Action Map spec requires upstreamPackId or upstreamSliceId that resolves to a Context Pack row");
  }
  if (selectedPackIds.length > 0 && !selectedPackIds.includes(packRow.packId)) {
    throw new Error(`Process / Action Map references pack not selected by --pack-id: ${packRow.packId}`);
  }
  if (selectedSliceIds.length > 0 && !selectedSliceIds.includes(packRow.upstreamSliceId)) {
    throw new Error(`Process / Action Map references slice not selected by --slice-id: ${packRow.upstreamSliceId}`);
  }
  if (packRow.status !== PROCESS_READY_CONTEXT_PACK_STATUS && !(packRow.status === "needs-evidence" && hasBlockingDetail(packRow))) {
    throw new Error(`Process / Action Map references Context Pack row that is not ready or explicitly blocked: ${packRow.packId}`);
  }

  const traceRefs = createTraceEvidenceRefs(packRow);
  const providedRefs = normalizeEvidenceRefs(spec.evidenceRefs || spec.evidence || []);
  const evidenceRefs = [...traceRefs, ...providedRefs];
  const blockingQuestions = normalizeStringList(spec.blockingQuestions);
  const blockingGaps = normalizeStringList(spec.blockingGaps);
  const humanDecisions = normalizeStringList(spec.humanDecisions);
  const hasBlocker = blockingQuestions.length > 0 || blockingGaps.length > 0 || humanDecisions.length > 0;
  const statusFromSpec = normalizeNullableString(spec.status);
  const status = statusFromSpec && VALID_PROCESS_ACTION_MAP_STATUSES.has(statusFromSpec)
    ? statusFromSpec
    : (hasBlocker || packRow.status === "needs-evidence" ? "needs-evidence" : READY_FOR_SPECS_STATUS);
  const name = normalizeNullableString(spec.name) || `${spec.actor || "Process"} action map for ${packRow.upstreamSliceRef?.name || packRow.upstreamSliceId}`;
  const now = nowIso();
  return {
    schema: "foundation.backfill.process-action-map-row.v1",
    runId: packRow.runId,
    processMapId: normalizeNullableString(spec.processMapId || spec.rowId || spec.id) || stableProcessMapId(packRow.packId, name, ordinal),
    upstreamPackId: packRow.packId,
    upstreamPackRef: upstreamPackRef(packRow, packArtifactFingerprint),
    upstreamSliceId: packRow.upstreamSliceId,
    upstreamCapabilityIds: normalizeStringList(packRow.upstreamCapabilityIds),
    capabilityRefs: asObjectArray(packRow.capabilityRefs),
    actor: normalizeNullableString(spec.actor) || "",
    role: normalizeNullableString(spec.role) || "",
    trigger: normalizeNullableString(spec.trigger || spec.entryPoint) || "",
    intendedOutcome: normalizeNullableString(spec.intendedOutcome || spec.outcome) || "",
    domainObject: normalizeNullableString(spec.domainObject || spec.object) || "",
    actions: normalizeStringList(spec.actions || spec.primaryActions),
    stateModel: normalizeStateModel(spec.stateModel || spec.states),
    permissions: normalizeStringList(spec.permissions),
    rules: normalizeStringList(spec.rules),
    visibleBehavior: normalizeStringList(spec.visibleBehavior || spec.operatorBehavior || spec.experience),
    edgeCases: normalizeStringList(spec.edgeCases),
    recoveryPaths: normalizeStringList(spec.recoveryPaths || spec.failureRecovery),
    evidenceRefs,
    graphHints: normalizeGraphHints(spec.graphHints),
    specTargets: normalizeSpecTargets(spec.specTargets),
    explicitGaps: normalizeStringList(spec.explicitGaps || spec.gaps),
    blockingQuestions,
    blockingGaps,
    humanDecisions,
    reviewFlags: normalizeReviewFlags(spec.reviewFlags),
    status,
    confidence: VALID_CONFIDENCE.has(spec.confidence) ? spec.confidence : (isReadyForSpecsStatus(status) ? "medium" : "low"),
    createdAt: now,
    updatedAt: now
  };
}

function parseIds(value) {
  if (!isNonEmptyString(value)) return [];
  const raw = value.trim();
  if (raw.startsWith("[")) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("ID JSON must be an array");
    return normalizeStringList(parsed);
  }
  return normalizeStringList(raw.split(","));
}

function markProcessActionMapRows({ packRows, processRows, evalRows = [], packId, packIds, sliceId, sliceIds, processSpecs, packArtifactFingerprint }) {
  const selectedPackIds = parseIds(packId || packIds);
  const selectedSliceIds = parseIds(sliceId || sliceIds);
  if (selectedPackIds.length + selectedSliceIds.length !== 1) {
    throw new Error("Process / Action Map fill requires exactly one --pack-id or exactly one --slice-id");
  }
  if (!Array.isArray(processSpecs) || processSpecs.length !== 1) {
    throw new Error("Process / Action Map fill requires exactly one process spec in --processes-json");
  }
  const packById = new Map(packRows.map(row => [row.packId, row]));
  const packBySliceId = new Map(packRows.map(row => [row.upstreamSliceId, row]));
  for (const packId of selectedPackIds) {
    const row = packById.get(packId);
    if (!row) throw new Error(`Unknown Context Pack: ${packId}`);
    if (!ACTIVE_CONTEXT_PACK_STATUSES.has(row.status)) throw new Error(`Context Pack is not active for Process / Action Map: ${packId}`);
  }
  for (const sliceId of selectedSliceIds) {
    const row = packBySliceId.get(sliceId);
    if (!row) throw new Error(`Unknown Context Pack slice: ${sliceId}`);
    if (!ACTIVE_CONTEXT_PACK_STATUSES.has(row.status)) throw new Error(`Context Pack slice is not active for Process / Action Map: ${sliceId}`);
  }

  const selectedResolvedPackId = selectedPackIds[0] || packBySliceId.get(selectedSliceIds[0])?.packId;
  const currentTarget = nextProcessActionMapTarget({ packRows, processRows, evalRows });
  if (!currentTarget) {
    throw new Error("Process / Action Map fill has no current --next target; run handoff check/eval/report instead of filling another row");
  }
  if (currentTarget.upstreamPackId !== selectedResolvedPackId) {
    throw new Error(`Process / Action Map fill must use the current --next target ${currentTarget.upstreamPackId}; received ${selectedResolvedPackId}`);
  }
  const unresolved = unresolvedProcessActionMapRowsForFill({
    processRows,
    evalRows,
    selectedPackId: selectedResolvedPackId
  });
  if (unresolved.length > 0) {
    throw new Error(`Process / Action Map fill must finish the current row before selecting another Context Pack row: ${unresolved.map(row => row.processMapId).join(", ")}`);
  }

  const nextRows = processSpecs.map((spec, index) => createAgentMarkedProcessActionMapRow({
    packById,
    packBySliceId,
    selectedPackIds,
    selectedSliceIds,
    spec,
    packArtifactFingerprint,
    ordinal: index + 1
  }));
  const selectedResolvedPackIds = new Set([selectedResolvedPackId].filter(Boolean));
  const coveredPackIds = new Set(nextRows.map(row => row.upstreamPackId));
  const missing = [...selectedResolvedPackIds].filter(packId => !coveredPackIds.has(packId));
  if (missing.length > 0) throw new Error(`Process specs did not cover selected Context Pack ID(s): ${missing.join(", ")}`);

  const output = processRows.filter(row => !selectedResolvedPackIds.has(row.upstreamPackId));
  const replacedRows = processRows.filter(row => selectedResolvedPackIds.has(row.upstreamPackId));
  output.push(...nextRows);
  output.sort(compareProcessActionMapRows);
  return {
    rows: output,
    markedPackIds: [...selectedResolvedPackIds],
    processCount: nextRows.length,
    revisionCount: replacedRows.filter(row => row.status !== "pending").length,
    replacedProcessMapIds: replacedRows.map(row => row.processMapId)
  };
}

function compareProcessActionMapRows(left, right) {
  const statusRank = {
    pending: 0,
    "needs-evidence": 1,
    extracted: 2,
    [READY_FOR_SPECS_STATUS]: 3
  };
  const leftKey = `${statusRank[left.status] ?? 9}:${left.upstreamSliceId || ""}:${left.processMapId || ""}`;
  const rightKey = `${statusRank[right.status] ?? 9}:${right.upstreamSliceId || ""}:${right.processMapId || ""}`;
  return leftKey.localeCompare(rightKey);
}

function nextProcessActionMapTarget({ packRows, processRows, evalRows = [] }) {
  const packById = new Map(packRows.map(row => [row.packId, row]));
  const outstandingState = processActionMapRowOutstandingState(processRows, evalRows);
  const missingOutstanding = new Set(outstandingState.missing);
  const candidates = processRows
    .filter(row => row.status === "pending" || row.status === "extracted" || (row.status === "needs-evidence" && !hasBlockingDetail(row)) || rowHasBlockingFlag(row) || missingOutstanding.has(row.processMapId))
    .sort((left, right) => {
      const leftRank = rowHasBlockingFlag(left) ? 0 : missingOutstanding.has(left.processMapId) ? 1 : left.status === "needs-evidence" ? 2 : left.status === "extracted" ? 3 : 4;
      const rightRank = rowHasBlockingFlag(right) ? 0 : missingOutstanding.has(right.processMapId) ? 1 : right.status === "needs-evidence" ? 2 : right.status === "extracted" ? 3 : 4;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return compareProcessActionMapRows(left, right);
    });
  const target = candidates[0] || null;
  if (!target) return null;
  const pack = packById.get(target.upstreamPackId);
  return {
    processMapId: target.processMapId,
    status: target.status,
    upstreamPackId: target.upstreamPackId,
    upstreamSliceId: target.upstreamSliceId,
    upstreamSliceName: pack?.upstreamSliceRef?.name || null,
    upstreamCapabilityIds: target.upstreamCapabilityIds || [],
    actor: target.actor || null,
    trigger: target.trigger || null,
    actionCount: Array.isArray(target.actions) ? target.actions.length : 0,
    states: target.stateModel?.states || [],
    outstandingEvalMissing: missingOutstanding.has(target.processMapId),
    blockingGaps: target.blockingGaps || [],
    reviewFlags: target.reviewFlags || []
  };
}

function readEvalSummary(receiptPath) {
  if (!fs.existsSync(receiptPath)) return null;
  const parsed = readJsonl(receiptPath);
  return parsed.rows.find(row => row.receiptType === "summary") || null;
}

function readProcessActionMapEvalRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const receiptPath = processActionMapEvalReceiptPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(receiptPath)) return { receiptPath, rows: [], errors: [] };
  return { receiptPath, ...readJsonl(receiptPath) };
}

function latestProcessActionMapRowReceipts(evalRows) {
  const latest = new Map();
  for (const receipt of Array.isArray(evalRows) ? evalRows : []) {
    if (receipt?.receiptType !== "row" || !isNonEmptyString(receipt.subjectRowId)) continue;
    latest.set(receipt.subjectRowId, receipt);
  }
  return latest;
}

function isOutstandingProcessActionMapRowReceipt(row, receipt) {
  if (!row || !receipt) return false;
  const findings = Array.isArray(receipt.findings) ? receipt.findings : [];
  return receipt.receiptType === "row" &&
    receipt.subjectRowId === row.processMapId &&
    receipt.processRowFingerprint === processActionMapRowFingerprint(row) &&
    receipt.acceptabilityGate?.outstanding === true &&
    findings.every(finding => finding?.severity !== "blocking" && finding?.severity !== "warning");
}

function processActionMapRowOutstandingState(processRows, evalRows) {
  const latest = latestProcessActionMapRowReceipts(evalRows);
  const outstanding = [];
  const missing = [];
  for (const row of processRows) {
    if (row?.status === "pending") continue;
    const receipt = latest.get(row.processMapId);
    if (isOutstandingProcessActionMapRowReceipt(row, receipt)) {
      outstanding.push(row.processMapId);
    } else {
      missing.push(row.processMapId);
    }
  }
  return { outstanding, missing };
}

function unresolvedProcessActionMapRowsForFill({ processRows, evalRows, selectedPackId }) {
  const state = processActionMapRowOutstandingState(processRows, evalRows);
  const missing = new Set(state.missing);
  return processRows
    .filter(row => row?.status !== "pending" && row?.upstreamPackId !== selectedPackId && missing.has(row.processMapId))
    .map(row => ({
      processMapId: row.processMapId,
      upstreamPackId: row.upstreamPackId,
      status: row.status
    }));
}

function readProcessActionMapRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const processMapPath = processActionMapPathFor(repoRoot, runId, outDir);
  const parsed = readJsonl(processMapPath);
  return { processMapPath, ...parsed };
}

function validateContextPackHandoff(repoRoot, runId, outDir = defaultBackfillDir(repoRoot), reportPath = null) {
  const validation = validateContextPack({ repoRoot, runId, outDir, phase: "handoff", reportPath });
  const results = [...validation.results];
  const packFingerprint = contextPackArtifactFingerprint(repoRoot, runId, outDir);

  const checkPath = contextPackCheckPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(checkPath)) {
    results.push(fail("upstream-context-pack-check-artifact", "Passing Context Pack check artifact is required before Process / Action Map"));
  } else {
    const check = readJson(checkPath);
    const checkFresh = check?.packFingerprint === packFingerprint;
    results.push(check?.summary?.fail === 0 && checkFresh
      ? pass("upstream-context-pack-check-artifact", "Context Pack check artifact passes and is current")
      : fail("upstream-context-pack-check-artifact", "Context Pack check artifact must pass and match current pack fingerprint", {
        expectedPackFingerprint: packFingerprint,
        actualPackFingerprint: check?.packFingerprint || null,
        summary: check?.summary || null
      }));
  }

  const evalSummary = readEvalSummary(contextPackEvalReceiptPathFor(repoRoot, runId, outDir));
  const evalFresh = Boolean(evalSummary?.packFingerprint) &&
    evalSummary.packFingerprint === packFingerprint &&
    evalSummary.packRowCount === validation.packRows.length;
  results.push(evalSummary?.acceptabilityGate?.acceptable && evalFresh
    ? pass("upstream-context-pack-eval", "Context Pack eval artifact passes and is current")
    : fail("upstream-context-pack-eval", "Passing current Context Pack eval receipt is required before Process / Action Map", {
      expectedPackFingerprint: packFingerprint,
      actualPackFingerprint: evalSummary?.packFingerprint || null,
      expectedRowCount: validation.packRows.length,
      actualRowCount: Number.isInteger(evalSummary?.packRowCount) ? evalSummary.packRowCount : null
    }));
  const revisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  results.push(revisionTargets.length === 0
    ? pass("upstream-context-pack-eval-revisions", "Context Pack eval has no revision targets")
    : fail("upstream-context-pack-eval-revisions", "Context Pack eval revision targets must be resolved before Process / Action Map", { revisionTargets }));

  const summaryPath = contextPackSummaryPathFor(repoRoot, runId, outDir);
  results.push(fs.existsSync(summaryPath)
    ? pass("upstream-context-pack-eval-summary", "Context Pack HTML eval summary exists")
    : fail("upstream-context-pack-eval-summary", "Context Pack HTML eval summary is required before Process / Action Map", { summaryPath: path.relative(repoRoot, summaryPath) }));

  if (reportPath) {
    if (!fs.existsSync(reportPath)) {
      results.push(fail("upstream-context-pack-report-exists", "Context Pack report path does not exist", { reportPath }));
    } else {
      const state = parseJsonScript(fs.readFileSync(reportPath, "utf8"), "backfill-context-pack-state");
      results.push(state?.nextLayer === "Process / Action Map"
        ? pass("upstream-context-pack-report-handoff", "Context Pack report names Process / Action Map as next layer")
        : fail("upstream-context-pack-report-handoff", "Context Pack report must name Process / Action Map as next layer", { nextLayer: state?.nextLayer || null }));
    }
    const hasReportFailure = results.some(result => result.status === "fail" && /^context-pack-report-|^upstream-context-pack-report-/.test(result.id));
    if (hasReportFailure) {
      const nextCommand = `npm run foundation:context-pack:report -- --repo ${repoRoot} --run-id ${runId} --report ${path.relative(repoRoot, reportPath)}`;
      results.push(fail("upstream-context-pack-report-refresh-required", `Refresh the Context Pack report before Process / Action Map init by running: ${nextCommand}`, {
        nextCommand
      }));
    }
  }

  return {
    packPath: validation.packPath,
    packRows: validation.packRows,
    results
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

function hasSpecificText(value, minLength = 24) {
  return isNonEmptyString(value) && value.trim().length >= minLength;
}

function processCoverageFindings(row) {
  const findings = [];
  if (!hasSpecificText(row.actor, 3)) findings.push({ category: "processSpecificity", severity: "blocking", message: "Row requires actor." });
  if (!hasSpecificText(row.trigger, 10)) findings.push({ category: "processSpecificity", severity: "blocking", message: "Row requires a specific trigger or entry point." });
  if (!hasSpecificText(row.intendedOutcome, 20)) findings.push({ category: "processSpecificity", severity: "blocking", message: "Row requires a specific intended outcome." });
  if (!hasSpecificText(row.domainObject, 8)) findings.push({ category: "processSpecificity", severity: "blocking", message: "Row requires a domain object." });
  if (!Array.isArray(row.actions) || row.actions.length < 2) findings.push({ category: "processSpecificity", severity: "blocking", message: "Row requires at least two ordered actions." });
  if (!Array.isArray(row.stateModel?.states) || row.stateModel.states.length < 2) findings.push({ category: "stateRuleCompleteness", severity: "blocking", message: "Row requires at least two visible/operator/system states." });
  if (!Array.isArray(row.stateModel?.transitions) || row.stateModel.transitions.length < 1) findings.push({ category: "stateRuleCompleteness", severity: "blocking", message: "Row requires at least one state transition." });
  if ((!Array.isArray(row.permissions) || row.permissions.length < 1) && (!Array.isArray(row.rules) || row.rules.length < 1)) {
    findings.push({ category: "stateRuleCompleteness", severity: "blocking", message: "Row requires permissions or rules." });
  }
  if (!Array.isArray(row.edgeCases) || row.edgeCases.length < 1) findings.push({ category: "recoveryEdgeCoverage", severity: "blocking", message: "Row requires at least one edge case or explicit gap." });
  if (!Array.isArray(row.recoveryPaths) || row.recoveryPaths.length < 1) findings.push({ category: "recoveryEdgeCoverage", severity: "blocking", message: "Row requires at least one recovery path or explicit gap." });
  if (!Array.isArray(row.evidenceRefs) || row.evidenceRefs.length < 2) findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Row requires trace evidence refs." });
  if (!row.graphHints || (!hasSpecificText(row.graphHints.processLabel, 8) && normalizeStringList(row.graphHints.actorNodes).length === 0)) {
    findings.push({ category: "specAuthorReadiness", severity: "blocking", message: "Row requires graph hints for downstream specs." });
  }
  return findings;
}

function validateProcessActionMapRowShape(row, prefix, results, phase) {
  if (row?.schema !== "foundation.backfill.process-action-map-row.v1") {
    results.push(fail(`${prefix}:schema`, "Process / Action Map row schema is invalid", { schema: row?.schema }));
  }
  if (!isNonEmptyString(row?.runId)) results.push(fail(`${prefix}:run-id`, "Process / Action Map row requires runId"));
  if (!isNonEmptyString(row?.processMapId)) results.push(fail(`${prefix}:process-map-id`, "Process / Action Map row requires processMapId"));
  if (!isNonEmptyString(row?.upstreamPackId)) results.push(fail(`${prefix}:upstream-pack-id`, "Process / Action Map row requires upstreamPackId"));
  if (!isNonEmptyString(row?.upstreamSliceId)) results.push(fail(`${prefix}:upstream-slice-id`, "Process / Action Map row requires upstreamSliceId"));
  if (!VALID_PROCESS_ACTION_MAP_STATUSES.has(row?.status)) results.push(fail(`${prefix}:status`, "Process / Action Map status is outside enum", { status: row?.status }));
  if (!VALID_CONFIDENCE.has(row?.confidence)) results.push(fail(`${prefix}:confidence`, "Process / Action Map confidence is outside enum", { confidence: row?.confidence }));
  for (const field of ["upstreamCapabilityIds", "capabilityRefs", "actions", "permissions", "rules", "visibleBehavior", "edgeCases", "recoveryPaths", "evidenceRefs", "explicitGaps", "blockingQuestions", "blockingGaps", "humanDecisions", "reviewFlags"]) {
    if (!Array.isArray(row?.[field])) results.push(fail(`${prefix}:${field}`, `${field} must be an array`));
  }
  if (!row?.upstreamPackRef || typeof row.upstreamPackRef !== "object" || Array.isArray(row.upstreamPackRef)) results.push(fail(`${prefix}:upstream-pack-ref`, "upstreamPackRef must be an object"));
  if (!row?.stateModel || typeof row.stateModel !== "object" || Array.isArray(row.stateModel)) results.push(fail(`${prefix}:state-model`, "stateModel must be an object"));
  if (!row?.graphHints || typeof row.graphHints !== "object" || Array.isArray(row.graphHints)) results.push(fail(`${prefix}:graph-hints`, "graphHints must be an object"));
  if (!row?.specTargets || typeof row.specTargets !== "object" || Array.isArray(row.specTargets)) results.push(fail(`${prefix}:spec-targets`, "specTargets must be an object"));
  validateReviewFlags(row, prefix, results);
  if (isReadyForSpecsStatus(row?.status)) {
    for (const finding of processCoverageFindings(row)) {
      const hasGap = normalizeStringList(row.explicitGaps).some(gap => gap.toLowerCase().includes(finding.category.toLowerCase()));
      if (!hasGap) results.push(fail(`${prefix}:${finding.category}`, finding.message));
    }
  }
  if (row?.status === "needs-evidence" && phase === "handoff" && !hasBlockingDetail(row)) {
    results.push(fail(`${prefix}:needs-evidence-detail`, "needs-evidence handoff rows require blockingQuestions, blockingGaps, or humanDecisions"));
  }
  if (phase === "handoff" && (row?.status === "pending" || row?.status === "extracted")) {
    results.push(fail(`${prefix}:non-terminal-handoff`, "Handoff requires no pending or extracted Process / Action Map rows", { status: row?.status }));
  }
  if ((isReadyForSpecsStatus(row?.status) || row?.status === "extracted") && rowHasBlockingFlag(row)) {
    results.push(fail(`${prefix}:blocking-flags`, "Ready or extracted Process / Action Map rows cannot carry blocking review flags"));
  }
}

function validateProcessActionMapRows({ packRows, processRows, phase = "handoff" }) {
  const results = [];
  const packById = new Map(packRows.map(row => [row.packId, row]));
  const rowsByPack = new Map();
  const stale = [];
  const pending = [];
  const extracted = [];
  const unblockedNeedsEvidence = [];

  results.push(validateUnique(processRows, "processMapId", "process-action-map"));

  for (const [index, row] of processRows.entries()) {
    const prefix = `process-action-map:${row?.processMapId || index + 1}`;
    validateProcessActionMapRowShape(row, prefix, results, phase);
    if (isNonEmptyString(row?.upstreamPackId)) {
      if (!rowsByPack.has(row.upstreamPackId)) rowsByPack.set(row.upstreamPackId, []);
      rowsByPack.get(row.upstreamPackId).push(row);
    }
    if (row.status === "pending") pending.push(row.processMapId);
    if (row.status === "extracted") extracted.push(row.processMapId);
    if (row.status === "needs-evidence" && !hasBlockingDetail(row)) unblockedNeedsEvidence.push(row.processMapId);

    const packRow = packById.get(row.upstreamPackId);
    if (!packRow) {
      results.push(fail(`${prefix}:upstream-pack-resolves`, "Process / Action Map row references missing Context Pack", { upstreamPackId: row.upstreamPackId }));
    } else {
      if (!ACTIVE_CONTEXT_PACK_STATUSES.has(packRow.status)) {
        results.push(fail(`${prefix}:upstream-pack-active`, "Process / Action Map row references Context Pack that is not active for this layer", { upstreamPackId: row.upstreamPackId, status: packRow.status }));
      }
      if (row.upstreamPackRef?.packRowFingerprint !== contextPackRowFingerprint(packRow)) {
        stale.push({ processMapId: row.processMapId, upstreamPackId: row.upstreamPackId });
      }
      if (row.upstreamSliceId !== packRow.upstreamSliceId) {
        results.push(fail(`${prefix}:upstream-slice-alignment`, "upstreamSliceId must match Context Pack upstreamSliceId", { expected: packRow.upstreamSliceId, actual: row.upstreamSliceId }));
      }
      const missingCapabilities = normalizeStringList(packRow.upstreamCapabilityIds).filter(id => !normalizeStringList(row.upstreamCapabilityIds).includes(id));
      if (missingCapabilities.length > 0) results.push(fail(`${prefix}:upstream-capability-coverage`, "Process row must carry every upstream capability ID from Context Pack", { missingCapabilities }));
      const missingCapabilityRefs = asObjectArray(packRow.capabilityRefs)
        .filter(ref => !asObjectArray(row.capabilityRefs).some(rowRef => rowRef.capabilityId === ref.capabilityId));
      if (missingCapabilityRefs.length > 0) results.push(fail(`${prefix}:capability-ref-coverage`, "Process row must carry child/sole capabilityRefs from Context Pack", { missingCapabilityRefs: missingCapabilityRefs.map(ref => ref.capabilityId) }));
      const unqueueableRefs = asObjectArray(row.capabilityRefs)
        .filter(ref => ref.capabilityAltitude === "parent" || ref.capabilityAltitude === "needs-split" || ref.capabilityAltitude === "blocked" || ref.queueEligible === false);
      if (unqueueableRefs.length > 0) results.push(fail(`${prefix}:capability-ref-queue-eligible`, "Process row cannot carry parent, needs-split, blocked, or non-queueEligible capability refs as active work", { unqueueableRefs: unqueueableRefs.map(ref => ref.capabilityId) }));
    }
    for (const [refIndex, ref] of asObjectArray(row.evidenceRefs).entries()) {
      const label = `${prefix}:evidence-refs:${refIndex + 1}`;
      if (isNonEmptyString(ref.packId) && !packById.has(ref.packId)) results.push(fail(`${label}:pack-resolves`, "Evidence ref packId must resolve to Context Pack", { packId: ref.packId }));
      if (!isNonEmptyString(ref.detail) || ref.detail.length < 20) results.push(fail(`${label}:detail`, "Evidence ref requires specific detail"));
    }
  }

  results.push(stale.length === 0
    ? pass("process-action-map-upstream-fresh", "Process / Action Map upstream Context Pack fingerprints match")
    : fail("process-action-map-upstream-fresh", "Process / Action Map rows must refresh when upstream Context Packs change", { stale }));

  const duplicatePackRows = [...rowsByPack.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([upstreamPackId, rows]) => ({ upstreamPackId, processMapIds: rows.map(row => row.processMapId) }));
  results.push(duplicatePackRows.length === 0
    ? pass("process-action-map-one-row-per-pack", "Each Context Pack has at most one Process / Action Map row")
    : fail("process-action-map-one-row-per-pack", "Each Context Pack must have at most one Process / Action Map row", { duplicatePackRows }));

  const uncovered = activeContextPackRows(packRows)
    .filter(pack => !rowsByPack.has(pack.packId))
    .map(pack => ({ packId: pack.packId, upstreamSliceId: pack.upstreamSliceId, status: pack.status }));
  if (uncovered.length === 0) {
    results.push(pass("process-action-map-covers-active-packs", "Every active Context Pack has Process / Action Map coverage"));
  } else if (phase === "handoff") {
    results.push(fail("process-action-map-covers-active-packs", "Process / Action Map must cover every active Context Pack before Author Specs", { uncovered }));
  } else {
    results.push(warn("process-action-map-covers-active-packs", `${uncovered.length} active Context Pack row(s) still need Process / Action Map coverage`, { uncovered }));
  }

  if (phase === "handoff") {
    results.push(pending.length === 0
      ? pass("handoff-no-pending-process-rows", "No pending Process / Action Map rows remain")
      : fail("handoff-no-pending-process-rows", "Handoff requires zero pending Process / Action Map rows", { pending }));
    results.push(extracted.length === 0
      ? pass("handoff-no-extracted-process-rows", "No extracted-but-unready Process / Action Map rows remain")
      : fail("handoff-no-extracted-process-rows", "Handoff requires no extracted Process / Action Map rows", { extracted }));
    results.push(unblockedNeedsEvidence.length === 0
      ? pass("handoff-needs-evidence-blocked", "Every needs-evidence row has explicit blocker detail")
      : fail("handoff-needs-evidence-blocked", "needs-evidence rows require explicit blocker detail before handoff", { unblockedNeedsEvidence }));
  } else {
    results.push(warn("batch-pending-process-rows-allowed", `${pending.length} pending Process / Action Map row(s) remain in batch phase`, { pendingCount: pending.length }));
  }

  return results;
}

function readProcessActionMapEvalSummary(repoRoot, runId, outDir) {
  return readEvalSummary(processActionMapEvalReceiptPathFor(repoRoot, runId, outDir));
}

function validateProcessActionMapEvalFreshness({ repoRoot, runId, outDir, processRows, phase = "handoff" }) {
  const evalSummary = readProcessActionMapEvalSummary(repoRoot, runId, outDir);
  if (!evalSummary) return [];
  if (phase !== "handoff") return [];
  const evalRows = readProcessActionMapEvalRows(repoRoot, runId, outDir).rows;
  const rowOutstandingState = processActionMapRowOutstandingState(processRows, evalRows);
  const currentFingerprint = processActionMapArtifactFingerprint(repoRoot, runId, outDir);
  const expectedRowCount = processRows.length;
  const actualRowCount = Number.isInteger(evalSummary.processRowCount) ? evalSummary.processRowCount : null;
  const fresh = Boolean(evalSummary.processMapFingerprint) &&
    evalSummary.processMapFingerprint === currentFingerprint &&
    actualRowCount === expectedRowCount;
  const results = fresh
    ? [pass("process-action-map-eval-current", "Process / Action Map eval receipt matches current artifact")]
    : [fail("process-action-map-eval-current", "Process / Action Map eval must regenerate after artifact changes", {
      expectedProcessMapFingerprint: currentFingerprint,
      actualProcessMapFingerprint: evalSummary.processMapFingerprint || null,
      expectedRowCount,
      actualRowCount
    })];
  const revisionTargets = Array.isArray(evalSummary.revisionTargets) ? evalSummary.revisionTargets : [];
  results.push(revisionTargets.length === 0
    ? pass("process-action-map-eval-revisions", "Process / Action Map eval has no revision targets")
    : fail("process-action-map-eval-revisions", "Process / Action Map eval revision targets must be resolved before Author Specs", { revisionTargets }));
  results.push(rowOutstandingState.missing.length === 0
    ? pass("process-action-map-row-evals-outstanding", "Every non-pending Process / Action Map row has a current outstanding row-level eval receipt")
    : fail("process-action-map-row-evals-outstanding", "Every non-pending Process / Action Map row requires a current outstanding row-level eval receipt before Author Specs", { missing: rowOutstandingState.missing }));
  return results;
}

function buildProcessActionMapReportState({ repoRoot, runId, outDir, packRows, processRows, runLogPath = null }) {
  const checkPath = processActionMapCheckPathFor(repoRoot, runId, outDir);
  const check = fs.existsSync(checkPath) ? readJson(checkPath) : null;
  const evalReceiptPath = processActionMapEvalReceiptPathFor(repoRoot, runId, outDir);
  const evalRows = readProcessActionMapEvalRows(repoRoot, runId, outDir).rows;
  const evalSummary = readProcessActionMapEvalSummary(repoRoot, runId, outDir);
  const processMapFingerprint = processActionMapArtifactFingerprint(repoRoot, runId, outDir);
  const checkProcessMapFingerprint = check?.processMapFingerprint || null;
  const checkProcessMapFresh = Boolean(checkProcessMapFingerprint) && checkProcessMapFingerprint === processMapFingerprint;
  const evalProcessMapFingerprint = evalSummary?.processMapFingerprint || null;
  const evalProcessRowCount = Number.isInteger(evalSummary?.processRowCount) ? evalSummary.processRowCount : null;
  const checkerPass = check?.summary?.fail === 0 && checkProcessMapFresh;
  const evalPass = Boolean(evalSummary?.acceptabilityGate?.acceptable);
  const evalRevisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  const evalFindings = Array.isArray(evalSummary?.findings) ? evalSummary.findings : [];
  const rowOutstandingState = processActionMapRowOutstandingState(processRows, evalRows);
  const activePackCount = activeContextPackRows(packRows).length;
  const pendingCount = processRows.filter(row => row.status === "pending").length;
  const extractedCount = processRows.filter(row => row.status === "extracted").length;
  const needsEvidenceCount = processRows.filter(row => row.status === "needs-evidence").length;
  const blockedNeedsEvidenceCount = processRows.filter(row => row.status === "needs-evidence" && hasBlockingDetail(row)).length;
  const readyForSpecsCount = processRows.filter(row => isReadyForSpecsStatus(row.status)).length;
  const evalProcessMapFresh = Boolean(evalProcessMapFingerprint) &&
    evalProcessMapFingerprint === processMapFingerprint &&
    evalProcessRowCount === processRows.length;
  const rowOutstandingReady = rowOutstandingState.missing.length === 0;
  const evalHandoffReady = evalPass && evalRevisionTargets.length === 0 && evalProcessMapFresh && rowOutstandingReady;
  const currentTarget = nextProcessActionMapTarget({ packRows, processRows, evalRows });
  const unresolvedNeedsEvidenceCount = needsEvidenceCount - blockedNeedsEvidenceCount;
  const latestRunLogSequence = (() => {
    if (!runLogPath || !fs.existsSync(runLogPath)) return null;
    const parsed = readJsonl(runLogPath);
    const sequences = parsed.rows.map(row => row.sequence).filter(Number.isInteger);
    return sequences.length > 0 ? Math.max(...sequences) : null;
  })();

  return {
    schema: "foundation.backfill.process-action-map-report-state.v1",
    runId,
    generatedAt: new Date().toISOString(),
    processMapPath: path.relative(repoRoot, processActionMapPathFor(repoRoot, runId, outDir)),
    processMapFingerprint,
    checkerPath: path.relative(repoRoot, checkPath),
    checkerResult: checkerPass ? "pass" : "fail-or-missing",
    checkProcessMapFingerprint,
    checkProcessMapFresh,
    evalReceiptPath: path.relative(repoRoot, evalReceiptPath),
    summaryPath: path.relative(repoRoot, processActionMapSummaryPathFor(repoRoot, runId, outDir)),
    evalResult: evalHandoffReady ? "pass" : (evalPass ? "pass-with-revisions" : "fail-or-missing"),
    evalScore: evalSummary?.totalScore ?? null,
    evalProcessMapFingerprint,
    evalProcessMapFresh,
    evalRevisionTargetCount: evalRevisionTargets.length,
    evalWarningCount: evalFindings.filter(finding => finding?.severity === "warning").length,
    evalBlockingFindingCount: evalFindings.filter(finding => finding?.severity === "blocking").length,
    rowOutstandingCount: rowOutstandingState.outstanding.length,
    rowOutstandingMissingCount: rowOutstandingState.missing.length,
    packCount: packRows.length,
    activePackCount,
    processRowCount: processRows.length,
    pendingCount,
    extractedCount,
    needsEvidenceCount,
    blockedNeedsEvidenceCount,
    unresolvedNeedsEvidenceCount,
    readyForSpecsCount,
    currentProcessMapId: currentTarget?.processMapId || null,
    currentPackId: currentTarget?.upstreamPackId || null,
    currentSliceId: currentTarget?.upstreamSliceId || null,
    latestRunLogSequence,
    nextLayer: activePackCount === processRows.length &&
      pendingCount === 0 &&
      extractedCount === 0 &&
      unresolvedNeedsEvidenceCount === 0 &&
      checkerPass &&
      evalHandoffReady
      ? "Author Specs"
      : "Process / Action Map revision"
  };
}

function buildProcessActionMapPayload({ runId, repoRoot, processRows }) {
  return {
    schema: "foundation.backfill.process-action-map.v1",
    runId,
    targetRepo: path.basename(repoRoot),
    processes: processRows.map(row => ({
      processMapId: row.processMapId,
      upstreamPackId: row.upstreamPackId,
      upstreamSliceId: row.upstreamSliceId,
      upstreamCapabilityIds: row.upstreamCapabilityIds,
      capabilityRefs: row.capabilityRefs || [],
      status: row.status,
      confidence: row.confidence,
      actor: row.actor,
      role: row.role,
      trigger: row.trigger,
      intendedOutcome: row.intendedOutcome,
      domainObject: row.domainObject,
      actionCount: Array.isArray(row.actions) ? row.actions.length : 0,
      stateCount: Array.isArray(row.stateModel?.states) ? row.stateModel.states.length : 0,
      transitionCount: Array.isArray(row.stateModel?.transitions) ? row.stateModel.transitions.length : 0,
      ruleCount: Array.isArray(row.rules) ? row.rules.length : 0,
      permissionCount: Array.isArray(row.permissions) ? row.permissions.length : 0,
      edgeCaseCount: Array.isArray(row.edgeCases) ? row.edgeCases.length : 0,
      recoveryPathCount: Array.isArray(row.recoveryPaths) ? row.recoveryPaths.length : 0,
      graphProcessLabel: row.graphHints?.processLabel || null,
      specTargets: row.specTargets,
      explicitGaps: row.explicitGaps,
      blockingQuestions: row.blockingQuestions,
      blockingGaps: row.blockingGaps,
      humanDecisions: row.humanDecisions,
      reviewFlags: row.reviewFlags
    }))
  };
}

function validateProcessActionMapReportState({ repoRoot, runId, outDir, reportPath, packRows, processRows }) {
  if (!reportPath) return [];
  if (!fs.existsSync(reportPath)) return [fail("process-action-map-report-exists", "Report path passed to checker does not exist", { reportPath })];
  const html = fs.readFileSync(reportPath, "utf8");
  const state = parseJsonScript(html, "backfill-process-action-map-state");
  if (!state) return [fail("process-action-map-report-state", "Report is missing backfill-process-action-map-state JSON script")];
  const expected = buildProcessActionMapReportState({ repoRoot, runId, outDir, packRows, processRows });
  const drift = [];
  for (const [field, value] of Object.entries(expected)) {
    if (field === "generatedAt" || field === "latestRunLogSequence") continue;
    if (state[field] !== value) drift.push({ field, expected: value, actual: state[field] });
  }
  return drift.length === 0
    ? [pass("process-action-map-report-state-current", "Process / Action Map report state matches canonical artifacts")]
    : [fail("process-action-map-report-state-current", "Process / Action Map report state must match canonical artifacts", { drift })];
}

function validateProcessActionMap({ repoRoot, runId, outDir = defaultBackfillDir(repoRoot), phase = "handoff", reportPath = null, skipEvalFreshness = false }) {
  const upstream = validateContextPackHandoff(repoRoot, runId, outDir);
  const results = [...upstream.results];
  const processMapPath = processActionMapPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(processMapPath)) {
    return {
      processMapPath,
      packPath: upstream.packPath,
      packRows: upstream.packRows,
      processRows: [],
      results: [...results, fail("process-action-map-exists", `Process / Action Map artifact does not exist: ${processMapPath}`)]
    };
  }
  const parsed = readJsonl(processMapPath);
  results.push(pass("process-action-map-exists", "Process / Action Map artifact exists"));
  if (parsed.errors.length > 0) {
    results.push(...parsed.errors.map(error => fail(`process-action-map-jsonl:${error.line}`, "Process / Action Map JSONL line must parse", error)));
    return {
      processMapPath,
      packPath: upstream.packPath,
      packRows: upstream.packRows,
      processRows: parsed.rows,
      results
    };
  }
  results.push(pass("process-action-map-jsonl", "Every Process / Action Map line parses as JSON"));
  results.push(...validateProcessActionMapRows({ packRows: upstream.packRows, processRows: parsed.rows, phase }));
  if (!skipEvalFreshness) {
    results.push(...validateProcessActionMapEvalFreshness({ repoRoot, runId, outDir, processRows: parsed.rows, phase }));
  }
  results.push(...validateProcessActionMapReportState({ repoRoot, runId, outDir, reportPath, packRows: upstream.packRows, processRows: parsed.rows }));
  return {
    processMapPath,
    packPath: upstream.packPath,
    packRows: upstream.packRows,
    processRows: parsed.rows,
    results
  };
}

function selectProcessActionMapEvalSample(processRows, mode = "risk") {
  if (mode === "all" || processRows.length <= 120) return processRows;
  const selected = new Map();
  for (const row of processRows) {
    if (!isReadyForSpecsStatus(row.status)) selected.set(row.processMapId, row);
    if (rowHasBlockingFlag(row) || row.status === "needs-evidence") selected.set(row.processMapId, row);
    if ((row.actions || []).length === 0 || (row.stateModel?.states || []).length === 0) selected.set(row.processMapId, row);
  }
  for (const row of processRows) {
    const stratum = `${row.status}:${row.actor || "no-actor"}:${(row.upstreamCapabilityIds || []).length}`;
    if (![...selected.values()].some(existing => `${existing.status}:${existing.actor || "no-actor"}:${(existing.upstreamCapabilityIds || []).length}` === stratum)) {
      selected.set(row.processMapId, row);
    }
  }
  return [...selected.values()].sort((left, right) => left.processMapId.localeCompare(right.processMapId));
}

function scoreProcessActionMapRow(row, packById = new Map()) {
  const findings = [];
  const categoryScores = {
    upstreamTraceability: 20,
    processSpecificity: 20,
    stateRuleCompleteness: 20,
    recoveryEdgeCoverage: 20,
    specAuthorReadiness: 20
  };

  const packRow = packById.get(row.upstreamPackId);
  if (!packRow) {
    findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Process / Action Map row has no resolvable upstream Context Pack." });
    categoryScores.upstreamTraceability = 0;
  } else {
    if (!ACTIVE_CONTEXT_PACK_STATUSES.has(packRow.status)) {
      findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Process / Action Map row references a Context Pack that is not active." });
      categoryScores.upstreamTraceability = 0;
    }
    if (row.upstreamPackRef?.packRowFingerprint !== contextPackRowFingerprint(packRow)) {
      findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Process / Action Map row has stale upstream Context Pack fingerprint." });
      categoryScores.upstreamTraceability = 0;
    }
  }

  if (row.status === "needs-evidence" && hasBlockingDetail(row)) {
    findings.push({ category: "specAuthorReadiness", severity: "info", message: "Process / Action Map row is explicitly blocked with named blocker detail." });
    return {
      subjectRowId: row.processMapId,
      upstreamPackId: row.upstreamPackId,
      upstreamSliceId: row.upstreamSliceId,
      status: row.status,
      processRowFingerprint: processActionMapRowFingerprint(row),
      categoryScores,
      score: Object.values(categoryScores).reduce((sum, value) => sum + value, 0),
      findings,
      acceptabilityGate: {
        acceptable: true,
        outstanding: true,
        threshold: "Explicitly blocked rows are outstanding for this layer when blocker detail is named and deterministic checks pass"
      }
    };
  }

  for (const finding of processCoverageFindings(row)) {
    findings.push(finding);
    categoryScores[finding.category] = 0;
  }

  if (!isReadyForSpecsStatus(row.status)) {
    findings.push({ category: "specAuthorReadiness", severity: "blocking", message: "Process / Action Map row is not ready-for-specs or explicitly blocked." });
    categoryScores.specAuthorReadiness = 0;
  }
  if (normalizeStringList(row.visibleBehavior).length === 0 && normalizeStringList(row.explicitGaps).every(gap => !gap.toLowerCase().includes("visible"))) {
    findings.push({ category: "processSpecificity", severity: "warning", message: "Row has no visible/operator behavior; verify this is nonvisual/system-only before Author Specs." });
    categoryScores.processSpecificity = Math.min(categoryScores.processSpecificity, 18);
  }
  if (!row.specTargets?.jobSpecId && !row.specTargets?.technicalSpecId) {
    findings.push({ category: "specAuthorReadiness", severity: "warning", message: "Row has no proposed downstream spec target." });
    categoryScores.specAuthorReadiness = Math.min(categoryScores.specAuthorReadiness, 18);
  }

  const score = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  return {
    subjectRowId: row.processMapId,
    upstreamPackId: row.upstreamPackId,
    upstreamSliceId: row.upstreamSliceId,
    status: row.status,
    processRowFingerprint: processActionMapRowFingerprint(row),
    categoryScores,
    score,
    findings,
    acceptabilityGate: {
      acceptable: findings.every(finding => finding.severity !== "blocking") && score >= 90,
      outstanding: findings.every(finding => finding.severity !== "blocking" && finding.severity !== "warning") && score === 100,
      threshold: "Outstanding row-level Process / Action Map receipt requires score 100 with no blocking findings and no warnings"
    }
  };
}

function aggregateProcessActionMapEval(checkResults, rowReceipts) {
  const checkSummary = summarizeResults(checkResults);
  if (rowReceipts.length === 0) {
    const categoryScores = {
      upstreamCoverageAndFreshness: checkSummary.fail === 0 ? 20 : 0,
      processSpecificity: 20,
      stateRuleCompleteness: 20,
      recoveryEdgeCoverage: 20,
      specAuthorReadiness: 20
    };
    const totalScore = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
    return {
      categoryScores,
      totalScore,
      normalizedMinimum: Math.min(...Object.values(categoryScores).map(score => score / 2)),
      acceptable: checkSummary.fail === 0,
      outstanding: checkSummary.fail === 0
    };
  }
  const categoryScores = {
    upstreamCoverageAndFreshness: checkSummary.fail === 0 ? 20 : 0,
    processSpecificity: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.processSpecificity), 20),
    stateRuleCompleteness: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.stateRuleCompleteness), 20),
    recoveryEdgeCoverage: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.recoveryEdgeCoverage), 20),
    specAuthorReadiness: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.specAuthorReadiness), 20)
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
      normalizedMinimum >= 9 &&
      rowReceipts.every(receipt => receipt.acceptabilityGate.outstanding),
    outstanding: checkSummary.fail === 0 &&
      rowReceipts.every(receipt => receipt.acceptabilityGate.outstanding) &&
      totalScore === 100 &&
      normalizedMinimum === 10
  };
}

function mergeProcessActionMapRowsForRefresh({ packRows, existingProcessRows, packArtifactFingerprint = null }) {
  const active = activeContextPackRows(packRows);
  const activeById = new Map(active.map(row => [row.packId, row]));
  const covered = new Set();
  const changed = [];
  const removed = [];
  const output = [];

  for (const row of existingProcessRows) {
    const packRow = activeById.get(row.upstreamPackId);
    if (!packRow) {
      removed.push(row.processMapId);
      continue;
    }
    const stale = row.upstreamPackRef?.packRowFingerprint !== contextPackRowFingerprint(packRow);
    if (stale) {
      changed.push(row.upstreamPackId);
      output.push(createPendingProcessActionMapRow(packRow, packArtifactFingerprint));
      continue;
    }
    covered.add(row.upstreamPackId);
    output.push(row);
  }

  for (const packRow of active) {
    if (covered.has(packRow.packId) || changed.includes(packRow.packId)) continue;
    changed.push(packRow.packId);
    output.push(createPendingProcessActionMapRow(packRow, packArtifactFingerprint));
  }

  output.sort(compareProcessActionMapRows);
  return { rows: output, changed: [...new Set(changed)], removed };
}

export {
  ACTIVE_CONTEXT_PACK_STATUSES,
  READY_FOR_SPECS_STATUS,
  VALID_PROCESS_ACTION_MAP_STATUSES,
  appendRunLogEvent,
  aggregateProcessActionMapEval,
  buildProcessActionMapPayload,
  buildProcessActionMapReportState,
  compareProcessActionMapRows,
  createAgentMarkedProcessActionMapRow,
  createInitialProcessActionMapRows,
  createPendingProcessActionMapRow,
  defaultBackfillDir,
  ensureDir,
  markProcessActionMapRows,
  mergeProcessActionMapRowsForRefresh,
  nextProcessActionMapTarget,
  parseCliArgs,
  parseIds,
  processActionMapArtifactFingerprint,
  processActionMapCheckPathFor,
  processActionMapEvalReceiptPathFor,
  processActionMapPathFor,
  processActionMapRowFingerprint,
  processActionMapRefreshPathFor,
  processActionMapSummaryPathFor,
  processActionMapRowOutstandingState,
  readContextPackRows,
  readProcessActionMapEvalRows,
  readJson,
  readJsonl,
  readProcessActionMapRows,
  renderResultsText,
  scoreProcessActionMapRow,
  selectProcessActionMapEvalSample,
  summarizeResults,
  upstreamPackRef,
  unresolvedProcessActionMapRowsForFill,
  validateContextPackHandoff,
  validateProcessActionMap,
  validateProcessActionMapRows,
  writeJson,
  writeJsonl
};
