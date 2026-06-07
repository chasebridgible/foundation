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
  READY_FOR_SPECS_STATUS,
  processActionMapArtifactFingerprint,
  processActionMapCheckPathFor,
  processActionMapEvalReceiptPathFor,
  processActionMapPathFor,
  processActionMapRowFingerprint,
  processActionMapRowOutstandingState,
  processActionMapSummaryPathFor,
  readProcessActionMapEvalRows,
  readProcessActionMapRows,
  validateProcessActionMap
} from "./process-action-map-core.mjs";

const READY_FOR_SLICE_EVAL_STATUS = "ready-for-slice-eval";
const VALID_AUTHOR_SPEC_STATUSES = new Set([
  "pending",
  "authored",
  "needs-revision",
  READY_FOR_SLICE_EVAL_STATUS,
  "blocked"
]);
const VALID_CONFIDENCE = new Set(["low", "medium", "high"]);
const VALID_REVIEW_FLAG_SEVERITY = new Set(["info", "warning", "blocking"]);
const ACTIVE_PROCESS_STATUSES = new Set([READY_FOR_SPECS_STATUS, "needs-evidence"]);
const AUTHOR_ROW_SCHEMA = "foundation.backfill.author-specs-row.v1";
const AUTHOR_EVAL_SCHEMA = "foundation.backfill.author-specs-eval.v1";
const PLACEHOLDER_PATTERNS = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bplaceholder\b/i,
  /\blorem ipsum\b/i,
  /\[[^\]]+\]/,
  /\bas needed\b/i,
  /\bvarious\b/i,
  /\bappropriate\b/i
];

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

function authorSpecsPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `author-specs-${runId}.jsonl`);
}

function authorSpecsCheckPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `author-specs-check-${runId}.json`);
}

function authorSpecsEvalReceiptPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `author-specs-eval-${runId}.jsonl`);
}

function authorSpecsSummaryPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `author-specs-summary-${runId}.html`);
}

function authorSpecsRefreshPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `author-specs-refresh-${runId}.json`);
}

function authorSpecsArtifactFingerprint(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return fileFingerprint(authorSpecsPathFor(repoRoot, runId, outDir));
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

function normalizeRepoPath(value) {
  return value.split(path.sep).join("/");
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 54);
}

function stableAuthorSpecId(processMapId, ordinal = 1) {
  const semantic = `${processMapId}:${ordinal}`;
  return `as-${slug(processMapId || "author-specs")}-${sha256Text(semantic).slice(0, 12)}`;
}

function hasBlockingDetail(row) {
  return normalizeStringList(row?.blockingQuestions).length > 0 ||
    normalizeStringList(row?.blockingGaps).length > 0 ||
    normalizeStringList(row?.humanDecisions).length > 0;
}

function rowHasBlockingFlag(row) {
  return Array.isArray(row?.reviewFlags) && row.reviewFlags.some(flag => flag.severity === "blocking");
}

function isReadyProcessRow(row) {
  return row?.status === READY_FOR_SPECS_STATUS ||
    (row?.status === "needs-evidence" && hasBlockingDetail(row));
}

function normalizeReviewFlags(value) {
  return asObjectArray(value).map(flag => ({
    severity: VALID_REVIEW_FLAG_SEVERITY.has(flag.severity) ? flag.severity : "warning",
    reason: isNonEmptyString(flag.reason) ? flag.reason.trim() : "Author Specs row needs review.",
    evidence: isNonEmptyString(flag.evidence) ? flag.evidence.trim() : "",
    nextAction: isNonEmptyString(flag.nextAction) ? flag.nextAction.trim() : "Revise this Author Specs target."
  }));
}

function normalizeEvidenceRefs(value) {
  return asObjectArray(value).map(ref => ({
    category: normalizeNullableString(ref.category || ref.kind || ref.type) || "process-action-map",
    relationship: normalizeNullableString(ref.relationship),
    packId: normalizeNullableString(ref.packId || ref.upstreamPackId),
    sliceId: normalizeNullableString(ref.sliceId || ref.upstreamSliceId),
    processMapId: normalizeNullableString(ref.processMapId || ref.upstreamProcessMapId),
    capabilityId: normalizeNullableString(ref.capabilityId),
    surfaceId: normalizeNullableString(ref.surfaceId),
    fileId: normalizeNullableString(ref.fileId),
    path: normalizeNullableString(ref.path),
    lineRange: normalizeNullableString(ref.lineRange || ref.lines),
    symbol: normalizeNullableString(ref.symbol),
    snippet: normalizeNullableString(ref.snippet || ref.excerpt),
    detail: normalizeNullableString(ref.detail || ref.evidence) || "",
    questionAnswered: normalizeNullableString(ref.questionAnswered || ref.why) || ""
  }));
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

function processSummary(processRow) {
  return {
    actor: processRow.actor || "",
    role: processRow.role || "",
    trigger: processRow.trigger || "",
    intendedOutcome: processRow.intendedOutcome || "",
    domainObject: processRow.domainObject || "",
    actions: normalizeStringList(processRow.actions),
    states: normalizeStringList(processRow.stateModel?.states),
    transitions: normalizeStringList(processRow.stateModel?.transitions),
    rules: normalizeStringList(processRow.rules),
    permissions: normalizeStringList(processRow.permissions),
    visibleBehavior: normalizeStringList(processRow.visibleBehavior),
    edgeCases: normalizeStringList(processRow.edgeCases),
    recoveryPaths: normalizeStringList(processRow.recoveryPaths)
  };
}

function upstreamProcessRef(processRow, processMapFingerprint = null) {
  return {
    processMapId: processRow.processMapId,
    upstreamPackId: processRow.upstreamPackId,
    upstreamSliceId: processRow.upstreamSliceId,
    status: processRow.status,
    processMapFingerprint,
    processRowFingerprint: processActionMapRowFingerprint(processRow)
  };
}

function createTraceEvidenceRefs(processRow) {
  return [
    {
      category: "process-action-map",
      relationship: "upstream-process-row",
      processMapId: processRow.processMapId,
      packId: processRow.upstreamPackId,
      sliceId: processRow.upstreamSliceId,
      detail: `Author Specs target is derived from Process / Action Map row ${processRow.processMapId} for slice ${processRow.upstreamSliceId}.`,
      questionAnswered: "Which reviewed process row defines this spec-authoring target?"
    },
    ...normalizeStringList(processRow.upstreamCapabilityIds).map(capabilityId => ({
      category: "capability",
      relationship: "upstream-capability",
      capabilityId,
      detail: `Author Specs target preserves upstream capability ${capabilityId} from the Process / Action Map row.`,
      questionAnswered: "Which capability must the authored specs preserve?"
    }))
  ];
}

function createPendingAuthorSpecRow(processRow, processMapFingerprint = null, ordinal = 1) {
  const now = nowIso();
  const blocked = processRow.status === "needs-evidence" && hasBlockingDetail(processRow);
  const specTargets = normalizeSpecTargets(processRow.specTargets);
  return {
    schema: AUTHOR_ROW_SCHEMA,
    runId: processRow.runId,
    authorSpecId: stableAuthorSpecId(processRow.processMapId, ordinal),
    upstreamProcessMapId: processRow.processMapId,
    upstreamProcessRef: upstreamProcessRef(processRow, processMapFingerprint),
    upstreamPackId: processRow.upstreamPackId,
    upstreamSliceId: processRow.upstreamSliceId,
    upstreamCapabilityIds: normalizeStringList(processRow.upstreamCapabilityIds),
    capabilityRefs: asObjectArray(processRow.capabilityRefs),
    processSummary: processSummary(processRow),
    specTargets,
    jobSpecId: specTargets.jobSpecId,
    technicalSpecId: specTargets.technicalSpecId,
    jobSpecPath: null,
    technicalSpecPath: null,
    renderedUxRequired: normalizeStringList(processRow.visibleBehavior).length > 0,
    renderedUxStatus: normalizeStringList(processRow.visibleBehavior).length > 0 ? "required" : "nonvisual-or-not-required",
    evidenceRefs: [...createTraceEvidenceRefs(processRow), ...normalizeEvidenceRefs(processRow.evidenceRefs)],
    explicitGaps: normalizeStringList(processRow.explicitGaps),
    blockingQuestions: blocked ? normalizeStringList(processRow.blockingQuestions) : [],
    blockingGaps: blocked ? normalizeStringList(processRow.blockingGaps) : [],
    humanDecisions: blocked ? normalizeStringList(processRow.humanDecisions) : [],
    reviewFlags: [],
    status: blocked ? "blocked" : "pending",
    confidence: blocked ? "medium" : "low",
    createdAt: now,
    updatedAt: now
  };
}

function activeProcessRows(processRows) {
  return processRows.filter(isReadyProcessRow);
}

function createInitialAuthorSpecRows(processRows, processMapFingerprint = null) {
  return activeProcessRows(processRows)
    .map((row, index) => createPendingAuthorSpecRow(row, processMapFingerprint, index + 1))
    .sort(compareAuthorSpecRows);
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

function resolveRepoFile(repoRoot, filePath) {
  if (!isNonEmptyString(filePath)) throw new Error("Spec path is required");
  const resolved = path.resolve(repoRoot, filePath);
  const normalizedRoot = path.resolve(repoRoot);
  if (resolved !== normalizedRoot && !resolved.startsWith(`${normalizedRoot}${path.sep}`)) {
    throw new Error(`Spec path must stay inside the target repo: ${filePath}`);
  }
  return {
    absolutePath: resolved,
    relativePath: normalizeRepoPath(path.relative(repoRoot, resolved))
  };
}

function countCanonicalSections(html) {
  return (html.match(/\bdata-spec-canonical=["']true["']/g) || []).length;
}

function sectionIds(html) {
  return [...html.matchAll(/<section\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi)].map(match => match[1]);
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function readSpecDocument(repoRoot, specPath) {
  if (!isNonEmptyString(specPath)) {
    return { exists: false, absolutePath: null, relativePath: null, metadata: null, graph: null, html: "", text: "", sections: [], canonicalCount: 0 };
  }
  const resolved = resolveRepoFile(repoRoot, specPath);
  if (!fs.existsSync(resolved.absolutePath)) {
    return { exists: false, ...resolved, metadata: null, graph: null, html: "", text: "", sections: [], canonicalCount: 0 };
  }
  const html = fs.readFileSync(resolved.absolutePath, "utf8");
  return {
    exists: true,
    ...resolved,
    metadata: parseJsonScript(html, "spec-metadata"),
    graph: parseJsonScript(html, "graph-metadata"),
    html,
    text: visibleText(html),
    sections: sectionIds(html),
    canonicalCount: countCanonicalSections(html)
  };
}

function metadataOwnsPath(metadata, repoRoot, relativePath) {
  const repoName = path.basename(repoRoot);
  const candidates = new Set([relativePath, `${repoName}/${relativePath}`]);
  return asObjectArray(metadata?.ownedPaths).some(ref => candidates.has(ref.path));
}

function specHasText(doc, terms) {
  const haystack = doc.text.toLowerCase();
  return terms.every(term => haystack.includes(term.toLowerCase()));
}

function hasAnyText(doc, terms) {
  const haystack = doc.text.toLowerCase();
  return terms.some(term => haystack.includes(term.toLowerCase()));
}

function hasPlaceholderText(doc) {
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(doc.text));
}

function validateSpecDocument({ repoRoot, row, doc, expectedType, expectedId, role, results, prefix }) {
  if (!doc.exists) {
    results.push(fail(`${prefix}:${role}:exists`, `${role} spec path must exist`, { path: doc.relativePath }));
    return;
  }
  if (!doc.metadata) {
    results.push(fail(`${prefix}:${role}:metadata`, `${role} spec requires spec-metadata JSON`));
    return;
  }
  if (doc.metadata.type !== expectedType) {
    results.push(fail(`${prefix}:${role}:type`, `${role} spec metadata.type must be ${expectedType}`, { actual: doc.metadata.type }));
  }
  if (!["draft", "active"].includes(doc.metadata.status)) {
    results.push(fail(`${prefix}:${role}:status`, `${role} spec status must be draft or active`, { actual: doc.metadata.status }));
  }
  if (expectedId && doc.metadata.id !== expectedId) {
    results.push(fail(`${prefix}:${role}:id-alignment`, `${role} spec ID must match Author Specs row`, { expected: expectedId, actual: doc.metadata.id }));
  }
  if (path.basename(repoRoot) !== "foundation" && doc.metadata.id?.startsWith("foundation.")) {
    results.push(fail(`${prefix}:${role}:target-owned-id`, `${role} spec ID must be target-owned, not foundation-owned`, { id: doc.metadata.id }));
  }
  if (doc.canonicalCount !== 1) {
    results.push(fail(`${prefix}:${role}:canonical-section`, `${role} spec must have exactly one canonical section`, { canonicalCount: doc.canonicalCount }));
  }
  if (!doc.graph || doc.graph.ownerSpecId !== doc.metadata.id) {
    results.push(fail(`${prefix}:${role}:graph-metadata`, `${role} spec graph-metadata.ownerSpecId must match spec ID`, { ownerSpecId: doc.graph?.ownerSpecId || null, specId: doc.metadata.id }));
  }
  if (!metadataOwnsPath(doc.metadata, repoRoot, doc.relativePath)) {
    results.push(fail(`${prefix}:${role}:owned-path`, `${role} spec metadata.ownedPaths must include the spec path`, { path: doc.relativePath }));
  }
  if (hasPlaceholderText(doc)) {
    results.push(fail(`${prefix}:${role}:placeholder-text`, `${role} spec must not contain placeholders, TODO/TBD text, or vague filler`));
  }
  if (role === "job") {
    const requiredTerms = ["actor", "outcome", "domain object", "actions", "states", "rules", "edge cases", "recovery", "evidence"];
    if (!specHasText(doc, requiredTerms)) {
      results.push(fail(`${prefix}:job:required-language`, "Job spec must explicitly cover actor, outcome, domain object, actions, states, rules, edge cases, recovery, and evidence", { missingTerms: requiredTerms.filter(term => !doc.text.toLowerCase().includes(term)) }));
    }
    if (!hasAnyText(doc, ["rendered ux", "visible behavior", "operator behavior", "nonvisual"])) {
      results.push(fail(`${prefix}:job:ux-boundary`, "Job spec must name rendered UX, visible/operator behavior, or explain the slice is nonvisual"));
    }
  }
  if (role === "technical") {
    const requiredTerms = ["required contract", "current evidence", "architecture constraint", "implementation latitude", "failure", "recovery", "observability", "verification"];
    if (!specHasText(doc, requiredTerms)) {
      results.push(fail(`${prefix}:technical:required-language`, "Technical spec must separate required contracts, current evidence, architecture constraints, implementation latitude, failures/recovery, observability, and verification", { missingTerms: requiredTerms.filter(term => !doc.text.toLowerCase().includes(term)) }));
    }
    if (!hasAnyText(doc, ["data model", "api", "route", "service", "job", "queue", "event", "command", "schema"])) {
      results.push(fail(`${prefix}:technical:contract-surface`, "Technical spec must name at least one contract surface such as data model, API, route, service, job, queue, event, command, or schema"));
    }
  }
  const traceText = `${doc.html}\n${doc.text}`.toLowerCase();
  if (!traceText.includes(String(row.upstreamProcessMapId || "").toLowerCase()) &&
      !traceText.includes(String(row.upstreamSliceId || "").toLowerCase())) {
    results.push(fail(`${prefix}:${role}:upstream-trace`, `${role} spec must cite the upstream Process / Action Map ID or slice ID`, {
      upstreamProcessMapId: row.upstreamProcessMapId,
      upstreamSliceId: row.upstreamSliceId
    }));
  }
}

function compareAuthorSpecRows(left, right) {
  const statusRank = {
    pending: 0,
    "needs-revision": 1,
    authored: 2,
    [READY_FOR_SLICE_EVAL_STATUS]: 3,
    blocked: 4
  };
  const leftKey = `${statusRank[left.status] ?? 9}:${left.upstreamSliceId || ""}:${left.authorSpecId || ""}`;
  const rightKey = `${statusRank[right.status] ?? 9}:${right.upstreamSliceId || ""}:${right.authorSpecId || ""}`;
  return leftKey.localeCompare(rightKey);
}

function readEvalSummary(receiptPath) {
  if (!fs.existsSync(receiptPath)) return null;
  const parsed = readJsonl(receiptPath);
  return parsed.rows.find(row => row.receiptType === "summary") || null;
}

function readAuthorSpecsRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const authorSpecsPath = authorSpecsPathFor(repoRoot, runId, outDir);
  const parsed = readJsonl(authorSpecsPath);
  return { authorSpecsPath, ...parsed };
}

function readAuthorSpecsEvalRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const receiptPath = authorSpecsEvalReceiptPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(receiptPath)) return { receiptPath, rows: [], errors: [] };
  return { receiptPath, ...readJsonl(receiptPath) };
}

function authorSpecRowFingerprint(row) {
  return `sha256:${sha256Text(JSON.stringify(row))}`;
}

function latestAuthorSpecRowReceipts(evalRows) {
  const latest = new Map();
  for (const receipt of Array.isArray(evalRows) ? evalRows : []) {
    if (receipt?.receiptType !== "row" || !isNonEmptyString(receipt.subjectRowId)) continue;
    latest.set(receipt.subjectRowId, receipt);
  }
  return latest;
}

function isOutstandingAuthorSpecReceipt(row, receipt) {
  if (!row || !receipt) return false;
  const findings = Array.isArray(receipt.findings) ? receipt.findings : [];
  return receipt.receiptType === "row" &&
    receipt.subjectRowId === row.authorSpecId &&
    receipt.authorRowFingerprint === authorSpecRowFingerprint(row) &&
    receipt.acceptabilityGate?.outstanding === true &&
    findings.every(finding => finding?.severity !== "blocking" && finding?.severity !== "warning");
}

function authorSpecRowOutstandingState(authorRows, evalRows) {
  const latest = latestAuthorSpecRowReceipts(evalRows);
  const outstanding = [];
  const missing = [];
  for (const row of authorRows) {
    if (row?.status === "pending") continue;
    const receipt = latest.get(row.authorSpecId);
    if (isOutstandingAuthorSpecReceipt(row, receipt)) {
      outstanding.push(row.authorSpecId);
    } else {
      missing.push(row.authorSpecId);
    }
  }
  return { outstanding, missing };
}

function unresolvedAuthorSpecRowsForFill({ authorRows, evalRows, selectedProcessMapId }) {
  const state = authorSpecRowOutstandingState(authorRows, evalRows);
  const missing = new Set(state.missing);
  return authorRows
    .filter(row => row?.status !== "pending" && row?.upstreamProcessMapId !== selectedProcessMapId && missing.has(row.authorSpecId))
    .map(row => ({
      authorSpecId: row.authorSpecId,
      upstreamProcessMapId: row.upstreamProcessMapId,
      status: row.status
    }));
}

function nextAuthorSpecTarget({ processRows, authorRows, evalRows = [] }) {
  const processById = new Map(processRows.map(row => [row.processMapId, row]));
  const outstandingState = authorSpecRowOutstandingState(authorRows, evalRows);
  const missingOutstanding = new Set(outstandingState.missing);
  const candidates = authorRows
    .filter(row => row.status === "pending" ||
      row.status === "authored" ||
      row.status === "needs-revision" ||
      rowHasBlockingFlag(row) ||
      missingOutstanding.has(row.authorSpecId))
    .sort((left, right) => {
      const rank = row => rowHasBlockingFlag(row) ? 0 :
        missingOutstanding.has(row.authorSpecId) ? 1 :
          row.status === "needs-revision" ? 2 :
            row.status === "authored" ? 3 : 4;
      const leftRank = rank(left);
      const rightRank = rank(right);
      if (leftRank !== rightRank) return leftRank - rightRank;
      return compareAuthorSpecRows(left, right);
    });
  const target = candidates[0] || null;
  if (!target) return null;
  const processRow = processById.get(target.upstreamProcessMapId);
  return {
    authorSpecId: target.authorSpecId,
    status: target.status,
    upstreamProcessMapId: target.upstreamProcessMapId,
    upstreamPackId: target.upstreamPackId,
    upstreamSliceId: target.upstreamSliceId,
    upstreamCapabilityIds: target.upstreamCapabilityIds || [],
    actor: processRow?.actor || target.processSummary?.actor || null,
    intendedOutcome: processRow?.intendedOutcome || target.processSummary?.intendedOutcome || null,
    domainObject: processRow?.domainObject || target.processSummary?.domainObject || null,
    actionCount: Array.isArray(processRow?.actions) ? processRow.actions.length : target.processSummary?.actions?.length || 0,
    stateCount: Array.isArray(processRow?.stateModel?.states) ? processRow.stateModel.states.length : target.processSummary?.states?.length || 0,
    renderedUxRequired: target.renderedUxRequired,
    jobSpecId: target.jobSpecId,
    technicalSpecId: target.technicalSpecId,
    jobSpecPath: target.jobSpecPath,
    technicalSpecPath: target.technicalSpecPath,
    blocked: target.status === "blocked",
    outstandingEvalMissing: missingOutstanding.has(target.authorSpecId),
    blockingGaps: target.blockingGaps || [],
    reviewFlags: target.reviewFlags || []
  };
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

function validateAuthorSpecRowShape({ repoRoot, row, prefix, results, phase }) {
  if (row?.schema !== AUTHOR_ROW_SCHEMA) results.push(fail(`${prefix}:schema`, "Author Specs row schema is invalid", { schema: row?.schema }));
  if (!isNonEmptyString(row?.runId)) results.push(fail(`${prefix}:run-id`, "Author Specs row requires runId"));
  if (!isNonEmptyString(row?.authorSpecId)) results.push(fail(`${prefix}:author-spec-id`, "Author Specs row requires authorSpecId"));
  if (!isNonEmptyString(row?.upstreamProcessMapId)) results.push(fail(`${prefix}:upstream-process-map-id`, "Author Specs row requires upstreamProcessMapId"));
  if (!isNonEmptyString(row?.upstreamPackId)) results.push(fail(`${prefix}:upstream-pack-id`, "Author Specs row requires upstreamPackId"));
  if (!isNonEmptyString(row?.upstreamSliceId)) results.push(fail(`${prefix}:upstream-slice-id`, "Author Specs row requires upstreamSliceId"));
  if (!VALID_AUTHOR_SPEC_STATUSES.has(row?.status)) results.push(fail(`${prefix}:status`, "Author Specs status is outside enum", { status: row?.status }));
  if (!VALID_CONFIDENCE.has(row?.confidence)) results.push(fail(`${prefix}:confidence`, "Author Specs confidence is outside enum", { confidence: row?.confidence }));
  for (const field of ["upstreamCapabilityIds", "capabilityRefs", "evidenceRefs", "explicitGaps", "blockingQuestions", "blockingGaps", "humanDecisions", "reviewFlags"]) {
    if (!Array.isArray(row?.[field])) results.push(fail(`${prefix}:${field}`, `${field} must be an array`));
  }
  if (!row?.upstreamProcessRef || typeof row.upstreamProcessRef !== "object" || Array.isArray(row.upstreamProcessRef)) {
    results.push(fail(`${prefix}:upstream-process-ref`, "upstreamProcessRef must be an object"));
  }
  if (!row?.processSummary || typeof row.processSummary !== "object" || Array.isArray(row.processSummary)) {
    results.push(fail(`${prefix}:process-summary`, "processSummary must be an object"));
  }
  if (!row?.specTargets || typeof row.specTargets !== "object" || Array.isArray(row.specTargets)) {
    results.push(fail(`${prefix}:spec-targets`, "specTargets must be an object"));
  }
  validateReviewFlags(row, prefix, results);
  if (row?.status === "blocked") {
    if (!hasBlockingDetail(row)) results.push(fail(`${prefix}:blocked-detail`, "Blocked Author Specs rows require blockingQuestions, blockingGaps, or humanDecisions"));
    return;
  }
  if (row?.status !== "pending") {
    if (!isNonEmptyString(row?.jobSpecPath)) results.push(fail(`${prefix}:job-spec-path`, "Authored Author Specs rows require jobSpecPath"));
    if (!isNonEmptyString(row?.technicalSpecPath)) results.push(fail(`${prefix}:technical-spec-path`, "Authored Author Specs rows require technicalSpecPath"));
    if (!isNonEmptyString(row?.jobSpecId)) results.push(fail(`${prefix}:job-spec-id`, "Authored Author Specs rows require jobSpecId"));
    if (!isNonEmptyString(row?.technicalSpecId)) results.push(fail(`${prefix}:technical-spec-id`, "Authored Author Specs rows require technicalSpecId"));
    const jobDoc = readSpecDocument(repoRoot, row.jobSpecPath);
    const technicalDoc = readSpecDocument(repoRoot, row.technicalSpecPath);
    validateSpecDocument({ repoRoot, row, doc: jobDoc, expectedType: "job", expectedId: row.jobSpecId, role: "job", results, prefix });
    validateSpecDocument({ repoRoot, row, doc: technicalDoc, expectedType: "technical", expectedId: row.technicalSpecId, role: "technical", results, prefix });
  }
  if (phase === "handoff" && (row?.status === "pending" || row?.status === "authored" || row?.status === "needs-revision")) {
    results.push(fail(`${prefix}:non-terminal-handoff`, "Handoff requires no pending, authored, or needs-revision Author Specs rows", { status: row?.status }));
  }
  if ((row?.status === READY_FOR_SLICE_EVAL_STATUS || row?.status === "authored") && rowHasBlockingFlag(row)) {
    results.push(fail(`${prefix}:blocking-flags`, "Authored or ready Author Specs rows cannot carry blocking review flags"));
  }
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

function validateAuthorSpecsRows({ repoRoot, processRows, authorRows, phase = "handoff" }) {
  const results = [];
  const activeProcesses = activeProcessRows(processRows);
  const processById = new Map(processRows.map(row => [row.processMapId, row]));
  const rowsByProcess = new Map();
  const stale = [];
  const pending = [];
  const authored = [];
  const needsRevision = [];
  const blockedWithoutDetail = [];

  results.push(validateUnique(authorRows, "authorSpecId", "author-specs"));
  results.push(validateUnique(authorRows, "upstreamProcessMapId", "author-specs"));

  for (const [index, row] of authorRows.entries()) {
    const prefix = `author-specs:${row?.authorSpecId || index + 1}`;
    validateAuthorSpecRowShape({ repoRoot, row, prefix, results, phase });
    if (isNonEmptyString(row?.upstreamProcessMapId)) {
      if (!rowsByProcess.has(row.upstreamProcessMapId)) rowsByProcess.set(row.upstreamProcessMapId, []);
      rowsByProcess.get(row.upstreamProcessMapId).push(row);
    }
    if (row.status === "pending") pending.push(row.authorSpecId);
    if (row.status === "authored") authored.push(row.authorSpecId);
    if (row.status === "needs-revision") needsRevision.push(row.authorSpecId);
    if (row.status === "blocked" && !hasBlockingDetail(row)) blockedWithoutDetail.push(row.authorSpecId);

    const processRow = processById.get(row.upstreamProcessMapId);
    if (!processRow) {
      results.push(fail(`${prefix}:upstream-process-resolves`, "Author Specs row references missing Process / Action Map row", { upstreamProcessMapId: row.upstreamProcessMapId }));
    } else {
      if (!ACTIVE_PROCESS_STATUSES.has(processRow.status)) {
        results.push(fail(`${prefix}:upstream-process-active`, "Author Specs row references Process / Action Map row that is not active for this layer", { status: processRow.status }));
      }
      if (row.upstreamProcessRef?.processRowFingerprint !== processActionMapRowFingerprint(processRow)) {
        stale.push({ authorSpecId: row.authorSpecId, upstreamProcessMapId: row.upstreamProcessMapId });
      }
      if (row.upstreamSliceId !== processRow.upstreamSliceId) {
        results.push(fail(`${prefix}:upstream-slice-alignment`, "upstreamSliceId must match Process / Action Map upstreamSliceId", { expected: processRow.upstreamSliceId, actual: row.upstreamSliceId }));
      }
      const missingCapabilities = normalizeStringList(processRow.upstreamCapabilityIds).filter(id => !normalizeStringList(row.upstreamCapabilityIds).includes(id));
      if (missingCapabilities.length > 0) results.push(fail(`${prefix}:upstream-capability-coverage`, "Author Specs row must carry every upstream capability ID from Process / Action Map", { missingCapabilities }));
      const missingCapabilityRefs = asObjectArray(processRow.capabilityRefs)
        .filter(ref => !asObjectArray(row.capabilityRefs).some(rowRef => rowRef.capabilityId === ref.capabilityId));
      if (missingCapabilityRefs.length > 0) results.push(fail(`${prefix}:capability-ref-coverage`, "Author Specs row must carry child/sole capabilityRefs from Process / Action Map", { missingCapabilityRefs: missingCapabilityRefs.map(ref => ref.capabilityId) }));
      const unqueueableRefs = asObjectArray(row.capabilityRefs)
        .filter(ref => ref.capabilityAltitude === "parent" || ref.capabilityAltitude === "needs-split" || ref.capabilityAltitude === "blocked" || ref.queueEligible === false);
      if (unqueueableRefs.length > 0) results.push(fail(`${prefix}:capability-ref-queue-eligible`, "Author Specs row cannot carry parent, needs-split, blocked, or non-queueEligible capability refs as active work", { unqueueableRefs: unqueueableRefs.map(ref => ref.capabilityId) }));
    }
    for (const [refIndex, ref] of asObjectArray(row.evidenceRefs).entries()) {
      const label = `${prefix}:evidence-refs:${refIndex + 1}`;
      if (!isNonEmptyString(ref.detail) || ref.detail.length < 20) results.push(fail(`${label}:detail`, "Evidence ref requires specific detail"));
    }
  }

  results.push(stale.length === 0
    ? pass("author-specs-upstream-fresh", "Author Specs upstream Process / Action Map fingerprints match")
    : fail("author-specs-upstream-fresh", "Author Specs rows must refresh when upstream Process / Action Map rows change", { stale }));

  const duplicateProcessRows = [...rowsByProcess.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([upstreamProcessMapId, rows]) => ({ upstreamProcessMapId, authorSpecIds: rows.map(row => row.authorSpecId) }));
  results.push(duplicateProcessRows.length === 0
    ? pass("author-specs-one-row-per-process", "Each Process / Action Map row has at most one Author Specs row")
    : fail("author-specs-one-row-per-process", "Each Process / Action Map row must have at most one Author Specs row", { duplicateProcessRows }));

  const uncovered = activeProcesses
    .filter(process => !rowsByProcess.has(process.processMapId))
    .map(process => ({ processMapId: process.processMapId, upstreamSliceId: process.upstreamSliceId, status: process.status }));
  if (uncovered.length === 0) {
    results.push(pass("author-specs-covers-active-processes", "Every active Process / Action Map row has Author Specs coverage"));
  } else if (phase === "handoff") {
    results.push(fail("author-specs-covers-active-processes", "Author Specs must cover every active Process / Action Map row before Slice Evaluation", { uncovered }));
  } else {
    results.push(warn("author-specs-covers-active-processes", `${uncovered.length} active process row(s) still need Author Specs coverage`, { uncovered }));
  }

  if (phase === "handoff") {
    results.push(pending.length === 0
      ? pass("handoff-no-pending-author-specs", "No pending Author Specs rows remain")
      : fail("handoff-no-pending-author-specs", "Handoff requires zero pending Author Specs rows", { pending }));
    results.push(authored.length === 0
      ? pass("handoff-no-authored-unevaluated-author-specs", "No authored-but-not-terminal Author Specs rows remain")
      : fail("handoff-no-authored-unevaluated-author-specs", "Handoff requires no authored Author Specs rows", { authored }));
    results.push(needsRevision.length === 0
      ? pass("handoff-no-needs-revision-author-specs", "No needs-revision Author Specs rows remain")
      : fail("handoff-no-needs-revision-author-specs", "Handoff requires no needs-revision Author Specs rows", { needsRevision }));
    results.push(blockedWithoutDetail.length === 0
      ? pass("handoff-blocked-author-specs-named", "Every blocked Author Specs row has explicit blocker detail")
      : fail("handoff-blocked-author-specs-named", "Blocked Author Specs rows require explicit blocker detail", { blockedWithoutDetail }));
  } else {
    results.push(warn("batch-pending-author-specs-allowed", `${pending.length} pending Author Specs row(s) remain in batch phase`, { pendingCount: pending.length }));
  }

  return results;
}

function readAuthorSpecsEvalSummary(repoRoot, runId, outDir) {
  return readEvalSummary(authorSpecsEvalReceiptPathFor(repoRoot, runId, outDir));
}

function validateAuthorSpecsEvalFreshness({ repoRoot, runId, outDir, authorRows, phase = "handoff" }) {
  if (phase !== "handoff") return [];
  const evalSummary = readAuthorSpecsEvalSummary(repoRoot, runId, outDir);
  if (!evalSummary) {
    return [fail("author-specs-eval-current", "Author Specs eval summary receipt is required before Slice Evaluation")];
  }
  const evalRows = readAuthorSpecsEvalRows(repoRoot, runId, outDir).rows;
  const rowOutstandingState = authorSpecRowOutstandingState(authorRows, evalRows);
  const currentFingerprint = authorSpecsArtifactFingerprint(repoRoot, runId, outDir);
  const expectedRowCount = authorRows.length;
  const actualRowCount = Number.isInteger(evalSummary.authorRowCount) ? evalSummary.authorRowCount : null;
  const fresh = Boolean(evalSummary.authorSpecsFingerprint) &&
    evalSummary.authorSpecsFingerprint === currentFingerprint &&
    actualRowCount === expectedRowCount;
  const results = fresh
    ? [pass("author-specs-eval-current", "Author Specs eval receipt matches current artifact")]
    : [fail("author-specs-eval-current", "Author Specs eval must regenerate after artifact changes", {
      expectedAuthorSpecsFingerprint: currentFingerprint,
      actualAuthorSpecsFingerprint: evalSummary.authorSpecsFingerprint || null,
      expectedRowCount,
      actualRowCount
    })];
  const revisionTargets = Array.isArray(evalSummary.revisionTargets) ? evalSummary.revisionTargets : [];
  results.push(revisionTargets.length === 0
    ? pass("author-specs-eval-revisions", "Author Specs eval has no revision targets")
    : fail("author-specs-eval-revisions", "Author Specs eval revision targets must be resolved before Slice Evaluation", { revisionTargets }));
  results.push(rowOutstandingState.missing.length === 0
    ? pass("author-specs-row-evals-outstanding", "Every non-pending Author Specs row has a current outstanding row-level eval receipt")
    : fail("author-specs-row-evals-outstanding", "Every non-pending Author Specs row requires a current outstanding row-level eval receipt before Slice Evaluation", { missing: rowOutstandingState.missing }));
  results.push(evalSummary.acceptabilityGate?.outstanding === true
    ? pass("author-specs-eval-outstanding", "Author Specs eval summary is outstanding")
    : fail("author-specs-eval-outstanding", "Author Specs handoff requires an outstanding summary eval gate"));
  return results;
}

function validateProcessActionMapHandoff(repoRoot, runId, outDir = defaultBackfillDir(repoRoot), reportPath = null) {
  const validation = validateProcessActionMap({ repoRoot, runId, outDir, phase: "handoff" });
  const results = [...validation.results];
  const processMapFingerprint = processActionMapArtifactFingerprint(repoRoot, runId, outDir);

  const checkPath = processActionMapCheckPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(checkPath)) {
    results.push(fail("upstream-process-action-map-check-artifact", "Passing Process / Action Map check artifact is required before Author Specs"));
  } else {
    const check = readJson(checkPath);
    const checkFresh = check?.processMapFingerprint === processMapFingerprint;
    results.push(check?.summary?.fail === 0 && checkFresh
      ? pass("upstream-process-action-map-check-artifact", "Process / Action Map check artifact passes and is current")
      : fail("upstream-process-action-map-check-artifact", "Process / Action Map check artifact must pass and match current fingerprint", {
        expectedProcessMapFingerprint: processMapFingerprint,
        actualProcessMapFingerprint: check?.processMapFingerprint || null,
        summary: check?.summary || null
      }));
  }

  const evalRows = readProcessActionMapEvalRows(repoRoot, runId, outDir).rows;
  const evalSummary = readEvalSummary(processActionMapEvalReceiptPathFor(repoRoot, runId, outDir));
  const rowOutstandingState = processActionMapRowOutstandingState(validation.processRows, evalRows);
  const evalFresh = Boolean(evalSummary?.processMapFingerprint) &&
    evalSummary.processMapFingerprint === processMapFingerprint &&
    evalSummary.processRowCount === validation.processRows.length;
  results.push(evalSummary?.acceptabilityGate?.outstanding === true && evalFresh && rowOutstandingState.missing.length === 0
    ? pass("upstream-process-action-map-eval", "Process / Action Map eval artifact is outstanding and current")
    : fail("upstream-process-action-map-eval", "Outstanding current Process / Action Map eval receipt is required before Author Specs", {
      expectedProcessMapFingerprint: processMapFingerprint,
      actualProcessMapFingerprint: evalSummary?.processMapFingerprint || null,
      missingOutstandingRows: rowOutstandingState.missing
    }));

  const summaryPath = processActionMapSummaryPathFor(repoRoot, runId, outDir);
  results.push(fs.existsSync(summaryPath)
    ? pass("upstream-process-action-map-eval-summary", "Process / Action Map HTML eval summary exists")
    : fail("upstream-process-action-map-eval-summary", "Process / Action Map HTML eval summary is required before Author Specs", { summaryPath: path.relative(repoRoot, summaryPath) }));

  if (reportPath) {
    if (!fs.existsSync(reportPath)) {
      results.push(fail("upstream-process-action-map-report-exists", "Process / Action Map report path does not exist", { reportPath }));
    } else {
      const state = parseJsonScript(fs.readFileSync(reportPath, "utf8"), "backfill-process-action-map-state");
      results.push(state?.nextLayer === "Author Specs"
        ? pass("upstream-process-action-map-report-handoff", "Process / Action Map report names Author Specs as next layer")
        : fail("upstream-process-action-map-report-handoff", "Process / Action Map report must name Author Specs as next layer", { nextLayer: state?.nextLayer || null }));
    }
    const hasReportFailure = results.some(result => result.status === "fail" && /^process-action-map-report-|^upstream-process-action-map-report-/.test(result.id));
    if (hasReportFailure) {
      const nextCommand = `npm run foundation:process-action-map:report -- --repo ${repoRoot} --run-id ${runId} --report ${path.relative(repoRoot, reportPath)}`;
      results.push(fail("upstream-process-action-map-report-refresh-required", `Refresh the Process / Action Map report before Author Specs init by running: ${nextCommand}`, {
        nextCommand
      }));
    }
  }

  return {
    processMapPath: validation.processMapPath,
    processRows: validation.processRows,
    results
  };
}

function validateAuthorSpecsReportState({ repoRoot, runId, outDir, reportPath, processRows, authorRows }) {
  if (!reportPath) return [];
  if (!fs.existsSync(reportPath)) return [fail("author-specs-report-exists", "Report path passed to checker does not exist", { reportPath })];
  const html = fs.readFileSync(reportPath, "utf8");
  const state = parseJsonScript(html, "backfill-author-specs-state");
  if (!state) return [fail("author-specs-report-state", "Report is missing backfill-author-specs-state JSON script")];
  const expected = buildAuthorSpecsReportState({ repoRoot, runId, outDir, processRows, authorRows });
  const drift = [];
  for (const [field, value] of Object.entries(expected)) {
    if (field === "generatedAt" || field === "latestRunLogSequence") continue;
    if (state[field] !== value) drift.push({ field, expected: value, actual: state[field] });
  }
  return drift.length === 0
    ? [pass("author-specs-report-state-current", "Author Specs report state matches canonical artifacts")]
    : [fail("author-specs-report-state-current", "Author Specs report state must match canonical artifacts", { drift })];
}

function validateAuthorSpecs({ repoRoot, runId, outDir = defaultBackfillDir(repoRoot), phase = "handoff", reportPath = null, skipEvalFreshness = false }) {
  const upstream = validateProcessActionMapHandoff(repoRoot, runId, outDir);
  const results = [...upstream.results];
  const authorSpecsPath = authorSpecsPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(authorSpecsPath)) {
    return {
      authorSpecsPath,
      processMapPath: upstream.processMapPath,
      processRows: upstream.processRows,
      authorRows: [],
      results: [...results, fail("author-specs-exists", `Author Specs artifact does not exist: ${authorSpecsPath}`)]
    };
  }
  const parsed = readJsonl(authorSpecsPath);
  results.push(pass("author-specs-exists", "Author Specs artifact exists"));
  if (parsed.errors.length > 0) {
    results.push(...parsed.errors.map(error => fail(`author-specs-jsonl:${error.line}`, "Author Specs JSONL line must parse", error)));
    return {
      authorSpecsPath,
      processMapPath: upstream.processMapPath,
      processRows: upstream.processRows,
      authorRows: parsed.rows,
      results
    };
  }
  results.push(pass("author-specs-jsonl", "Every Author Specs line parses as JSON"));
  results.push(...validateAuthorSpecsRows({ repoRoot, processRows: upstream.processRows, authorRows: parsed.rows, phase }));
  if (!skipEvalFreshness) {
    results.push(...validateAuthorSpecsEvalFreshness({ repoRoot, runId, outDir, authorRows: parsed.rows, phase }));
  }
  results.push(...validateAuthorSpecsReportState({ repoRoot, runId, outDir, reportPath, processRows: upstream.processRows, authorRows: parsed.rows }));
  return {
    authorSpecsPath,
    processMapPath: upstream.processMapPath,
    processRows: upstream.processRows,
    authorRows: parsed.rows,
    results
  };
}

function markAuthorSpecRow({ repoRoot, processRows, authorRows, evalRows = [], processMapId, jobSpecPath, technicalSpecPath, status, renderedUxStatus, reviewFlags = [] }) {
  const selectedProcessMapIds = parseIds(processMapId);
  if (selectedProcessMapIds.length !== 1) {
    throw new Error("Author Specs fill requires exactly one --process-map-id");
  }
  const selectedProcessMapId = selectedProcessMapIds[0];
  const processById = new Map(processRows.map(row => [row.processMapId, row]));
  const processRow = processById.get(selectedProcessMapId);
  if (!processRow) throw new Error(`Unknown Process / Action Map row: ${selectedProcessMapId}`);
  if (!isReadyProcessRow(processRow)) throw new Error(`Process / Action Map row is not active for Author Specs: ${selectedProcessMapId}`);

  const currentTarget = nextAuthorSpecTarget({ processRows, authorRows, evalRows });
  if (!currentTarget) {
    throw new Error("Author Specs fill has no current --next target; run handoff check/eval/report instead of filling another row");
  }
  if (currentTarget.upstreamProcessMapId !== selectedProcessMapId) {
    throw new Error(`Author Specs fill must use the current --next target ${currentTarget.upstreamProcessMapId}; received ${selectedProcessMapId}`);
  }
  if (currentTarget.blocked) {
    throw new Error(`Author Specs target ${currentTarget.authorSpecId} is blocked by upstream evidence gaps; run check/eval for the blocked row or resolve the upstream Process / Action Map blocker`);
  }
  const unresolved = unresolvedAuthorSpecRowsForFill({ authorRows, evalRows, selectedProcessMapId });
  if (unresolved.length > 0) {
    throw new Error(`Author Specs fill must finish the current row before selecting another Process / Action Map row: ${unresolved.map(row => row.authorSpecId).join(", ")}`);
  }

  const jobDoc = readSpecDocument(repoRoot, jobSpecPath);
  const technicalDoc = readSpecDocument(repoRoot, technicalSpecPath);
  if (!jobDoc.exists) throw new Error(`Job spec path does not exist: ${jobSpecPath}`);
  if (!technicalDoc.exists) throw new Error(`Technical spec path does not exist: ${technicalSpecPath}`);
  if (!jobDoc.metadata?.id) throw new Error(`Job spec is missing spec-metadata.id: ${jobSpecPath}`);
  if (!technicalDoc.metadata?.id) throw new Error(`Technical spec is missing spec-metadata.id: ${technicalSpecPath}`);
  if (jobDoc.metadata.type !== "job") throw new Error(`Job spec metadata.type must be job: ${jobSpecPath}`);
  if (technicalDoc.metadata.type !== "technical") throw new Error(`Technical spec metadata.type must be technical: ${technicalSpecPath}`);

  const existingRow = authorRows.find(row => row.upstreamProcessMapId === selectedProcessMapId);
  if (!existingRow) throw new Error(`Author Specs artifact has no row for Process / Action Map row: ${selectedProcessMapId}`);
  const normalizedFlags = normalizeReviewFlags(reviewFlags);
  const hasBlockingFlag = normalizedFlags.some(flag => flag.severity === "blocking");
  const statusFromOptions = normalizeNullableString(status);
  const nextStatus = statusFromOptions && VALID_AUTHOR_SPEC_STATUSES.has(statusFromOptions)
    ? statusFromOptions
    : (hasBlockingFlag ? "needs-revision" : READY_FOR_SLICE_EVAL_STATUS);
  if (nextStatus === "blocked") throw new Error("Author Specs fill cannot mark a row blocked; blockers come from upstream Process / Action Map rows");
  const nextRow = {
    ...existingRow,
    upstreamProcessRef: upstreamProcessRef(processRow, existingRow.upstreamProcessRef?.processMapFingerprint || null),
    processSummary: processSummary(processRow),
    jobSpecId: jobDoc.metadata.id,
    technicalSpecId: technicalDoc.metadata.id,
    jobSpecPath: jobDoc.relativePath,
    technicalSpecPath: technicalDoc.relativePath,
    renderedUxStatus: normalizeNullableString(renderedUxStatus) || existingRow.renderedUxStatus,
    reviewFlags: normalizedFlags,
    status: nextStatus,
    confidence: hasBlockingFlag ? "medium" : "high",
    updatedAt: nowIso()
  };

  const rows = authorRows
    .filter(row => row.upstreamProcessMapId !== selectedProcessMapId)
    .concat(nextRow)
    .sort(compareAuthorSpecRows);
  return {
    rows,
    markedProcessMapId: selectedProcessMapId,
    authorSpecId: nextRow.authorSpecId,
    revisionCount: existingRow.status !== "pending" ? 1 : 0
  };
}

function scoreTextTerms(doc, terms, category, findings) {
  const missing = terms.filter(term => !doc.text.toLowerCase().includes(term));
  if (missing.length > 0) {
    findings.push({ category, severity: "blocking", message: `Spec is missing required terms: ${missing.join(", ")}.` });
    return 0;
  }
  return 20;
}

const MATERIAL_STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "can",
  "could",
  "for",
  "from",
  "has",
  "have",
  "how",
  "in",
  "into",
  "is",
  "it",
  "its",
  "may",
  "must",
  "of",
  "on",
  "or",
  "should",
  "that",
  "the",
  "their",
  "then",
  "this",
  "those",
  "through",
  "to",
  "uses",
  "using",
  "when",
  "where",
  "which",
  "will",
  "with",
  "within",
  "without",
  "would"
]);

const SHORT_MATERIAL_TOKENS = new Set([
  "api",
  "get",
  "put",
  "post",
  "patch",
  "del",
  "id",
  "ui",
  "ux"
]);

const GENERIC_COMPRESSION_PATTERNS = [
  /\bfamily-specific\b/i,
  /\bslice-specific\b/i,
  /\btarget-specific\b/i,
  /\bvarious\b/i,
  /\brelevant\b/i,
  /\bcurrent behavior\b/i,
  /\bas documented\b/i,
  /\bas applicable\b/i,
  /\bnamed (?:route|routes|surface|surfaces|contract|contracts|evidence)\b/i,
  /\bspecific upstream details\b/i,
  /\band related (?:behavior|contracts|surfaces|evidence)\b/i
];

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function materialTokens(value) {
  return [...new Set(normalizeSearchText(value)
    .split(" ")
    .filter(Boolean)
    .filter(token => !MATERIAL_STOPWORDS.has(token))
    .filter(token => !/^[a-f0-9]{12,}$/.test(token))
    .filter(token => token.length >= 4 || SHORT_MATERIAL_TOKENS.has(token) || /^\d{2,}$/.test(token)))];
}

function materialLabel(value) {
  const compact = String(value || "").replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

function semanticMaterialMatch({ normalizedHaystack, rawHaystack, value }) {
  const rawNeedle = String(value || "").trim().toLowerCase();
  if (!rawNeedle) return true;
  if (rawHaystack.includes(rawNeedle)) return true;

  const normalizedNeedle = normalizeSearchText(value);
  if (!normalizedNeedle) return true;
  if (normalizedHaystack.includes(normalizedNeedle)) return true;

  const tokens = materialTokens(value);
  if (tokens.length === 0) return true;
  const present = tokens.filter(token => normalizedHaystack.includes(token));
  if (tokens.length <= 3) return present.length === tokens.length;
  if (tokens.length <= 6) return present.length >= Math.ceil(tokens.length * 0.75);
  return present.length >= Math.max(4, Math.ceil(tokens.length * 0.65));
}

function strictMaterialMatch({ normalizedHaystack, rawHaystack, value }) {
  const rawNeedle = String(value || "").trim().toLowerCase();
  if (!rawNeedle) return false;
  if (rawHaystack.includes(rawNeedle)) return true;

  const normalizedNeedle = normalizeSearchText(value);
  if (!normalizedNeedle) return false;
  if (normalizedHaystack.includes(normalizedNeedle)) return true;

  const tokens = materialTokens(value);
  if (tokens.length === 0) return false;
  const present = tokens.filter(token => normalizedHaystack.includes(token));
  if (tokens.length <= 3) return present.length === tokens.length;
  if (tokens.length <= 6) return present.length >= Math.ceil(tokens.length * 0.85);
  return present.length >= Math.max(5, Math.ceil(tokens.length * 0.8));
}

function pushMaterialFinding({ findings, categoryScores, category, field, value, message }) {
  findings.push({
    category,
    severity: "blocking",
    message: message || `Authored specs omit material ${field} detail from the Process / Action Map row: ${materialLabel(value)}.`
  });
  categoryScores[category] = 0;
  categoryScores.adequacyReadiness = 0;
}

function scoreMaterialValues({ values, field, category, normalizedHaystack, rawHaystack, findings, categoryScores }) {
  let missingCount = 0;
  for (const value of normalizeStringList(values)) {
    if (!semanticMaterialMatch({ normalizedHaystack, rawHaystack, value })) {
      missingCount += 1;
      pushMaterialFinding({ findings, categoryScores, category, field, value });
    }
  }
  return missingCount;
}

function evidenceRefMaterialValues(ref) {
  return [
    ref.path,
    ref.lineRange,
    ref.symbol,
    ref.processMapId,
    ref.packId,
    ref.sliceId,
    ref.capabilityId,
    ref.surfaceId,
    ref.fileId,
    ref.detail,
    ref.questionAnswered,
    ref.snippet
  ].filter(isNonEmptyString);
}

function evidenceRefCovered(ref, normalizedHaystack, rawHaystack) {
  const materialValues = evidenceRefMaterialValues(ref);
  if (materialValues.length === 0) return true;
  return materialValues.some(value => semanticMaterialMatch({ normalizedHaystack, rawHaystack, value }));
}

function hasGenericCompression(rawHaystack) {
  return GENERIC_COMPRESSION_PATTERNS.some(pattern => pattern.test(rawHaystack));
}

function scoreEvidenceRefs({ refs, normalizedHaystack, rawHaystack, findings, categoryScores }) {
  let missingCount = 0;
  for (const [index, ref] of asObjectArray(refs).entries()) {
    if (!evidenceRefCovered(ref, normalizedHaystack, rawHaystack)) {
      missingCount += 1;
      pushMaterialFinding({
        findings,
        categoryScores,
        category: "upstreamTraceability",
        field: `evidence ref ${index + 1}`,
        value: ref.path || ref.detail || ref.questionAnswered || ref.processMapId || ref.packId || ref.sliceId || ref.capabilityId || "unnamed evidence ref",
        message: `Authored specs omit material evidence ref ${index + 1}: ${materialLabel(ref.path || ref.detail || ref.questionAnswered || ref.processMapId || ref.packId || ref.sliceId || ref.capabilityId || "unnamed evidence ref")}.`
      });
    }
  }
  return missingCount;
}

function scoreMaterialFidelity({ row, processRow, jobDoc, technicalDoc, findings, categoryScores }) {
  const rawHaystack = `${jobDoc.text}\n${technicalDoc.text}\n${jobDoc.html}\n${technicalDoc.html}`.toLowerCase();
  const normalizedHaystack = normalizeSearchText(rawHaystack);
  let missingCount = 0;

  missingCount += scoreMaterialValues({
    values: [processRow.actor, processRow.role, processRow.trigger, processRow.intendedOutcome, processRow.domainObject],
    field: "actor/role/trigger/outcome/domain object",
    category: "jobIntentCoverage",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreMaterialValues({
    values: processRow.actions,
    field: "action",
    category: "jobIntentCoverage",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreMaterialValues({
    values: processRow.stateModel?.states,
    field: "state",
    category: "jobIntentCoverage",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreMaterialValues({
    values: processRow.stateModel?.transitions,
    field: "state transition",
    category: "jobIntentCoverage",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreMaterialValues({
    values: processRow.permissions,
    field: "permission",
    category: "jobIntentCoverage",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreMaterialValues({
    values: processRow.rules,
    field: "rule",
    category: "jobIntentCoverage",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreMaterialValues({
    values: processRow.visibleBehavior,
    field: "visible/operator behavior",
    category: "jobIntentCoverage",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreMaterialValues({
    values: processRow.edgeCases,
    field: "edge case",
    category: "technicalContractCoverage",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreMaterialValues({
    values: processRow.recoveryPaths,
    field: "recovery path",
    category: "technicalContractCoverage",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreMaterialValues({
    values: [
      ...normalizeStringList(processRow.explicitGaps),
      ...normalizeStringList(row.explicitGaps),
      ...normalizeStringList(processRow.blockingQuestions),
      ...normalizeStringList(row.blockingQuestions),
      ...normalizeStringList(processRow.blockingGaps),
      ...normalizeStringList(row.blockingGaps),
      ...normalizeStringList(processRow.humanDecisions),
      ...normalizeStringList(row.humanDecisions)
    ],
    field: "gap, blocker, or human decision",
    category: "adequacyReadiness",
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });
  missingCount += scoreEvidenceRefs({
    refs: [...asObjectArray(processRow.evidenceRefs), ...asObjectArray(row.evidenceRefs)],
    normalizedHaystack,
    rawHaystack,
    findings,
    categoryScores
  });

  const uncertaintyValues = [
    ...normalizeStringList(processRow.explicitGaps),
    ...normalizeStringList(row.explicitGaps),
    ...normalizeStringList(processRow.blockingQuestions),
    ...normalizeStringList(row.blockingQuestions),
    ...normalizeStringList(processRow.blockingGaps),
    ...normalizeStringList(row.blockingGaps),
    ...normalizeStringList(processRow.humanDecisions),
    ...normalizeStringList(row.humanDecisions)
  ];
  if (uncertaintyValues.length === 0 &&
      !/\b(no unresolved|no explicit gap|no known gap|no human decision|uncertain|uncertainty|unknown|gap|human decision)\b/i.test(rawHaystack)) {
    pushMaterialFinding({
      findings,
      categoryScores,
      category: "adequacyReadiness",
      field: "remaining uncertainty",
      value: "No explicit gaps or human decisions are named upstream.",
      message: "Spec pair must state what remains uncertain or explicitly say that no upstream gaps or human decisions are named."
    });
  }

  const technicalRaw = `${technicalDoc.text}\n${technicalDoc.html}`.toLowerCase();
  const technicalNormalized = normalizeSearchText(technicalRaw);
  const behaviorVerificationAnchors = [
    processRow.trigger,
    processRow.intendedOutcome,
    ...normalizeStringList(processRow.actions)
  ];
  const evidenceVerificationAnchors = [
    ...asObjectArray(processRow.evidenceRefs)
      .filter(ref => isNonEmptyString(ref.path) || isNonEmptyString(ref.snippet) || isNonEmptyString(ref.symbol))
      .flatMap(evidenceRefMaterialValues)
  ];
  const hasVerificationLanguage = /\b(verification|verify|test|check|prove|smoke)\b/i.test(technicalRaw);
  const hasBehaviorVerificationAnchor = behaviorVerificationAnchors
    .some(value => strictMaterialMatch({ normalizedHaystack: technicalNormalized, rawHaystack: technicalRaw, value }));
  const hasEvidenceVerificationAnchor = evidenceVerificationAnchors
    .some(value => strictMaterialMatch({ normalizedHaystack: technicalNormalized, rawHaystack: technicalRaw, value }));
  if (!hasVerificationLanguage || !hasBehaviorVerificationAnchor || !hasEvidenceVerificationAnchor) {
    pushMaterialFinding({
      findings,
      categoryScores,
      category: "technicalContractCoverage",
      field: "verification proof",
      value: "verification tied to row behavior or evidence",
      message: "Technical spec must name verification that would prove this specific Process / Action Map row from its behavior or evidence, not only generic spec checks."
    });
  }

  if (hasGenericCompression(rawHaystack) && missingCount > 0) {
    findings.push({
      category: "adequacyReadiness",
      severity: "blocking",
      message: "Authored specs compress specific upstream row details into generic prose; preserve the omitted particulars before this row can be outstanding."
    });
    categoryScores.adequacyReadiness = 0;
  }
}

function scoreAuthorSpecRow(row, processById = new Map(), repoRoot = process.cwd()) {
  const findings = [];
  const categoryScores = {
    upstreamTraceability: 20,
    jobIntentCoverage: 20,
    technicalContractCoverage: 20,
    graphTraceability: 20,
    adequacyReadiness: 20
  };
  const processRow = processById.get(row.upstreamProcessMapId);
  if (!processRow) {
    findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Author Specs row has no resolvable upstream Process / Action Map row." });
    categoryScores.upstreamTraceability = 0;
  } else {
    if (row.upstreamProcessRef?.processRowFingerprint !== processActionMapRowFingerprint(processRow)) {
      findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Author Specs row has stale upstream Process / Action Map fingerprint." });
      categoryScores.upstreamTraceability = 0;
    }
  }

  if (row.status === "blocked" && hasBlockingDetail(row)) {
    findings.push({ category: "adequacyReadiness", severity: "info", message: "Author Specs row is explicitly blocked with named upstream blocker detail." });
    return {
      subjectRowId: row.authorSpecId,
      upstreamProcessMapId: row.upstreamProcessMapId,
      upstreamSliceId: row.upstreamSliceId,
      status: row.status,
      authorRowFingerprint: authorSpecRowFingerprint(row),
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

  if (row.status !== READY_FOR_SLICE_EVAL_STATUS) {
    findings.push({ category: "adequacyReadiness", severity: "blocking", message: "Author Specs row is not ready-for-slice-eval." });
    categoryScores.adequacyReadiness = 0;
  }

  const jobDoc = readSpecDocument(repoRoot, row.jobSpecPath);
  const technicalDoc = readSpecDocument(repoRoot, row.technicalSpecPath);
  if (!jobDoc.exists || !technicalDoc.exists || !jobDoc.metadata || !technicalDoc.metadata) {
    findings.push({ category: "adequacyReadiness", severity: "blocking", message: "Author Specs row requires readable job and technical specs with metadata." });
    categoryScores.adequacyReadiness = 0;
  } else {
    categoryScores.jobIntentCoverage = Math.min(categoryScores.jobIntentCoverage, scoreTextTerms(jobDoc, [
      "actor",
      "outcome",
      "domain object",
      "actions",
      "states",
      "rules",
      "edge cases",
      "recovery",
      "evidence"
    ], "jobIntentCoverage", findings));
    if (!hasAnyText(jobDoc, ["rendered ux", "visible behavior", "operator behavior", "nonvisual"])) {
      findings.push({ category: "jobIntentCoverage", severity: "blocking", message: "Job spec must cover rendered UX, visible/operator behavior, or nonvisual scope." });
      categoryScores.jobIntentCoverage = 0;
    }
    categoryScores.technicalContractCoverage = Math.min(categoryScores.technicalContractCoverage, scoreTextTerms(technicalDoc, [
      "required contract",
      "current evidence",
      "architecture constraint",
      "implementation latitude",
      "failure",
      "recovery",
      "observability",
      "verification"
    ], "technicalContractCoverage", findings));
    if (!hasAnyText(technicalDoc, ["data model", "api", "route", "service", "job", "queue", "event", "command", "schema"])) {
      findings.push({ category: "technicalContractCoverage", severity: "blocking", message: "Technical spec must identify concrete contract surfaces." });
      categoryScores.technicalContractCoverage = 0;
    }
    if (!jobDoc.graph || !technicalDoc.graph || jobDoc.graph.ownerSpecId !== jobDoc.metadata.id || technicalDoc.graph.ownerSpecId !== technicalDoc.metadata.id) {
      findings.push({ category: "graphTraceability", severity: "blocking", message: "Job and technical specs require graph-metadata with ownerSpecId aligned to spec IDs." });
      categoryScores.graphTraceability = 0;
    }
    const combinedTrace = `${jobDoc.html}\n${technicalDoc.html}`.toLowerCase();
    if (!combinedTrace.includes(String(row.upstreamProcessMapId).toLowerCase()) &&
        !combinedTrace.includes(String(row.upstreamSliceId).toLowerCase())) {
      findings.push({ category: "graphTraceability", severity: "blocking", message: "Authored specs must cite the upstream process or slice ID." });
      categoryScores.graphTraceability = 0;
    }
    if (hasPlaceholderText(jobDoc) || hasPlaceholderText(technicalDoc)) {
      findings.push({ category: "adequacyReadiness", severity: "blocking", message: "Authored specs contain placeholders, TODO/TBD text, or vague filler." });
      categoryScores.adequacyReadiness = 0;
    }
    if (processRow) {
      scoreMaterialFidelity({ row, processRow, jobDoc, technicalDoc, findings, categoryScores });
    }
  }

  if (!Array.isArray(row.evidenceRefs) || row.evidenceRefs.length < 2) {
    findings.push({ category: "upstreamTraceability", severity: "blocking", message: "Author Specs row requires trace evidence refs from process and capability evidence." });
    categoryScores.upstreamTraceability = 0;
  }
  if (normalizeReviewFlags(row.reviewFlags).some(flag => flag.severity !== "info")) {
    findings.push({ category: "adequacyReadiness", severity: "blocking", message: "Author Specs row has unresolved warning or blocking review flags." });
    categoryScores.adequacyReadiness = 0;
  }

  const score = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  return {
    subjectRowId: row.authorSpecId,
    upstreamProcessMapId: row.upstreamProcessMapId,
    upstreamSliceId: row.upstreamSliceId,
    status: row.status,
    authorRowFingerprint: authorSpecRowFingerprint(row),
    categoryScores,
    score,
    findings,
    acceptabilityGate: {
      acceptable: findings.every(finding => finding.severity !== "blocking" && finding.severity !== "warning") && score === 100,
      outstanding: findings.every(finding => finding.severity !== "blocking" && finding.severity !== "warning") && score === 100,
      threshold: "Outstanding Author Specs row requires score 100 with no blocking findings, no warnings, no placeholders, current checks, and no revision targets"
    }
  };
}

function selectAuthorSpecsEvalSample(authorRows, mode = "risk") {
  if (mode === "all" || authorRows.length <= 120) return authorRows;
  const selected = new Map();
  for (const row of authorRows) {
    if (row.status !== READY_FOR_SLICE_EVAL_STATUS) selected.set(row.authorSpecId, row);
    if (rowHasBlockingFlag(row) || row.status === "blocked" || row.status === "needs-revision") selected.set(row.authorSpecId, row);
    if (!row.jobSpecPath || !row.technicalSpecPath) selected.set(row.authorSpecId, row);
  }
  for (const row of authorRows) {
    const stratum = `${row.status}:${row.renderedUxRequired ? "ux" : "nonvisual"}:${(row.upstreamCapabilityIds || []).length}`;
    if (![...selected.values()].some(existing => `${existing.status}:${existing.renderedUxRequired ? "ux" : "nonvisual"}:${(existing.upstreamCapabilityIds || []).length}` === stratum)) {
      selected.set(row.authorSpecId, row);
    }
  }
  return [...selected.values()].sort((left, right) => left.authorSpecId.localeCompare(right.authorSpecId));
}

function aggregateAuthorSpecsEval(checkResults, rowReceipts) {
  const checkSummary = summarizeResults(checkResults);
  if (rowReceipts.length === 0) {
    const categoryScores = {
      upstreamTraceability: checkSummary.fail === 0 ? 20 : 0,
      jobIntentCoverage: 20,
      technicalContractCoverage: 20,
      graphTraceability: 20,
      adequacyReadiness: 20
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
    upstreamTraceability: Math.min(checkSummary.fail === 0 ? 20 : 0, ...rowReceipts.map(receipt => receipt.categoryScores.upstreamTraceability)),
    jobIntentCoverage: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.jobIntentCoverage), 20),
    technicalContractCoverage: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.technicalContractCoverage), 20),
    graphTraceability: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.graphTraceability), 20),
    adequacyReadiness: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.adequacyReadiness), 20)
  };
  const totalScore = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  const normalizedMinimum = Math.min(...Object.values(categoryScores).map(score => score / 2));
  return {
    categoryScores,
    totalScore,
    normalizedMinimum,
    acceptable: checkSummary.fail === 0 &&
      rowReceipts.every(receipt => receipt.acceptabilityGate.outstanding) &&
      totalScore === 100 &&
      normalizedMinimum === 10,
    outstanding: checkSummary.fail === 0 &&
      rowReceipts.every(receipt => receipt.acceptabilityGate.outstanding) &&
      totalScore === 100 &&
      normalizedMinimum === 10
  };
}

function mergeAuthorSpecRowsForRefresh({ processRows, existingAuthorRows, processMapFingerprint = null }) {
  const active = activeProcessRows(processRows);
  const activeById = new Map(active.map(row => [row.processMapId, row]));
  const covered = new Set();
  const changed = [];
  const removed = [];
  const output = [];

  for (const row of existingAuthorRows) {
    const processRow = activeById.get(row.upstreamProcessMapId);
    if (!processRow) {
      removed.push(row.authorSpecId);
      continue;
    }
    const stale = row.upstreamProcessRef?.processRowFingerprint !== processActionMapRowFingerprint(processRow);
    if (stale) {
      changed.push(row.upstreamProcessMapId);
      output.push(createPendingAuthorSpecRow(processRow, processMapFingerprint));
      continue;
    }
    covered.add(row.upstreamProcessMapId);
    output.push(row);
  }

  for (const processRow of active) {
    if (covered.has(processRow.processMapId) || changed.includes(processRow.processMapId)) continue;
    changed.push(processRow.processMapId);
    output.push(createPendingAuthorSpecRow(processRow, processMapFingerprint));
  }

  output.sort(compareAuthorSpecRows);
  return { rows: output, changed: [...new Set(changed)], removed };
}

function buildAuthorSpecsReportState({ repoRoot, runId, outDir, processRows, authorRows, runLogPath = null }) {
  const checkPath = authorSpecsCheckPathFor(repoRoot, runId, outDir);
  const check = fs.existsSync(checkPath) ? readJson(checkPath) : null;
  const evalReceiptPath = authorSpecsEvalReceiptPathFor(repoRoot, runId, outDir);
  const evalRows = readAuthorSpecsEvalRows(repoRoot, runId, outDir).rows;
  const evalSummary = readAuthorSpecsEvalSummary(repoRoot, runId, outDir);
  const authorSpecsFingerprint = authorSpecsArtifactFingerprint(repoRoot, runId, outDir);
  const checkAuthorSpecsFingerprint = check?.authorSpecsFingerprint || null;
  const checkAuthorSpecsFresh = Boolean(checkAuthorSpecsFingerprint) && checkAuthorSpecsFingerprint === authorSpecsFingerprint;
  const evalAuthorSpecsFingerprint = evalSummary?.authorSpecsFingerprint || null;
  const evalAuthorRowCount = Number.isInteger(evalSummary?.authorRowCount) ? evalSummary.authorRowCount : null;
  const checkerPass = check?.summary?.fail === 0 && checkAuthorSpecsFresh;
  const evalPass = Boolean(evalSummary?.acceptabilityGate?.outstanding);
  const evalRevisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  const evalFindings = Array.isArray(evalSummary?.findings) ? evalSummary.findings : [];
  const rowOutstandingState = authorSpecRowOutstandingState(authorRows, evalRows);
  const activeProcessCount = activeProcessRows(processRows).length;
  const pendingCount = authorRows.filter(row => row.status === "pending").length;
  const authoredCount = authorRows.filter(row => row.status === "authored").length;
  const needsRevisionCount = authorRows.filter(row => row.status === "needs-revision").length;
  const readyForSliceEvalCount = authorRows.filter(row => row.status === READY_FOR_SLICE_EVAL_STATUS).length;
  const blockedCount = authorRows.filter(row => row.status === "blocked").length;
  const evalAuthorSpecsFresh = Boolean(evalAuthorSpecsFingerprint) &&
    evalAuthorSpecsFingerprint === authorSpecsFingerprint &&
    evalAuthorRowCount === authorRows.length;
  const rowOutstandingReady = rowOutstandingState.missing.length === 0;
  const evalHandoffReady = evalPass && evalRevisionTargets.length === 0 && evalAuthorSpecsFresh && rowOutstandingReady;
  const currentTarget = nextAuthorSpecTarget({ processRows, authorRows, evalRows });
  const latestRunLogSequence = (() => {
    if (!runLogPath || !fs.existsSync(runLogPath)) return null;
    const parsed = readJsonl(runLogPath);
    const sequences = parsed.rows.map(row => row.sequence).filter(Number.isInteger);
    return sequences.length > 0 ? Math.max(...sequences) : null;
  })();

  return {
    schema: "foundation.backfill.author-specs-report-state.v1",
    runId,
    generatedAt: new Date().toISOString(),
    authorSpecsPath: path.relative(repoRoot, authorSpecsPathFor(repoRoot, runId, outDir)),
    authorSpecsFingerprint,
    checkerPath: path.relative(repoRoot, checkPath),
    checkerResult: checkerPass ? "pass" : "fail-or-missing",
    checkAuthorSpecsFingerprint,
    checkAuthorSpecsFresh,
    evalReceiptPath: path.relative(repoRoot, evalReceiptPath),
    summaryPath: path.relative(repoRoot, authorSpecsSummaryPathFor(repoRoot, runId, outDir)),
    evalResult: evalHandoffReady ? "pass" : (evalPass ? "pass-with-revisions" : "fail-or-missing"),
    evalScore: evalSummary?.totalScore ?? null,
    evalAuthorSpecsFingerprint,
    evalAuthorSpecsFresh,
    evalRevisionTargetCount: evalRevisionTargets.length,
    evalWarningCount: evalFindings.filter(finding => finding?.severity === "warning").length,
    evalBlockingFindingCount: evalFindings.filter(finding => finding?.severity === "blocking").length,
    rowOutstandingCount: rowOutstandingState.outstanding.length,
    rowOutstandingMissingCount: rowOutstandingState.missing.length,
    processRowCount: processRows.length,
    activeProcessCount,
    authorRowCount: authorRows.length,
    pendingCount,
    authoredCount,
    needsRevisionCount,
    readyForSliceEvalCount,
    blockedCount,
    currentAuthorSpecId: currentTarget?.authorSpecId || null,
    currentProcessMapId: currentTarget?.upstreamProcessMapId || null,
    currentSliceId: currentTarget?.upstreamSliceId || null,
    latestRunLogSequence,
    nextLayer: activeProcessCount === authorRows.length &&
      pendingCount === 0 &&
      authoredCount === 0 &&
      needsRevisionCount === 0 &&
      checkerPass &&
      evalHandoffReady
      ? "Evaluate Job Slices"
      : "Author Specs revision"
  };
}

function buildAuthorSpecsPayload({ runId, repoRoot, authorRows }) {
  return {
    schema: "foundation.backfill.author-specs.v1",
    runId,
    targetRepo: path.basename(repoRoot),
    authorSpecs: authorRows.map(row => ({
      authorSpecId: row.authorSpecId,
      upstreamProcessMapId: row.upstreamProcessMapId,
    upstreamPackId: row.upstreamPackId,
    upstreamSliceId: row.upstreamSliceId,
    upstreamCapabilityIds: row.upstreamCapabilityIds,
    capabilityRefs: row.capabilityRefs || [],
    status: row.status,
      confidence: row.confidence,
      jobSpecId: row.jobSpecId,
      technicalSpecId: row.technicalSpecId,
      jobSpecPath: row.jobSpecPath,
      technicalSpecPath: row.technicalSpecPath,
      renderedUxRequired: row.renderedUxRequired,
      renderedUxStatus: row.renderedUxStatus,
      blockingQuestions: row.blockingQuestions,
      blockingGaps: row.blockingGaps,
      humanDecisions: row.humanDecisions,
      reviewFlags: row.reviewFlags
    }))
  };
}

export {
  AUTHOR_EVAL_SCHEMA,
  AUTHOR_ROW_SCHEMA,
  READY_FOR_SLICE_EVAL_STATUS,
  VALID_AUTHOR_SPEC_STATUSES,
  appendRunLogEvent,
  aggregateAuthorSpecsEval,
  authorSpecRowFingerprint,
  authorSpecRowOutstandingState,
  authorSpecsArtifactFingerprint,
  authorSpecsCheckPathFor,
  authorSpecsEvalReceiptPathFor,
  authorSpecsPathFor,
  authorSpecsRefreshPathFor,
  authorSpecsSummaryPathFor,
  buildAuthorSpecsPayload,
  buildAuthorSpecsReportState,
  compareAuthorSpecRows,
  createInitialAuthorSpecRows,
  createPendingAuthorSpecRow,
  defaultBackfillDir,
  ensureDir,
  markAuthorSpecRow,
  mergeAuthorSpecRowsForRefresh,
  nextAuthorSpecTarget,
  parseCliArgs,
  parseIds,
  readAuthorSpecsEvalRows,
  readAuthorSpecsRows,
  readJson,
  readJsonl,
  renderResultsText,
  scoreAuthorSpecRow,
  selectAuthorSpecsEvalSample,
  summarizeResults,
  validateAuthorSpecs,
  validateAuthorSpecsRows,
  validateProcessActionMapHandoff,
  writeJson,
  writeJsonl
};
