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
  surfaceCheckPathFor,
  surfaceEvalReceiptPathFor,
  surfaceEvalSummaryPathFor,
  surfaceFunctionMapPathFor,
  validateSurfaceFunctionMap
} from "./surface-function-map-core.mjs";

const VALID_CAPABILITY_STATUSES = new Set(["pending", "mapped", "needs-split", "ready-for-queue", "blocked"]);
const VALID_CAPABILITY_ALTITUDES = new Set(["parent", "child", "sole", "needs-split", "blocked"]);
const QUEUE_ELIGIBLE_CAPABILITY_ALTITUDES = new Set(["child", "sole"]);
const VALID_CONFIDENCE = new Set(["low", "medium", "high"]);
const VALID_REVIEW_FLAG_SEVERITY = new Set(["info", "warning", "blocking"]);
const TERMINAL_CAPABILITY_STATUSES = new Set(["needs-split", "ready-for-queue", "blocked"]);
const NON_CAPABILITY_TITLE_PATTERNS = [
  /\bartifact\s+inventory\b/i,
  /\bfile\s+registry\b/i,
  /\bsurface\s+(registry|map|function\s+map)\b/i,
  /\bcapability\s+(matrix|map)\b/i,
  /\bcontext\s+pack\b/i,
  /\b(job|spec)\s+queue\b/i,
  /\bprocess\s*\/?\s*action\s+map\b/i,
  /\bauthor\s+specs?\b/i,
  /\bevaluation\b/i,
  /\bhandoff\b/i,
  /\bdeployment\b/i,
  /\bphase\b/i,
  /\blayer\b/i,
  /\bqueue\b/i
];
const SHORT_NON_CAPABILITY_TERMS = new Set([
  "route",
  "routes",
  "command",
  "commands",
  "screen",
  "screens",
  "table",
  "tables",
  "job",
  "jobs",
  "api",
  "apis"
]);
const GENERIC_WORDS = new Set([
  "manage",
  "handles",
  "handling",
  "supports",
  "various",
  "misc",
  "miscellaneous",
  "stuff",
  "things",
  "data",
  "system"
]);

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function capabilityMapPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `capability-map-${runId}.jsonl`);
}

function capabilityCheckPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `capability-map-check-${runId}.json`);
}

function capabilityEvalReceiptPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `capability-map-eval-${runId}.jsonl`);
}

function capabilitySummaryPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `capability-map-summary-${runId}.html`);
}

function capabilityRefreshPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `capability-map-refresh-${runId}.json`);
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

function normalizeCapabilityAltitude(value) {
  if (!isNonEmptyString(value)) return "";
  const normalized = value.trim().toLowerCase();
  return VALID_CAPABILITY_ALTITUDES.has(normalized) ? normalized : "";
}

function capabilityAltitudeFor(row) {
  const explicit = normalizeCapabilityAltitude(row?.capabilityAltitude || row?.altitude);
  if (explicit) return explicit;
  if (row?.status === "needs-split" || row?.splitNeeded === true) return "needs-split";
  if (row?.status === "blocked") return "blocked";
  if (isNonEmptyString(row?.parentCapabilityId)) return "child";
  if (row?.status === "ready-for-queue") return "sole";
  return "";
}

function capabilityTitleFor(row) {
  return isNonEmptyString(row?.capabilityTitle) ? row.capabilityTitle.trim() : (isNonEmptyString(row?.name) ? row.name.trim() : "");
}

function isQueueEligibleCapability(row) {
  const altitude = capabilityAltitudeFor(row);
  return row?.status === "ready-for-queue" &&
    row?.queueEligible === true &&
    QUEUE_ELIGIBLE_CAPABILITY_ALTITUDES.has(altitude);
}

function capabilityHasBlockingDetail(row) {
  return normalizeStringList(row?.blockingGaps).length > 0 ||
    normalizeStringList(row?.humanDecisions).length > 0 ||
    rowHasBlockingFlag(row) ||
    isNonEmptyString(row?.blockerOrSplitReason) ||
    isNonEmptyString(row?.notCapabilityReason);
}

function titleLooksLikeNonCapability(value) {
  if (!isNonEmptyString(value)) return false;
  if (NON_CAPABILITY_TITLE_PATTERNS.some(pattern => pattern.test(value))) return true;
  const words = value.toLowerCase().match(/[a-z0-9]+/g) || [];
  return words.length > 0 && words.length <= 5 && words.some(word => SHORT_NON_CAPABILITY_TERMS.has(word));
}

function capabilityModelCounts(capabilityRows) {
  const counts = {
    parentCapabilityCount: 0,
    childCapabilityCount: 0,
    soleCapabilityCount: 0,
    needsSplitCount: 0,
    blockedCapabilityCount: 0,
    queueEligibleCapabilityCount: 0
  };
  for (const row of capabilityRows) {
    const altitude = capabilityAltitudeFor(row);
    if (altitude === "parent") counts.parentCapabilityCount += 1;
    if (altitude === "child") counts.childCapabilityCount += 1;
    if (altitude === "sole") counts.soleCapabilityCount += 1;
    if (altitude === "needs-split") counts.needsSplitCount += 1;
    if (altitude === "blocked") counts.blockedCapabilityCount += 1;
    if (isQueueEligibleCapability(row)) counts.queueEligibleCapabilityCount += 1;
  }
  return counts;
}

function parentOnlyCoverageFailuresFor(surfaceRows, capabilityRows) {
  const rowsBySurface = new Map();
  for (const row of capabilityRows) {
    for (const surfaceId of row.upstreamSurfaceIds || []) {
      if (!rowsBySurface.has(surfaceId)) rowsBySurface.set(surfaceId, []);
      rowsBySurface.get(surfaceId).push(row);
    }
  }
  return readySurfaceRows(surfaceRows)
    .filter(surface => {
      const attached = rowsBySurface.get(surface.surfaceId) || [];
      return attached.some(row => capabilityAltitudeFor(row) === "parent") &&
        !attached.some(isQueueEligibleCapability) &&
        !attached.some(row => capabilityAltitudeFor(row) === "blocked" && capabilityHasBlockingDetail(row));
    })
    .map(surface => ({ surfaceId: surface.surfaceId, label: surface.label, path: surfaceDisplayPath(surface) }));
}

function preferredField(source, primary, legacy) {
  return source?.[primary] !== undefined ? source[primary] : source?.[legacy];
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function stableCapabilityId(surfaceIds, actor, outcome, domainObject, name) {
  const semantic = `${surfaceIds.slice().sort().join("|")}:${actor}:${outcome}:${domainObject}:${name}`;
  return `cap-${slug(name || domainObject || "capability")}-${sha256Text(semantic).slice(0, 12)}`;
}

function surfaceFingerprint(surfaceRow) {
  return `sha256:${sha256Text(JSON.stringify(surfaceRow))}`;
}

function upstreamSurfaceRef(surfaceRow) {
  return {
    surfaceId: surfaceRow.surfaceId,
    surfaceKind: surfaceRow.surfaceKind,
    label: surfaceRow.label,
    upstreamPaths: Array.isArray(surfaceRow.upstreamPaths) ? surfaceRow.upstreamPaths : [],
    upstreamFileIds: Array.isArray(surfaceRow.upstreamFileIds) ? surfaceRow.upstreamFileIds : [],
    status: surfaceRow.status,
    surfaceFingerprint: surfaceFingerprint(surfaceRow)
  };
}

function surfaceDisplayPath(surfaceRow) {
  return surfaceRow?.upstreamPaths?.[0] || "";
}

function isReadySurface(surfaceRow) {
  return surfaceRow?.status === "ready-for-capability" && surfaceRow?.surfaceKind !== "support-classification";
}

function readySurfaceRows(surfaceRows) {
  return surfaceRows.filter(isReadySurface);
}

function createPendingCapabilityRow(surfaceRow) {
  const now = nowIso();
  const name = `Pending capability mapping for ${surfaceRow.label}`;
  return {
    schema: "foundation.backfill.capability-map-row.v1",
    runId: surfaceRow.runId,
    capabilityId: stableCapabilityId([surfaceRow.surfaceId], "pending", "extract capability", surfaceRow.exposedObject || surfaceRow.label, name),
    name,
    capabilityTitle: name,
    capabilityAltitude: "",
    parentCapabilityId: null,
    parentCapabilityName: null,
    queueEligible: false,
    notCapabilityReason: "",
    blockerOrSplitReason: "",
    upstreamSurfaceIds: [surfaceRow.surfaceId],
    upstreamSurfaceRefs: [upstreamSurfaceRef(surfaceRow)],
    surfaceRefs: [{
      surfaceId: surfaceRow.surfaceId,
      surfaceKind: surfaceRow.surfaceKind,
      label: surfaceRow.label,
      path: surfaceDisplayPath(surfaceRow)
    }],
    evidenceRefs: [{
      surfaceId: surfaceRow.surfaceId,
      path: surfaceDisplayPath(surfaceRow),
      relationship: "pending-capability-mapping",
      detail: "Initialized from ready-for-capability Surface / Function Map row."
    }],
    actor: "",
    intendedOutcome: "",
    domainObject: "",
    actions: [],
    states: [],
    rules: [],
    experience: "",
    backingContracts: [],
    failureAndRecovery: [],
    evidence: [],
    jobSpec: null,
    technicalSpec: null,
    jobSections: [],
    technicalSections: [],
    verificationTargets: [],
    blockingGaps: [],
    humanDecisions: [],
    reviewFlags: [],
    splitNeeded: false,
    splitReason: "",
    splitCriteria: [],
    status: "pending",
    confidence: "low",
    createdAt: now,
    updatedAt: now
  };
}

function readSurfaceFunctionMapRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const registryPath = surfaceFunctionMapPathFor(repoRoot, runId, outDir);
  const parsed = readJsonl(registryPath);
  return { registryPath, ...parsed };
}

function readCapabilityMapRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const registryPath = capabilityMapPathFor(repoRoot, runId, outDir);
  const parsed = readJsonl(registryPath);
  return { registryPath, ...parsed };
}

function readEvalSummary(receiptPath) {
  if (!fs.existsSync(receiptPath)) return null;
  const parsed = readJsonl(receiptPath);
  return parsed.rows.find(row => row.receiptType === "summary") || null;
}

function parseJsonScript(html, scriptId) {
  const scriptIds = Array.isArray(scriptId) ? scriptId : [scriptId];
  for (const id of scriptIds) {
    const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = pattern.exec(html))) {
      const attrs = match[1];
      const body = match[2].trim();
      if (new RegExp(`\\bid=["']${id}["']`, "i").test(attrs) && /\btype=["']application\/json["']/i.test(attrs)) {
        try {
          return JSON.parse(body);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function validateSurfaceFunctionMapHandoff(repoRoot, runId, outDir = defaultBackfillDir(repoRoot), reportPath = null) {
  const validation = validateSurfaceFunctionMap({ repoRoot, runId, outDir, phase: "handoff", reportPath });
  const results = [...validation.results];

  const checkPath = surfaceCheckPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(checkPath)) {
    results.push(fail("upstream-surface-function-map-check-artifact", "Passing Surface / Function Map check artifact is required before Capability Map"));
  } else {
    const check = readJson(checkPath);
    results.push(check?.summary?.fail === 0
      ? pass("upstream-surface-function-map-check-artifact", "Surface / Function Map check artifact passes")
      : fail("upstream-surface-function-map-check-artifact", "Surface / Function Map check artifact must pass", { summary: check?.summary || null }));
  }

  const evalSummary = readEvalSummary(surfaceEvalReceiptPathFor(repoRoot, runId, outDir));
  results.push(evalSummary?.acceptabilityGate?.acceptable
    ? pass("upstream-surface-function-map-eval", "Surface / Function Map eval artifact passes")
    : fail("upstream-surface-function-map-eval", "Passing Surface / Function Map eval receipt is required before Capability Map"));
  const revisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  results.push(revisionTargets.length === 0
    ? pass("upstream-surface-function-map-eval-revisions", "Surface / Function Map eval has no revision targets")
    : fail("upstream-surface-function-map-eval-revisions", "Surface / Function Map eval revision targets must be resolved before Capability Map", { revisionTargets }));

  if (reportPath) {
    if (!fs.existsSync(reportPath)) {
      results.push(fail("upstream-surface-report-exists", "Surface / Function Map report path does not exist", { reportPath }));
    } else {
      const state = parseJsonScript(fs.readFileSync(reportPath, "utf8"), "backfill-surface-function-map-state");
      results.push(state?.nextLayer === "Capability Map"
        ? pass("upstream-surface-report-next-layer", "Surface / Function Map report names Capability Map as next layer")
        : fail("upstream-surface-report-next-layer", "Surface / Function Map report must name Capability Map as next layer", { nextLayer: state?.nextLayer || null }));
    }
  }

  return {
    surfaceFunctionMapPath: validation.registryPath,
    surfaceRows: validation.surfaceRows,
    results
  };
}

function createInitialCapabilityRows(surfaceRows) {
  return readySurfaceRows(surfaceRows).map(createPendingCapabilityRow);
}

function normalizeReviewFlags(value, status) {
  const flags = asObjectArray(value).map(flag => ({
    severity: VALID_REVIEW_FLAG_SEVERITY.has(flag.severity) ? flag.severity : "warning",
    reason: isNonEmptyString(flag.reason) ? flag.reason.trim() : "Capability row needs review.",
    evidence: isNonEmptyString(flag.evidence) ? flag.evidence.trim() : "",
    nextAction: isNonEmptyString(flag.nextAction) ? flag.nextAction.trim() : "Revise this Capability Map row."
  }));
  if (status === "mapped" && flags.some(flag => flag.severity === "blocking") === false && value?.blocking === true) {
    flags.push({
      severity: "blocking",
      reason: "Capability row was marked with a blocking review condition.",
      evidence: "",
      nextAction: "Resolve the blocking condition or record a named human decision."
    });
  }
  return flags;
}

function createAgentMarkedCapabilityRow(surfaceById, selectedSurfaceIds, spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error("Capability spec must be an object");
  }

  const selectedSet = new Set(selectedSurfaceIds);
  const upstreamSurfaceIds = normalizeStringList(spec.upstreamSurfaceIds);
  const rowSurfaceIds = upstreamSurfaceIds.length > 0 ? upstreamSurfaceIds : selectedSurfaceIds;
  if (rowSurfaceIds.length === 0) throw new Error("Capability row requires at least one upstream surface ID");
  for (const surfaceId of rowSurfaceIds) {
    if (!selectedSet.has(surfaceId)) throw new Error(`Capability row references surface not included in --surface-ids: ${surfaceId}`);
    const surface = surfaceById.get(surfaceId);
    if (!surface) throw new Error(`Capability row references unknown surface: ${surfaceId}`);
    if (!isReadySurface(surface)) throw new Error(`Capability row references surface not ready for capability: ${surfaceId}`);
  }

  const requestedAltitude = normalizeCapabilityAltitude(spec.capabilityAltitude || spec.altitude);
  const parentCapabilityId = normalizeNullableString(spec.parentCapabilityId || spec.parentId);
  const statusFromSpec = isNonEmptyString(spec.status) ? spec.status.trim() : null;
  let status = statusFromSpec && VALID_CAPABILITY_STATUSES.has(statusFromSpec) ? statusFromSpec : null;
  if (!status) {
    status = requestedAltitude === "blocked"
      ? "blocked"
      : requestedAltitude === "needs-split" || spec.splitNeeded === true || isNonEmptyString(spec.splitReason) || normalizeStringList(spec.splitCriteria).length > 0
      ? "needs-split"
      : "ready-for-queue";
  }

  const surfaces = rowSurfaceIds.map(surfaceId => surfaceById.get(surfaceId));
  const actor = isNonEmptyString(spec.actor) ? spec.actor.trim() : "";
  const intendedOutcome = isNonEmptyString(spec.intendedOutcome) ? spec.intendedOutcome.trim() : "";
  const domainObject = isNonEmptyString(spec.domainObject) ? spec.domainObject.trim() : "";
  const name = isNonEmptyString(spec.name)
    ? spec.name.trim()
    : `${actor || "Actor"} ${intendedOutcome || "capability"}`.trim();
  const capabilityTitle = isNonEmptyString(spec.capabilityTitle)
    ? spec.capabilityTitle.trim()
    : name;
  const capabilityAltitude = requestedAltitude ||
    (status === "needs-split" ? "needs-split" :
      status === "blocked" ? "blocked" :
        parentCapabilityId ? "child" : "sole");
  const queueEligible = status === "ready-for-queue" && QUEUE_ELIGIBLE_CAPABILITY_ALTITUDES.has(capabilityAltitude);
  const notCapabilityReason = isNonEmptyString(spec.notCapabilityReason)
    ? spec.notCapabilityReason.trim()
    : "";
  const blockerOrSplitReason = isNonEmptyString(spec.blockerOrSplitReason)
    ? spec.blockerOrSplitReason.trim()
    : (isNonEmptyString(spec.splitReason) ? spec.splitReason.trim() : "");
  const capabilityId = isNonEmptyString(spec.capabilityId || spec.id)
    ? String(spec.capabilityId || spec.id).trim()
    : stableCapabilityId(rowSurfaceIds, actor, intendedOutcome, domainObject, name);
  const now = nowIso();
  const surfaceRefs = surfaces.map(surface => ({
    surfaceId: surface.surfaceId,
    surfaceKind: surface.surfaceKind,
    label: surface.label,
    path: surfaceDisplayPath(surface)
  }));
  const defaultEvidence = surfaceRefs.map(ref => `${ref.label} (${ref.path})`);

  return {
    schema: "foundation.backfill.capability-map-row.v1",
    runId: surfaces[0].runId,
    capabilityId,
    name,
    capabilityTitle,
    capabilityAltitude,
    parentCapabilityId,
    parentCapabilityName: normalizeNullableString(spec.parentCapabilityName || spec.parentName),
    queueEligible,
    notCapabilityReason,
    blockerOrSplitReason,
    upstreamSurfaceIds: rowSurfaceIds,
    upstreamSurfaceRefs: surfaces.map(upstreamSurfaceRef),
    surfaceRefs,
    evidenceRefs: [
      ...surfaces.map(surface => ({
        surfaceId: surface.surfaceId,
        path: surfaceDisplayPath(surface),
        relationship: "surface-function-map-row",
        detail: isNonEmptyString(spec.evidenceDetail)
          ? spec.evidenceDetail.trim()
          : `Capability mapped from Surface / Function Map row ${surface.surfaceId}: ${surface.label}.`
      })),
      ...asObjectArray(spec.evidenceRefs)
    ],
    actor,
    intendedOutcome,
    domainObject,
    actions: normalizeStringList(spec.actions),
    states: normalizeStringList(spec.states),
    rules: normalizeStringList(spec.rules || spec.permissionsAndRules),
    experience: isNonEmptyString(spec.experience) ? spec.experience.trim() : "",
    backingContracts: normalizeStringList(spec.backingContracts),
    failureAndRecovery: normalizeStringList(spec.failureAndRecovery),
    evidence: normalizeStringList(spec.evidence).length > 0 ? normalizeStringList(spec.evidence) : defaultEvidence,
    jobSpec: normalizeNullableString(preferredField(spec, "jobSpec", "descriptiveSpec")),
    technicalSpec: normalizeNullableString(spec.technicalSpec),
    jobSections: normalizeStringList(preferredField(spec, "jobSections", "descriptiveSections")),
    technicalSections: normalizeStringList(spec.technicalSections),
    verificationTargets: normalizeStringList(spec.verificationTargets),
    blockingGaps: normalizeStringList(spec.blockingGaps),
    humanDecisions: normalizeStringList(spec.humanDecisions),
    reviewFlags: normalizeReviewFlags(spec.reviewFlags, status),
    splitNeeded: status === "needs-split" || spec.splitNeeded === true,
    splitReason: isNonEmptyString(spec.splitReason) ? spec.splitReason.trim() : (status === "needs-split" ? blockerOrSplitReason : ""),
    splitCriteria: normalizeStringList(spec.splitCriteria),
    status,
    confidence: VALID_CONFIDENCE.has(spec.confidence) ? spec.confidence : "medium",
    createdAt: now,
    updatedAt: now
  };
}

function parseSurfaceIds(value) {
  if (!isNonEmptyString(value)) return [];
  const raw = value.trim();
  if (raw.startsWith("[")) {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("--surface-ids JSON must be an array");
    return normalizeStringList(parsed);
  }
  return normalizeStringList(raw.split(","));
}

function markCapabilityRowsForSurfaces({ surfaceRows, capabilityRows, surfaceIds, capabilitySpecs }) {
  const selectedSurfaceIds = normalizeStringList(surfaceIds);
  if (selectedSurfaceIds.length === 0) throw new Error("Capability Map fill requires --surface-ids");
  if (!Array.isArray(capabilitySpecs) || capabilitySpecs.length === 0) {
    throw new Error("Capability Map fill requires at least one capability spec");
  }

  const surfaceById = new Map(surfaceRows.map(row => [row.surfaceId, row]));
  for (const surfaceId of selectedSurfaceIds) {
    const surface = surfaceById.get(surfaceId);
    if (!surface) throw new Error(`Unknown Surface / Function Map row: ${surfaceId}`);
    if (!isReadySurface(surface)) throw new Error(`Surface is not ready for Capability Map: ${surfaceId}`);
  }

  const nextRows = capabilitySpecs.map(spec => createAgentMarkedCapabilityRow(surfaceById, selectedSurfaceIds, spec));
  const covered = new Set(nextRows.flatMap(row => row.upstreamSurfaceIds));
  const missing = selectedSurfaceIds.filter(surfaceId => !covered.has(surfaceId));
  if (missing.length > 0) {
    throw new Error(`Capability specs did not cover selected surface ID(s): ${missing.join(", ")}`);
  }

  const selected = new Set(selectedSurfaceIds);
  const replacedRows = capabilityRows.filter(row => (row.upstreamSurfaceIds || []).some(surfaceId => selected.has(surfaceId)));
  const replacedIds = new Set(replacedRows.map(row => row.capabilityId));
  const revisionCount = replacedRows.filter(row => row.status !== "pending" || rowHasBlockingFlag(row)).length;
  const output = capabilityRows.filter(row => !(row.upstreamSurfaceIds || []).some(surfaceId => selected.has(surfaceId)));
  output.push(...nextRows);
  output.sort((left, right) => {
    const leftPath = left.surfaceRefs?.[0]?.path || left.upstreamSurfaceIds?.[0] || left.capabilityId;
    const rightPath = right.surfaceRefs?.[0]?.path || right.upstreamSurfaceIds?.[0] || right.capabilityId;
    return leftPath.localeCompare(rightPath) || left.capabilityId.localeCompare(right.capabilityId);
  });

  return {
    rows: output,
    markedSurfaceIds: selectedSurfaceIds,
    capabilityCount: nextRows.length,
    revisionCount,
    replacedCapabilityIds: [...replacedIds]
  };
}

function rowHasBlockingFlag(row) {
  return Array.isArray(row?.reviewFlags) && row.reviewFlags.some(flag => flag.severity === "blocking");
}

function nextCapabilityMapTarget({ surfaceRows, capabilityRows }) {
  const surfaceById = new Map(surfaceRows.map(row => [row.surfaceId, row]));
  const candidates = capabilityRows
    .filter(row => row.status === "pending" || row.status === "mapped" || rowHasBlockingFlag(row))
    .map(row => {
      const firstSurfaceId = row.upstreamSurfaceIds?.[0];
      const surface = surfaceById.get(firstSurfaceId) || null;
      return { row, surface };
    })
    .filter(candidate => candidate.surface && isReadySurface(candidate.surface))
    .sort((left, right) => {
      const leftRank = rowHasBlockingFlag(left.row) ? 0 : left.row.status === "mapped" ? 1 : 2;
      const rightRank = rowHasBlockingFlag(right.row) ? 0 : right.row.status === "mapped" ? 1 : 2;
      if (leftRank !== rightRank) return leftRank - rightRank;
      return surfaceDisplayPath(left.surface).localeCompare(surfaceDisplayPath(right.surface)) ||
        left.row.capabilityId.localeCompare(right.row.capabilityId);
    });
  if (candidates.length === 0) return null;
  const target = candidates[0];
  return {
    capabilityId: target.row.capabilityId,
    status: target.row.status,
    surfaceId: target.surface.surfaceId,
    surfaceKind: target.surface.surfaceKind,
    label: target.surface.label,
    path: surfaceDisplayPath(target.surface),
    actorHints: target.surface.actorHints || [],
    consumerHints: target.surface.consumerHints || [],
    dataObjects: target.surface.dataObjects || [],
    stateHints: target.surface.stateHints || [],
    ruleHints: target.surface.ruleHints || [],
    externalSystems: target.surface.externalSystems || [],
    reviewFlags: target.row.reviewFlags || []
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

function validateCapabilityRowShape(row, prefix, results) {
  if (row?.schema !== "foundation.backfill.capability-map-row.v1") {
    results.push(fail(`${prefix}:schema`, "Capability row schema is invalid", { schema: row?.schema }));
  }
  if (!isNonEmptyString(row?.runId)) results.push(fail(`${prefix}:run-id`, "Capability row requires runId"));
  if (!isNonEmptyString(row?.capabilityId)) results.push(fail(`${prefix}:capability-id`, "Capability row requires capabilityId"));
  if (!isNonEmptyString(row?.name)) results.push(fail(`${prefix}:name`, "Capability row requires name"));
  if (row?.queueEligible !== true && row?.queueEligible !== false) {
    results.push(fail(`${prefix}:queue-eligible`, "Capability row requires boolean queueEligible"));
  }
  if (!isNonEmptyString(capabilityTitleFor(row))) {
    results.push(fail(`${prefix}:capability-title`, "Capability row requires capabilityTitle"));
  }
  if (!VALID_CAPABILITY_STATUSES.has(row?.status)) {
    results.push(fail(`${prefix}:status`, "Capability status is outside enum", { status: row?.status }));
  }
  if (!VALID_CONFIDENCE.has(row?.confidence)) {
    results.push(fail(`${prefix}:confidence`, "Capability confidence is outside enum", { confidence: row?.confidence }));
  }
  for (const field of [
    "upstreamSurfaceIds",
    "actions",
    "states",
    "rules",
    "backingContracts",
    "failureAndRecovery",
    "evidence",
    "technicalSections",
    "verificationTargets",
    "blockingGaps",
    "humanDecisions",
    "splitCriteria"
  ]) {
    if (!Array.isArray(row?.[field])) results.push(fail(`${prefix}:${field}`, `${field} must be an array`));
  }
  const jobSections = preferredField(row, "jobSections", "descriptiveSections");
  if (!Array.isArray(jobSections)) {
    results.push(fail(`${prefix}:jobSections`, "jobSections must be an array"));
  }
  if (!Array.isArray(row?.upstreamSurfaceRefs) || !row.upstreamSurfaceRefs.every(ref => ref && typeof ref === "object" && !Array.isArray(ref))) {
    results.push(fail(`${prefix}:upstream-surface-refs`, "upstreamSurfaceRefs must be an array of objects"));
  }
  if (!Array.isArray(row?.surfaceRefs) || !row.surfaceRefs.every(ref => ref && typeof ref === "object" && !Array.isArray(ref))) {
    results.push(fail(`${prefix}:surface-refs`, "surfaceRefs must be an array of objects"));
  }
  if (!Array.isArray(row?.evidenceRefs) || row.evidenceRefs.length === 0) {
    results.push(fail(`${prefix}:evidence-refs`, "Capability rows require evidenceRefs"));
  }
  validateReviewFlags(row, prefix, results);
  validateCapabilityModel(row, prefix, results);

  if (TERMINAL_CAPABILITY_STATUSES.has(row?.status) && row?.status !== "blocked") {
    for (const field of ["actor", "intendedOutcome", "domainObject", "experience"]) {
      if (!isNonEmptyString(row?.[field])) results.push(fail(`${prefix}:${field}`, `Terminal capability row requires ${field}`));
    }
    for (const field of ["actions", "states", "rules", "backingContracts", "failureAndRecovery", "evidence"]) {
      if (!isStringArray(row?.[field]) || row[field].length === 0) {
        results.push(fail(`${prefix}:${field}:terminal`, `Terminal capability row requires non-empty ${field}`));
      }
    }
  }

  if (row?.status === "ready-for-queue" && row?.splitNeeded === true) {
    results.push(fail(`${prefix}:ready-split-needed`, "ready-for-queue rows cannot have splitNeeded true"));
  }
  if (row?.status === "needs-split") {
    if (row?.splitNeeded !== true) results.push(fail(`${prefix}:needs-split-flag`, "needs-split rows require splitNeeded true"));
    if (!isNonEmptyString(row?.splitReason) && !isNonEmptyString(row?.blockerOrSplitReason)) results.push(fail(`${prefix}:split-reason`, "needs-split rows require splitReason"));
    if (!isStringArray(row?.splitCriteria) || row.splitCriteria.length === 0) {
      results.push(fail(`${prefix}:split-criteria`, "needs-split rows require splitCriteria"));
    }
  }
  if (row?.status === "blocked" && !capabilityHasBlockingDetail(row)) {
    results.push(fail(`${prefix}:blocked-detail`, "Blocked capability rows require blockerOrSplitReason, blockingGaps, humanDecisions, notCapabilityReason, or a blocking review flag"));
  }
}

function validateCapabilityModel(row, prefix, results) {
  const altitude = capabilityAltitudeFor(row);
  const title = capabilityTitleFor(row);
  const terminal = TERMINAL_CAPABILITY_STATUSES.has(row?.status);
  if (terminal && !VALID_CAPABILITY_ALTITUDES.has(altitude)) {
    results.push(fail(`${prefix}:capability-altitude`, "Terminal capability rows require capabilityAltitude parent, child, sole, needs-split, or blocked", { capabilityAltitude: row?.capabilityAltitude || null }));
    return;
  }
  if (altitude && row?.capabilityAltitude !== altitude) {
    results.push(fail(`${prefix}:capability-altitude-normalized`, "capabilityAltitude must use the normalized Foundation capability model enum", { expected: altitude, actual: row?.capabilityAltitude || null }));
  }
  if (altitude === "parent" && isNonEmptyString(row?.parentCapabilityId)) {
    results.push(fail(`${prefix}:parent-has-parent`, "Parent capability rows cannot name their own parentCapabilityId"));
  }
  if (altitude === "child" && !isNonEmptyString(row?.parentCapabilityId)) {
    results.push(fail(`${prefix}:child-parent-id`, "Child capability rows require parentCapabilityId"));
  }
  if (altitude === "child" && !isNonEmptyString(row?.parentCapabilityName)) {
    results.push(fail(`${prefix}:child-parent-name`, "Child capability rows require parentCapabilityName"));
  }
  if (altitude === "sole" && isNonEmptyString(row?.parentCapabilityId)) {
    results.push(fail(`${prefix}:sole-parent-id`, "Sole capability rows cannot carry parentCapabilityId"));
  }
  if (altitude === "needs-split" && row?.status !== "needs-split") {
    results.push(fail(`${prefix}:needs-split-status`, "needs-split capabilityAltitude requires status needs-split"));
  }
  if (altitude === "blocked" && row?.status !== "blocked") {
    results.push(fail(`${prefix}:blocked-status`, "blocked capabilityAltitude requires status blocked"));
  }
  if (row?.queueEligible === true && !isQueueEligibleCapability(row)) {
    results.push(fail(`${prefix}:queue-eligible-model`, "Only ready child or sole capability rows may be queueEligible"));
  }
  if (QUEUE_ELIGIBLE_CAPABILITY_ALTITUDES.has(altitude) && row?.status === "ready-for-queue" && row?.queueEligible !== true) {
    results.push(fail(`${prefix}:queue-eligible-required`, "Ready child or sole capability rows must set queueEligible true"));
  }
  if ((altitude === "parent" || altitude === "needs-split" || altitude === "blocked") && row?.queueEligible === true) {
    results.push(fail(`${prefix}:queue-eligible-forbidden`, "Parent, needs-split, and blocked capability rows are not queueable"));
  }
  if (titleLooksLikeNonCapability(title) && !isNonEmptyString(row?.notCapabilityReason)) {
    results.push(fail(`${prefix}:not-capability-reason`, "Artifact, interface, process, action, job, layer, route, command, screen, table, phase, or queue names require notCapabilityReason instead of passing as capabilities", { capabilityTitle: title }));
  }
  if (isNonEmptyString(row?.notCapabilityReason) && row?.queueEligible === true) {
    results.push(fail(`${prefix}:not-capability-queue`, "Rows with notCapabilityReason cannot be queueEligible"));
  }
}

function validateCapabilityRows({ surfaceRows, capabilityRows, phase = "handoff" }) {
  const results = [];
  const surfaceById = new Map(surfaceRows.map(row => [row.surfaceId, row]));
  const rowsBySurface = new Map();
  const pending = [];
  const mapped = [];
  const needsSplit = [];
  const blockingFlags = [];
  const stale = [];
  const badSurfaceRefs = [];
  const parentRows = [];
  const childRows = [];
  const parentOnlyCoverageFailures = [];

  results.push(validateUnique(capabilityRows, "capabilityId", "capability"));

  for (const [index, row] of capabilityRows.entries()) {
    const prefix = `capability:${row?.capabilityId || index + 1}`;
    validateCapabilityRowShape(row, prefix, results);
    if (row.status === "pending") pending.push(row.capabilityId);
    if (row.status === "mapped") mapped.push(row.capabilityId);
    if (row.status === "needs-split") needsSplit.push(row.capabilityId);
    if (rowHasBlockingFlag(row)) blockingFlags.push(row.capabilityId);
    const altitude = capabilityAltitudeFor(row);
    if (altitude === "parent") parentRows.push(row);
    if (altitude === "child") childRows.push(row);

    for (const surfaceId of row.upstreamSurfaceIds || []) {
      if (!rowsBySurface.has(surfaceId)) rowsBySurface.set(surfaceId, []);
      rowsBySurface.get(surfaceId).push(row);
      const surface = surfaceById.get(surfaceId);
      if (!surface) {
        results.push(fail(`${prefix}:upstream-surface-resolves`, "Capability row references missing Surface / Function Map row", { surfaceId }));
      } else if (!isReadySurface(surface)) {
        badSurfaceRefs.push({ capabilityId: row.capabilityId, surfaceId, status: surface.status, surfaceKind: surface.surfaceKind });
      }
    }

    for (const ref of row.upstreamSurfaceRefs || []) {
      const surface = surfaceById.get(ref.surfaceId);
      if (!surface) continue;
      if (ref.surfaceFingerprint !== surfaceFingerprint(surface)) {
        stale.push({ capabilityId: row.capabilityId, surfaceId: ref.surfaceId, label: ref.label });
      }
    }
  }

  results.push(stale.length === 0
    ? pass("capability-upstream-fresh", "Capability upstream surface fingerprints match Surface / Function Map rows")
    : fail("capability-upstream-fresh", "Capability rows must be refreshed when upstream Surface / Function Map rows change", { stale }));

  results.push(badSurfaceRefs.length === 0
    ? pass("capability-upstream-ready", "Capability rows only reference ready-for-capability Surface / Function Map rows")
    : fail("capability-upstream-ready", "Capability rows must not claim support, pending, or failed surface rows", { badSurfaceRefs }));

  const uncovered = [];
  for (const surface of readySurfaceRows(surfaceRows)) {
    const attached = rowsBySurface.get(surface.surfaceId) || [];
    const hasQueueableOutcome = attached.some(isQueueEligibleCapability);
    const hasBlockedOutcome = attached.some(row => capabilityAltitudeFor(row) === "blocked" && capabilityHasBlockingDetail(row));
    const hasParent = attached.some(row => capabilityAltitudeFor(row) === "parent");
    if (hasParent && !hasQueueableOutcome && !hasBlockedOutcome) {
      parentOnlyCoverageFailures.push({ surfaceId: surface.surfaceId, label: surface.label, path: surfaceDisplayPath(surface) });
    }
    if (!hasQueueableOutcome && !hasBlockedOutcome) {
      uncovered.push({ surfaceId: surface.surfaceId, label: surface.label, path: surfaceDisplayPath(surface) });
    }
  }
  if (uncovered.length === 0) {
    results.push(pass("capability-covers-ready-surfaces", "Every ready Surface / Function Map row maps to a queue-eligible child/sole capability or an explicit blocker"));
  } else if (phase === "handoff") {
    results.push(fail("capability-covers-ready-surfaces", "Capability Map must cover every ready Surface / Function Map row with a queue-eligible child/sole capability or explicit blocker before Define Spec Jobs", { uncovered }));
  } else {
    results.push(warn("capability-covers-ready-surfaces", `${uncovered.length} ready Surface / Function Map row(s) still need capability coverage`, { uncovered }));
  }
  results.push(parentOnlyCoverageFailures.length === 0
    ? pass("capability-no-parent-only-surface-coverage", "No ready surface is covered only by a parent capability")
    : fail("capability-no-parent-only-surface-coverage", "Parent capability rows cannot be the only coverage for behavior-bearing surfaces", { parentOnlyCoverageFailures }));

  const parentById = new Map(parentRows.map(row => [row.capabilityId, row]));
  const childParentIds = new Set(childRows.map(row => row.parentCapabilityId).filter(isNonEmptyString));
  const missingParents = childRows
    .filter(row => !parentById.has(row.parentCapabilityId))
    .map(row => ({ capabilityId: row.capabilityId, name: row.name, parentCapabilityId: row.parentCapabilityId }));
  results.push(missingParents.length === 0
    ? pass("capability-child-parent-resolves", "Every child capability resolves to a parent capability row")
    : fail("capability-child-parent-resolves", "Child capability rows must resolve parentCapabilityId to a parent row", { missingParents }));
  const parentWithoutChildren = parentRows
    .filter(row => !childParentIds.has(row.capabilityId))
    .map(row => ({ capabilityId: row.capabilityId, name: row.name }));
  results.push(parentWithoutChildren.length === 0
    ? pass("capability-parent-has-child-outcomes", "Every parent capability decomposes to child capabilities")
    : fail("capability-parent-has-child-outcomes", "Parent capability rows must decompose into child capability rows", { parentWithoutChildren }));

  if (phase === "handoff") {
    results.push(pending.length === 0
      ? pass("handoff-no-pending-capabilities", "No pending capability rows remain")
      : fail("handoff-no-pending-capabilities", "Handoff requires zero pending capability rows", { pending }));
    results.push(mapped.length === 0
      ? pass("handoff-no-mapped-intermediate-capabilities", "No mapped intermediate capability rows remain")
      : fail("handoff-no-mapped-intermediate-capabilities", "Handoff requires zero mapped intermediate capability rows", { mapped }));
    results.push(needsSplit.length === 0
      ? pass("handoff-no-needs-split-capabilities", "No needs-split capability rows remain")
      : fail("handoff-no-needs-split-capabilities", "Handoff requires broad capability rows to be split into parent plus child/sole outcomes before Define Spec Jobs", { needsSplit }));
    results.push(blockingFlags.length === 0
      ? pass("handoff-no-blocking-capability-flags", "No blocking capability review flags remain")
      : fail("handoff-no-blocking-capability-flags", "Handoff requires no blocking capability review flags", { blockingFlags }));
  } else {
    results.push(warn("batch-pending-capabilities-allowed", `${pending.length} pending capability row(s) remain in batch phase`, { pendingCount: pending.length }));
  }

  return results;
}

function validateCapabilityReportState({ repoRoot, runId, outDir, reportPath, surfaceRows, capabilityRows }) {
  if (!reportPath) return [];
  if (!fs.existsSync(reportPath)) return [fail("capability-report-exists", "Report path passed to checker does not exist", { reportPath })];
  const html = fs.readFileSync(reportPath, "utf8");
  const state = parseJsonScript(html, "backfill-capability-map-state");
  if (!state) return [fail("capability-report-state", "Report is missing backfill-capability-map-state JSON script")];
  const evalSummary = readEvalSummary(capabilityEvalReceiptPathFor(repoRoot, runId, outDir));
  const evalRevisionTargetCount = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets.length : 0;
  const evalFindings = Array.isArray(evalSummary?.findings) ? evalSummary.findings : [];
  const checkPath = capabilityCheckPathFor(repoRoot, runId, outDir);
  const check = fs.existsSync(checkPath) ? readJson(checkPath) : null;
  const checkerPass = check?.summary?.fail === 0;
  const evalPass = Boolean(evalSummary?.acceptabilityGate?.acceptable);
  const evalHandoffReady = evalPass && evalRevisionTargetCount === 0;
  const pendingCount = capabilityRows.filter(row => row.status === "pending").length;
  const mappedCount = capabilityRows.filter(row => row.status === "mapped").length;
  const blockingFlagCount = capabilityRows.filter(row => (row.reviewFlags || []).some(flag => flag.severity === "blocking")).length;
  const modelCounts = capabilityModelCounts(capabilityRows);
  const parentOnlyCoverageFailures = parentOnlyCoverageFailuresFor(surfaceRows, capabilityRows);
  const expected = {
    registryPath: path.relative(repoRoot, capabilityMapPathFor(repoRoot, runId, outDir)),
    checkerPath: path.relative(repoRoot, checkPath),
    checkerResult: checkerPass ? "pass" : "fail-or-missing",
    evalReceiptPath: path.relative(repoRoot, capabilityEvalReceiptPathFor(repoRoot, runId, outDir)),
    summaryPath: path.relative(repoRoot, capabilitySummaryPathFor(repoRoot, runId, outDir)),
    evalResult: evalHandoffReady ? "pass" : (evalPass ? "pass-with-revisions" : "fail-or-missing"),
    evalScore: evalSummary?.totalScore ?? null,
    evalRevisionTargetCount,
    evalWarningCount: evalFindings.filter(finding => finding?.severity === "warning").length,
    evalBlockingFindingCount: evalFindings.filter(finding => finding?.severity === "blocking").length,
    readySurfaceCount: readySurfaceRows(surfaceRows).length,
    pendingCount,
    mappedCount,
    readyForQueueCount: capabilityRows.filter(row => row.status === "ready-for-queue").length,
    needsSplitCount: modelCounts.needsSplitCount,
    parentCapabilityCount: modelCounts.parentCapabilityCount,
    childCapabilityCount: modelCounts.childCapabilityCount,
    soleCapabilityCount: modelCounts.soleCapabilityCount,
    blockedCapabilityCount: modelCounts.blockedCapabilityCount,
    queueEligibleCapabilityCount: modelCounts.queueEligibleCapabilityCount,
    parentOnlyCoverageFailures: parentOnlyCoverageFailures.length,
    blockingFlagCount,
    capabilityCount: capabilityRows.length,
    nextLayer: pendingCount === 0 && mappedCount === 0 && modelCounts.needsSplitCount === 0 && parentOnlyCoverageFailures.length === 0 && blockingFlagCount === 0 && checkerPass && evalHandoffReady
      ? "Define Spec Jobs"
      : "Capability Map revision"
  };
  const drift = [];
  for (const [field, value] of Object.entries(expected)) {
    if (state[field] !== value) drift.push({ field, expected: value, actual: state[field] });
  }
  return drift.length === 0
    ? [pass("capability-report-state-current", "Capability Map report state matches canonical artifacts")]
    : [fail("capability-report-state-current", "Capability Map report state must match canonical artifacts", { drift })];
}

function validateCapabilityMap({ repoRoot, runId, outDir = defaultBackfillDir(repoRoot), phase = "handoff", reportPath = null }) {
  const upstream = validateSurfaceFunctionMapHandoff(repoRoot, runId, outDir);
  const results = [...upstream.results];
  const registryPath = capabilityMapPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(registryPath)) {
    return {
      registryPath,
      surfaceFunctionMapPath: upstream.surfaceFunctionMapPath,
      surfaceRows: upstream.surfaceRows,
      capabilityRows: [],
      results: [...results, fail("capability-map-exists", `Capability Map does not exist: ${registryPath}`)]
    };
  }
  const parsed = readJsonl(registryPath);
  results.push(pass("capability-map-exists", "Capability Map exists"));
  if (parsed.errors.length > 0) {
    results.push(...parsed.errors.map(error => fail(`capability-jsonl:${error.line}`, "Capability Map JSONL line must parse", error)));
    return { registryPath, surfaceFunctionMapPath: upstream.surfaceFunctionMapPath, surfaceRows: upstream.surfaceRows, capabilityRows: parsed.rows, results };
  }
  results.push(pass("capability-jsonl", "Every Capability Map line parses as JSON"));
  results.push(...validateCapabilityRows({ surfaceRows: upstream.surfaceRows, capabilityRows: parsed.rows, phase }));
  results.push(...validateCapabilityReportState({ repoRoot, runId, outDir, reportPath, surfaceRows: upstream.surfaceRows, capabilityRows: parsed.rows }));
  return {
    registryPath,
    surfaceFunctionMapPath: upstream.surfaceFunctionMapPath,
    surfaceRows: upstream.surfaceRows,
    capabilityRows: parsed.rows,
    results
  };
}

function selectCapabilityEvalSample(capabilityRows, mode = "risk") {
  if (mode === "all" || capabilityRows.length <= 120) return capabilityRows;
  const selected = new Map();
  for (const row of capabilityRows) {
    if (!TERMINAL_CAPABILITY_STATUSES.has(row.status)) selected.set(row.capabilityId, row);
    if (row.status === "needs-split" || row.reviewFlags?.length > 0) selected.set(row.capabilityId, row);
  }
  for (const row of capabilityRows) {
    const stratum = `${row.actor}:${row.domainObject}:${row.status}`;
    if (![...selected.values()].some(existing => `${existing.actor}:${existing.domainObject}:${existing.status}` === stratum)) {
      selected.set(row.capabilityId, row);
    }
  }
  return [...selected.values()].sort((left, right) => left.capabilityId.localeCompare(right.capabilityId));
}

function textIsVague(value) {
  if (!isNonEmptyString(value)) return true;
  const words = value.toLowerCase().match(/[a-z0-9]+/g) || [];
  if (words.length < 4) return true;
  return words.some(word => GENERIC_WORDS.has(word)) && words.length < 8;
}

function listIsSpecific(value) {
  return Array.isArray(value) && value.length > 0 && value.every(item => isNonEmptyString(item) && item.trim().length >= 3);
}

function scoreCapabilityRow(row, surfaceById) {
  const findings = [];
  const categoryScores = {
    formulaCompleteness: 20,
    surfaceTraceability: 20,
    specificity: 20,
    splitDiscipline: 20,
    evidenceSupport: 20
  };

  for (const field of ["actor", "intendedOutcome", "domainObject", "experience"]) {
    if (!isNonEmptyString(row[field])) {
      findings.push({ category: "formulaCompleteness", severity: "blocking", message: `Capability row is missing ${field}.` });
      categoryScores.formulaCompleteness = 0;
    }
  }
  for (const field of ["actions", "states", "rules", "backingContracts", "failureAndRecovery"]) {
    if (!listIsSpecific(row[field])) {
      findings.push({ category: "formulaCompleteness", severity: "blocking", message: `Capability row is missing usable ${field}.` });
      categoryScores.formulaCompleteness = 0;
    }
  }

  const surfaces = (row.upstreamSurfaceIds || []).map(id => surfaceById.get(id)).filter(Boolean);
  const altitude = capabilityAltitudeFor(row);
  if (TERMINAL_CAPABILITY_STATUSES.has(row.status) && !VALID_CAPABILITY_ALTITUDES.has(altitude)) {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "Capability row lacks a valid capabilityAltitude." });
    categoryScores.splitDiscipline = 0;
  }
  if (row.queueEligible === true && !isQueueEligibleCapability(row)) {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "Only ready child or sole capabilities may be queueEligible." });
    categoryScores.splitDiscipline = 0;
  }
  if (altitude === "parent" && row.queueEligible === true) {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "Parent capability rows organize children and cannot be queued as work." });
    categoryScores.splitDiscipline = 0;
  }
  if (altitude === "needs-split") {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "needs-split rows are revision targets and must be split before handoff." });
    categoryScores.splitDiscipline = 0;
  }
  if (titleLooksLikeNonCapability(capabilityTitleFor(row)) && row.queueEligible === true) {
    findings.push({ category: "specificity", severity: "blocking", message: "Artifact, layer, phase, route, command, queue, job, screen, or table names cannot pass as queueable capabilities." });
    categoryScores.specificity = 0;
  }
  if (surfaces.length === 0) {
    findings.push({ category: "surfaceTraceability", severity: "blocking", message: "Capability row has no resolvable upstream surfaces." });
    categoryScores.surfaceTraceability = 0;
  } else if (!surfaces.every(isReadySurface)) {
    findings.push({ category: "surfaceTraceability", severity: "blocking", message: "Capability row references upstream surfaces that are not ready for capability." });
    categoryScores.surfaceTraceability = 0;
  }
  if (!Array.isArray(row.evidenceRefs) || row.evidenceRefs.length === 0) {
    findings.push({ category: "surfaceTraceability", severity: "blocking", message: "Capability row lacks evidenceRefs." });
    categoryScores.surfaceTraceability = 0;
  }

  if (textIsVague(row.name) || textIsVague(row.intendedOutcome) || textIsVague(row.domainObject)) {
    findings.push({ category: "specificity", severity: "warning", message: "Capability name, outcome, or object is too vague." });
    categoryScores.specificity = Math.min(categoryScores.specificity, 18);
  }
  if ((row.actions || []).some(textIsVague) || (row.rules || []).some(textIsVague)) {
    findings.push({ category: "specificity", severity: "warning", message: "Some actions or rules are generic; name concrete behavior." });
    categoryScores.specificity = Math.min(categoryScores.specificity, 18);
  }

  const surfaceKinds = new Set(surfaces.map(surface => surface.surfaceKind));
  const actorHints = new Set(surfaces.flatMap(surface => surface.actorHints || surface.consumerHints || []));
  const broadByCount = surfaces.length > 8 || surfaceKinds.size > 4 || actorHints.size > 6;
  if (row.status === "ready-for-queue" && broadByCount) {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "Capability appears broad but is ready-for-queue instead of needs-split." });
    categoryScores.splitDiscipline = 0;
  }
  if (row.status === "needs-split" && (!isNonEmptyString(row.splitReason) || !listIsSpecific(row.splitCriteria))) {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "needs-split capability lacks splitReason or splitCriteria." });
    categoryScores.splitDiscipline = 0;
  }
  if (row.status === "pending" || row.status === "mapped" || rowHasBlockingFlag(row)) {
    findings.push({ category: "splitDiscipline", severity: "blocking", message: "Capability row is not in a terminal handoff state." });
    categoryScores.splitDiscipline = 0;
  }

  if (!listIsSpecific(row.evidence)) {
    findings.push({ category: "evidenceSupport", severity: "blocking", message: "Capability row needs concrete evidence entries." });
    categoryScores.evidenceSupport = 0;
  }
  const evidenceText = `${(row.evidence || []).join(" ")} ${(row.evidenceRefs || []).map(ref => ref.detail || "").join(" ")}`;
  const unsupported = surfaces.filter(surface => {
    const label = surface.label || "";
    const p = surfaceDisplayPath(surface);
    return !evidenceText.includes(label) && !evidenceText.includes(p) && !evidenceText.includes(surface.surfaceId);
  });
  if (unsupported.length > 0) {
    findings.push({ category: "evidenceSupport", severity: "warning", message: "Some upstream surfaces are not named in evidence text." });
    categoryScores.evidenceSupport = Math.min(categoryScores.evidenceSupport, 18);
  }

  const score = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  return {
    subjectRowId: row.capabilityId,
    name: row.name,
    status: row.status,
    upstreamSurfaceIds: row.upstreamSurfaceIds || [],
    categoryScores,
    score,
    findings,
    acceptabilityGate: {
      acceptable: findings.every(finding => finding.severity !== "blocking") && score >= 90,
      threshold: "No blocking findings for row-level capability receipt"
    }
  };
}

function aggregateCapabilityEval(checkResults, rowReceipts) {
  const checkSummary = summarizeResults(checkResults);
  if (rowReceipts.length === 0) {
    const categoryScores = {
      upstreamCoverageAndFreshness: checkSummary.fail === 0 ? 20 : 0,
      formulaCompleteness: 20,
      specificity: 20,
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
    formulaCompleteness: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.formulaCompleteness), 20),
    specificity: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.specificity), 20),
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

function mergeCapabilityRowsForRefresh({ surfaceRows, existingCapabilityRows }) {
  const ready = readySurfaceRows(surfaceRows);
  const readyById = new Map(ready.map(row => [row.surfaceId, row]));
  const covered = new Set();
  const changed = [];
  const removed = [];
  const output = [];

  for (const row of existingCapabilityRows) {
    const ids = row.upstreamSurfaceIds || [];
    const missing = ids.filter(id => !readyById.has(id));
    if (missing.length > 0) {
      removed.push(row.capabilityId);
      continue;
    }
    const stale = (row.upstreamSurfaceRefs || []).some(ref => {
      const surface = readyById.get(ref.surfaceId);
      return !surface || ref.surfaceFingerprint !== surfaceFingerprint(surface);
    });
    if (stale) {
      changed.push(...ids);
      for (const id of ids) output.push(createPendingCapabilityRow(readyById.get(id)));
      continue;
    }
    ids.forEach(id => covered.add(id));
    output.push(row);
  }

  for (const surface of ready) {
    if (covered.has(surface.surfaceId) || changed.includes(surface.surfaceId)) continue;
    const alreadyPending = output.some(row => (row.upstreamSurfaceIds || []).includes(surface.surfaceId));
    if (!alreadyPending) {
      changed.push(surface.surfaceId);
      output.push(createPendingCapabilityRow(surface));
    }
  }

  output.sort((left, right) => {
    const leftPath = left.surfaceRefs?.[0]?.path || left.upstreamSurfaceIds?.[0] || left.capabilityId;
    const rightPath = right.surfaceRefs?.[0]?.path || right.upstreamSurfaceIds?.[0] || right.capabilityId;
    return leftPath.localeCompare(rightPath) || left.capabilityId.localeCompare(right.capabilityId);
  });
  return { rows: output, changed: [...new Set(changed)], removed };
}

function toReportCapability(row) {
  return {
    id: row.capabilityId,
    name: row.name,
    capabilityTitle: capabilityTitleFor(row),
    capabilityAltitude: capabilityAltitudeFor(row),
    parentCapabilityId: row.parentCapabilityId || null,
    parentCapabilityName: row.parentCapabilityName || null,
    queueEligible: isQueueEligibleCapability(row),
    notCapabilityReason: row.notCapabilityReason || "",
    blockerOrSplitReason: row.blockerOrSplitReason || row.splitReason || "",
    actor: row.actor,
    intendedOutcome: row.intendedOutcome,
    domainObject: row.domainObject,
    actions: row.actions,
    states: row.states,
    permissionsAndRules: row.rules,
    surfaces: (row.surfaceRefs || []).map(ref => ref.path || ref.label || ref.surfaceId).filter(Boolean),
    backingContracts: row.backingContracts,
    failureAndRecovery: row.failureAndRecovery,
    evidence: row.evidence,
    jobSpec: preferredField(row, "jobSpec", "descriptiveSpec"),
    technicalSpec: row.technicalSpec,
    jobSections: preferredField(row, "jobSections", "descriptiveSections") || [],
    technicalSections: row.technicalSections,
    verificationTargets: row.verificationTargets,
    blockingGaps: row.blockingGaps,
    humanDecisions: row.humanDecisions,
    status: row.status,
    splitNeeded: row.splitNeeded,
    splitReason: row.splitReason,
    splitCriteria: row.splitCriteria,
    upstreamSurfaceIds: row.upstreamSurfaceIds
  };
}

function buildCapabilityMapPayload({ runId, repoRoot, capabilityRows }) {
  return {
    schema: "foundation.backfill.capability-map.v1",
    runId,
    targetRepo: path.basename(repoRoot),
    capabilities: capabilityRows.map(toReportCapability)
  };
}

export {
  VALID_CAPABILITY_STATUSES,
  VALID_CAPABILITY_ALTITUDES,
  VALID_CONFIDENCE,
  VALID_REVIEW_FLAG_SEVERITY,
  appendRunLogEvent,
  aggregateCapabilityEval,
  buildCapabilityMapPayload,
  capabilityAltitudeFor,
  capabilityCheckPathFor,
  capabilityEvalReceiptPathFor,
  capabilityMapPathFor,
  capabilityRefreshPathFor,
  capabilitySummaryPathFor,
  capabilityModelCounts,
  createAgentMarkedCapabilityRow,
  createInitialCapabilityRows,
  createPendingCapabilityRow,
  defaultBackfillDir,
  ensureDir,
  isReadySurface,
  isQueueEligibleCapability,
  markCapabilityRowsForSurfaces,
  mergeCapabilityRowsForRefresh,
  nextCapabilityMapTarget,
  parseCliArgs,
  parseJsonScript,
  parseSurfaceIds,
  readCapabilityMapRows,
  readJson,
  readJsonl,
  readSurfaceFunctionMapRows,
  readySurfaceRows,
  parentOnlyCoverageFailuresFor,
  renderResultsText,
  scoreCapabilityRow,
  selectCapabilityEvalSample,
  summarizeResults,
  validateCapabilityMap,
  validateSurfaceFunctionMapHandoff,
  writeJson,
  writeJsonl
};
