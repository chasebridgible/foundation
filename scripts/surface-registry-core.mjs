#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  appendRunLogEvent,
  checkPathFor as fileRegistryCheckPathFor,
  defaultBackfillDir,
  ensureDir,
  evalReceiptPathFor as fileRegistryEvalReceiptPathFor,
  isBehaviorBearingRow,
  parseCliArgs,
  pass,
  fail,
  warn,
  readJson,
  readJsonl,
  registryPathFor as fileRegistryPathFor,
  renderResultsText,
  summarizeResults,
  writeJson,
  writeJsonl
} from "./file-registry-core.mjs";

const VALID_SURFACE_STATUSES = new Set(["pending", "mapped", "needs-evidence", "ready-for-capability"]);
const VALID_SURFACE_KINDS = new Set([
  "route",
  "screen",
  "api",
  "command",
  "job",
  "table",
  "workflow",
  "infra-resource",
  "doc",
  "test",
  "generated-artifact",
  "external-dependency",
  "support-classification"
]);
const VALID_SOURCE_CATEGORIES = new Set(["exposed", "dependent", "evidence", "support", "review"]);
const VALID_CONFIDENCE = new Set(["low", "medium", "high"]);
const VALID_REVIEW_FLAG_SEVERITY = new Set(["info", "warning", "blocking"]);
const SURFACE_CODE_KINDS = new Set(["route", "component", "service", "model", "migration", "script"]);
const SURFACE_RUNTIME_KINDS = new Set(["package", "infra"]);
const SURFACE_EXCLUDED_KINDS = new Set(["asset", "fixture", "generated", "test"]);

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function surfaceRegistryPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `surface-registry-${runId}.jsonl`);
}

function surfaceCheckPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `surface-registry-check-${runId}.json`);
}

function surfaceEvalReceiptPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `surface-registry-eval-${runId}.jsonl`);
}

function surfaceEvalSummaryPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `surface-registry-eval-summary-${runId}.html`);
}

function surfaceRefreshPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `surface-registry-refresh-${runId}.json`);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isObjectArray(value) {
  return Array.isArray(value) && value.every(item => item && typeof item === "object" && !Array.isArray(item));
}

function stableSurfaceId(fileRow, surfaceKind, label, operation) {
  return `surface:${sha256Text(`${fileRow.fileId}:${surfaceKind}:${label}:${operation}`).slice(0, 24)}`;
}

function upstreamHashRef(fileRow) {
  return {
    fileId: fileRow.fileId,
    path: fileRow.path,
    contentHash: fileRow.contentHash,
    sizeBytes: fileRow.sizeBytes
  };
}

function normalizeRepoPathForScope(value) {
  return isNonEmptyString(value) ? value.trim().replaceAll("\\", "/") : "";
}

function basenameForScope(filePath) {
  const normalized = normalizeRepoPathForScope(filePath);
  const parts = normalized.split("/");
  return parts.at(-1) || normalized;
}

function isLockOrInstallArtifactPath(filePath) {
  const normalized = normalizeRepoPathForScope(filePath).toLowerCase();
  const basename = basenameForScope(normalized);
  return basename === "package-lock.json" ||
    basename === "npm-shrinkwrap.json" ||
    basename === "yarn.lock" ||
    basename === "pnpm-lock.yaml" ||
    basename === "bun.lockb" ||
    basename === "poetry.lock" ||
    basename === "pipfile.lock" ||
    basename === "gemfile.lock" ||
    basename === "cargo.lock" ||
    basename === ".terraform.lock.hcl";
}

function isRuntimeConfigPath(filePath) {
  const normalized = normalizeRepoPathForScope(filePath).toLowerCase();
  const basename = basenameForScope(normalized);
  return basename === "dockerfile" ||
    basename.startsWith("dockerfile.") ||
    basename === "docker-compose.yml" ||
    basename === "docker-compose.yaml" ||
    basename.startsWith("compose.") ||
    basename.endsWith(".service") ||
    basename === "serverless.yml" ||
    basename === "serverless.yaml" ||
    basename === "vercel.json" ||
    basename === "netlify.toml" ||
    basename === "app.json" ||
    basename === "app.config.js" ||
    basename === "app.config.ts" ||
    normalized.includes("/user-data.") ||
    normalized.includes("/runtime/") ||
    normalized.includes("/deployment/");
}

function isActiveBehaviorDocPath(filePath) {
  const normalized = normalizeRepoPathForScope(filePath).toLowerCase();
  const basename = basenameForScope(normalized);
  if (normalized.startsWith("docs/specs/backfill/")) return false;
  if (normalized.startsWith("docs/archive/")) return false;
  if (normalized.startsWith("docs/delete-candidates/")) return false;
  if (normalized.startsWith("docs/knowledge/")) return false;
  return (normalized.startsWith("docs/specs/") && (basename.endsWith(".html") || basename.endsWith(".md"))) ||
    basename === "project_manifest.md" ||
    basename === "software_factory_manifest.md";
}

function surfaceRegistryScopeDecision(fileRow) {
  if (!fileRow || typeof fileRow !== "object") {
    return { eligible: false, reason: "Missing File Registry row." };
  }
  const filePath = normalizeRepoPathForScope(fileRow.path);
  if (!isNonEmptyString(filePath)) {
    return { eligible: false, reason: "File Registry row has no path." };
  }
  if (fileRow.status !== "mapped") {
    return { eligible: false, reason: "File Registry row is not mapped." };
  }
  if (SURFACE_EXCLUDED_KINDS.has(fileRow.kind) || ["asset", "generated", "test-evidence"].includes(fileRow.evidenceValue)) {
    return { eligible: false, reason: `${fileRow.kind || fileRow.evidenceValue} files are evidence artifacts, not Capability Matrix surfaces.` };
  }
  if (fileRow.kind === "fixture" || fileRow.evidenceValue === "support" && /(^|\/)(sample|samples|fixtures?|mocks?)(\/|_|-|$)/i.test(filePath)) {
    return { eligible: false, reason: "Fixtures, samples, and mocks support tests or loaders but do not define repo capabilities." };
  }
  if (isLockOrInstallArtifactPath(filePath)) {
    return { eligible: false, reason: "Lockfiles and install artifacts do not define durable repo surfaces." };
  }
  if (isBehaviorBearingRow(fileRow) || SURFACE_CODE_KINDS.has(fileRow.kind)) {
    return { eligible: true, reason: "Code row can expose or directly support a durable repo surface." };
  }
  if (SURFACE_RUNTIME_KINDS.has(fileRow.kind)) {
    return { eligible: true, reason: "Runtime, package, deployment, or infrastructure row can define an operator or dependency surface." };
  }
  if (fileRow.kind === "config" && isRuntimeConfigPath(filePath)) {
    return { eligible: true, reason: "Runtime configuration can define deployment or operator behavior." };
  }
  if (fileRow.kind === "doc" && isActiveBehaviorDocPath(filePath)) {
    return { eligible: true, reason: "Active product/spec documentation can define intended behavior." };
  }
  return { eligible: false, reason: "File is repository support/evidence and does not define a Capability Matrix surface." };
}

function isSurfaceRegistryEligibleRow(fileRow) {
  return surfaceRegistryScopeDecision(fileRow).eligible;
}

function surfaceRegistryEligibleRows(fileRows) {
  return fileRows.filter(isSurfaceRegistryEligibleRow);
}

function surfaceRegistryScopeCounts(fileRows) {
  const eligible = [];
  const skipped = [];
  for (const fileRow of fileRows) {
    const decision = surfaceRegistryScopeDecision(fileRow);
    if (decision.eligible) eligible.push(fileRow);
    else skipped.push({ fileId: fileRow.fileId, path: fileRow.path, reason: decision.reason });
  }
  return { eligible, skipped };
}

function createPendingSurfaceRow(fileRow) {
  return {
    schema: "foundation.backfill.surface-registry-row.v1",
    runId: fileRow.runId,
    surfaceId: stableSurfaceId(fileRow, "support-classification", `Pending surface extraction for ${fileRow.path}`, "extract"),
    surfaceKind: "support-classification",
    sourceCategory: "review",
    label: `Pending surface extraction for ${fileRow.path}`,
    upstreamFileIds: [fileRow.fileId],
    upstreamPaths: [fileRow.path],
    upstreamContentHashes: [upstreamHashRef(fileRow)],
    evidenceRefs: [{
      fileId: fileRow.fileId,
      path: fileRow.path,
      relationship: "pending-extraction",
      detail: "Initialized from mapped file-registry row."
    }],
    exposedObject: "",
    operation: "",
    consumerHints: [],
    actorHints: [],
    stateHints: [],
    ruleHints: [],
    dataObjects: [],
    externalSystems: [],
    supportReason: "",
    reviewFlags: [],
    status: "pending",
    confidence: "low",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
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

function sourceCategoryForSurfaceKind(surfaceKind, provided) {
  if (isNonEmptyString(provided)) return provided.trim();
  if (surfaceKind === "support-classification") return "support";
  if (surfaceKind === "doc" || surfaceKind === "test" || surfaceKind === "generated-artifact") return "evidence";
  if (surfaceKind === "route" || surfaceKind === "screen" || surfaceKind === "api" || surfaceKind === "command") return "exposed";
  return "dependent";
}

function statusForSurfaceSpec(surfaceKind, provided) {
  if (provided === "needs-evidence") return "needs-evidence";
  if (surfaceKind === "support-classification") return "mapped";
  return "ready-for-capability";
}

function defaultOperationForSurfaceKind(surfaceKind) {
  const operations = {
    route: "routes traffic",
    screen: "renders user-facing UI",
    api: "handles request",
    command: "executes command",
    job: "runs background work",
    table: "stores data",
    workflow: "executes workflow",
    "infra-resource": "provides runtime infrastructure",
    doc: "documents behavior or operation",
    test: "verifies behavior",
    "generated-artifact": "records generated state",
    "external-dependency": "depends on",
    "support-classification": "supports repository behavior"
  };
  return operations[surfaceKind] || "defines surface";
}

function normalizeReviewFlags(value, status, fileRow) {
  const flags = asObjectArray(value).map(flag => ({
    severity: VALID_REVIEW_FLAG_SEVERITY.has(flag.severity) ? flag.severity : "warning",
    reason: isNonEmptyString(flag.reason) ? flag.reason.trim() : "Surface row needs review.",
    evidence: isNonEmptyString(flag.evidence) ? flag.evidence.trim() : fileRow.path,
    nextAction: isNonEmptyString(flag.nextAction) ? flag.nextAction.trim() : "Revise this Surface Registry row."
  }));
  if (status === "needs-evidence" && !flags.some(flag => flag.severity === "blocking")) {
    flags.push({
      severity: "blocking",
      reason: "Agent marked this upstream file as needing more surface evidence.",
      evidence: fileRow.path,
      nextAction: "Read the full file again, gather the missing evidence, and remark only this file."
    });
  }
  return flags;
}

function createAgentMarkedSurfaceRow(fileRow, spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    throw new Error(`Surface spec for ${fileRow.path} must be an object`);
  }
  if (!VALID_SURFACE_KINDS.has(spec.surfaceKind)) {
    throw new Error(`Invalid surfaceKind for ${fileRow.path}: ${spec.surfaceKind}`);
  }
  const surfaceKind = spec.surfaceKind;
  const exposedObject = isNonEmptyString(spec.exposedObject) ? spec.exposedObject.trim() : fileRow.path;
  const operation = isNonEmptyString(spec.operation) ? spec.operation.trim() : defaultOperationForSurfaceKind(surfaceKind);
  const label = isNonEmptyString(spec.label) ? spec.label.trim() : `${surfaceKind} ${exposedObject}`;
  const status = statusForSurfaceSpec(surfaceKind, spec.status);
  const supportReason = surfaceKind === "support-classification"
    ? (isNonEmptyString(spec.supportReason) ? spec.supportReason.trim() : "")
    : "";
  if (surfaceKind === "support-classification" && !isNonEmptyString(supportReason)) {
    throw new Error(`Support classification for ${fileRow.path} requires supportReason`);
  }
  const now = new Date().toISOString();
  const consumerHints = normalizeStringList(spec.consumerHints);
  const actorHints = normalizeStringList(spec.actorHints).length > 0
    ? normalizeStringList(spec.actorHints)
    : consumerHints;
  const dataObjects = normalizeStringList(spec.dataObjects).length > 0
    ? normalizeStringList(spec.dataObjects)
    : normalizeStringList(fileRow.dataObjects);
  const externalSystems = normalizeStringList(spec.externalSystems).length > 0
    ? normalizeStringList(spec.externalSystems)
    : (surfaceKind === "external-dependency" ? [exposedObject] : []);
  if (hasGenericEvidenceDetail(spec.evidence)) {
    throw new Error(`Surface spec for ${fileRow.path} requires concrete evidence naming handlers, resources, tables, commands, dependencies, rules, or spec sections`);
  }

  return {
    schema: "foundation.backfill.surface-registry-row.v1",
    runId: fileRow.runId,
    surfaceId: stableSurfaceId(fileRow, surfaceKind, label, operation),
    surfaceKind,
    sourceCategory: sourceCategoryForSurfaceKind(surfaceKind, spec.sourceCategory),
    label,
    upstreamFileIds: [fileRow.fileId],
    upstreamPaths: [fileRow.path],
    upstreamContentHashes: [upstreamHashRef(fileRow)],
    evidenceRefs: [
      {
        fileId: fileRow.fileId,
        path: fileRow.path,
        relationship: "agent-read-full-file",
        detail: spec.evidence.trim(),
        fullFileRead: true
      },
      ...asObjectArray(spec.evidenceRefs)
    ],
    exposedObject,
    operation,
    consumerHints,
    actorHints,
    stateHints: normalizeStringList(spec.stateHints),
    ruleHints: normalizeStringList(spec.ruleHints),
    dataObjects,
    externalSystems,
    supportReason,
    reviewFlags: normalizeReviewFlags(spec.reviewFlags, status, fileRow),
    status,
    confidence: VALID_CONFIDENCE.has(spec.confidence) ? spec.confidence : "medium",
    createdAt: now,
    updatedAt: now
  };
}

function markSurfaceRowsForFile({ fileRows, surfaceRows, filePath, surfaceSpecs }) {
  if (!isNonEmptyString(filePath)) throw new Error("Surface mark requires --path");
  if (!Array.isArray(surfaceSpecs) || surfaceSpecs.length === 0) {
    throw new Error(`Surface mark for ${filePath} requires at least one surface spec`);
  }
  const fileRow = fileRows.find(row => row.path === filePath);
  if (!fileRow) throw new Error(`No File Registry row found for ${filePath}`);
  if (fileRow.status !== "mapped") {
    throw new Error(`File Registry row for ${filePath} must be mapped before Surface Registry fill`);
  }
  const scope = surfaceRegistryScopeDecision(fileRow);
  if (!scope.eligible) {
    throw new Error(`File Registry row for ${filePath} is outside Surface Registry scope: ${scope.reason}`);
  }

  const replacedRows = surfaceRows.filter(row => (
    (row.upstreamPaths || []).includes(filePath) ||
    (row.upstreamFileIds || []).includes(fileRow.fileId)
  ));
  const replacedIds = new Set(replacedRows.map(row => row.surfaceId));
  const revisionCount = replacedRows.filter(row => row.status === "needs-evidence" || rowHasBlockingFlag(row)).length;
  const output = surfaceRows.filter(row => !replacedIds.has(row.surfaceId));
  output.push(...surfaceSpecs.map(spec => createAgentMarkedSurfaceRow(fileRow, spec)));
  output.sort((left, right) => left.upstreamPaths[0].localeCompare(right.upstreamPaths[0]) || left.surfaceId.localeCompare(right.surfaceId));

  return {
    rows: output,
    markedPath: filePath,
    surfaceCount: surfaceSpecs.length,
    revisionCount,
    replacedSurfaceIds: [...replacedIds]
  };
}

function nextSurfaceRegistryTarget({ fileRows, surfaceRows }) {
  const fileById = new Map(fileRows.map(row => [row.fileId, row]));
  const candidates = surfaceRows
    .filter(row => row.status === "needs-evidence" || row.status === "pending")
    .map(row => {
      const fileRow = fileById.get(row.upstreamFileIds?.[0]) || fileRows.find(file => (row.upstreamPaths || []).includes(file.path)) || null;
      return { row, fileRow };
    })
    .filter(candidate => candidate.fileRow)
    .filter(candidate => isSurfaceRegistryEligibleRow(candidate.fileRow))
    .sort((left, right) => {
      if (left.row.status !== right.row.status) return left.row.status === "needs-evidence" ? -1 : 1;
      return left.fileRow.path.localeCompare(right.fileRow.path);
    });
  if (candidates.length === 0) return null;
  const target = candidates[0];
  return {
    surfaceId: target.row.surfaceId,
    status: target.row.status,
    path: target.fileRow.path,
    fileId: target.fileRow.fileId,
    fileKind: target.fileRow.kind,
    domain: target.fileRow.domain,
    sizeBytes: target.fileRow.sizeBytes,
    contentHash: target.fileRow.contentHash,
    reviewFlags: target.row.reviewFlags || []
  };
}

function readFileRegistryRows(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const registryPath = fileRegistryPathFor(repoRoot, runId, outDir);
  const parsed = readJsonl(registryPath);
  return { registryPath, ...parsed };
}

function readFileRegistryEvalSummary(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const receiptPath = fileRegistryEvalReceiptPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(receiptPath)) return null;
  const parsed = readJsonl(receiptPath);
  return parsed.rows.find(row => row.receiptType === "summary") || null;
}

function readSurfaceEvalSummary(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const receiptPath = surfaceEvalReceiptPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(receiptPath)) return null;
  const parsed = readJsonl(receiptPath);
  return parsed.rows.find(row => row.receiptType === "summary") || null;
}

function validateFileRegistryHandoff(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  const results = [];
  const registry = readFileRegistryRows(repoRoot, runId, outDir);
  if (registry.errors.length > 0) {
    results.push(fail("upstream-file-registry-jsonl", "File registry JSONL must parse before surface extraction", { errors: registry.errors }));
  } else {
    results.push(pass("upstream-file-registry-jsonl", "File registry JSONL parses"));
  }

  const checkPath = fileRegistryCheckPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(checkPath)) {
    results.push(fail("upstream-file-registry-check", "Passing file-registry check artifact is required before surface extraction"));
  } else {
    const check = readJson(checkPath);
    results.push(check?.summary?.fail === 0
      ? pass("upstream-file-registry-check", "File-registry check artifact passes")
      : fail("upstream-file-registry-check", "File-registry check artifact must pass", { summary: check?.summary || null }));
  }

  const evalSummary = readFileRegistryEvalSummary(repoRoot, runId, outDir);
  results.push(evalSummary?.acceptabilityGate?.acceptable
    ? pass("upstream-file-registry-eval", "File-registry eval artifact passes")
    : fail("upstream-file-registry-eval", "Passing file-registry eval receipt is required before surface extraction"));

  const pending = registry.rows.filter(row => row.status !== "mapped").map(row => row.path);
  results.push(pending.length === 0
    ? pass("upstream-file-registry-mapped", "All upstream file-registry rows are mapped")
    : fail("upstream-file-registry-mapped", "Surface extraction requires mapped upstream file rows", { pending }));

  return { registry, results };
}

function createInitialSurfaceRows(fileRows) {
  return surfaceRegistryEligibleRows(fileRows).map(createPendingSurfaceRow);
}

function rowHasBlockingFlag(row) {
  return Array.isArray(row.reviewFlags) && row.reviewFlags.some(flag => flag.severity === "blocking");
}

function fullFileEvidenceRefs(row, fileRow = null) {
  return (row.evidenceRefs || []).filter(ref => (
    ref?.relationship === "agent-read-full-file" &&
    (!fileRow || ref.fileId === fileRow.fileId)
  ));
}

function hasGenericFullFileEvidence(row, fileRow = null) {
  return fullFileEvidenceRefs(row, fileRow).some(ref => {
    const detail = isNonEmptyString(ref.detail) ? ref.detail.trim() : "";
    return detail === "Agent read the complete upstream file before marking this surface row." ||
      /^agent read the complete upstream file\b/i.test(detail) ||
      /^agent read the (full|complete) file\b/i.test(detail) ||
      /^agent-read-the-file\b/i.test(detail);
  });
}

function hasGenericEvidenceDetail(detail) {
  if (!isNonEmptyString(detail)) return true;
  const value = detail.trim();
  return value === "Agent read the complete upstream file before marking this surface row." ||
    /^agent read the complete upstream file\b/i.test(value) ||
    /^agent read the (full|complete) file\b/i.test(value) ||
    /^agent-read-the-file\b/i.test(value);
}

function readRepoFileText(repoRoot, filePath) {
  if (!repoRoot || !isNonEmptyString(filePath)) return "";
  try {
    return fs.readFileSync(path.join(repoRoot, filePath), "utf8");
  } catch {
    return "";
  }
}

function countRouteBoundaries(source) {
  if (!isNonEmptyString(source)) return 0;
  const patterns = [
    /\b(?:fastify|server|app|router)\s*\.\s*(?:get|post|put|patch|delete|options|head|all)\s*(?:<[^>]+>)?\s*\(/g,
    /\b(?:fastify|server|app|router)\s*\.\s*route\s*(?:<[^>]+>)?\s*\(/g,
    /\bexport\s+async\s+function\s+(?:GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g
  ];
  return patterns.reduce((count, pattern) => count + [...source.matchAll(pattern)].length, 0);
}

function terraformResourceBlocks(source) {
  if (!isNonEmptyString(source)) return [];
  return [...source.matchAll(/(?:^|\n)\s*resource\s+"([^"]+)"\s+"([^"]+)"/g)]
    .map(match => ({ type: match[1], name: match[2] }));
}

function isRouteFileRow(fileRow) {
  const filePath = normalizeRepoPathForScope(fileRow?.path).toLowerCase();
  return fileRow?.kind === "route" || /(^|\/)routes?\//.test(filePath);
}

function cappedDetailList(field, values, limit = 25) {
  const capped = values.slice(0, limit);
  const details = { [field]: capped, totalCount: values.length };
  if (values.length > limit) details.omittedCount = values.length - limit;
  return details;
}

function surfaceQualityWarnings({ repoRoot, fileRows, rowsByUpstream, phase = "handoff" }) {
  const genericEvidenceRows = [];
  const routeOverMerge = [];
  const infraOverMerge = [];

  for (const fileRow of fileRows.filter(isSurfaceRegistryEligibleRow)) {
    const attached = rowsByUpstream.get(fileRow.fileId) || [];
    if (attached.length === 0) continue;

    for (const row of attached) {
      if (row.status !== "pending" && hasGenericFullFileEvidence(row, fileRow)) {
        genericEvidenceRows.push({
          surfaceId: row.surfaceId,
          path: fileRow.path,
          label: row.label
        });
      }
    }

    const source = readRepoFileText(repoRoot, fileRow.path);
    if (isRouteFileRow(fileRow)) {
      const handlerCount = countRouteBoundaries(source);
      const routeSurfaceCount = attached.filter(row => ["api", "route"].includes(row.surfaceKind)).length;
      if (handlerCount > 1 && routeSurfaceCount <= 1) {
        routeOverMerge.push({ path: fileRow.path, handlerCount, routeSurfaceCount });
      }
    }

    const normalizedPath = normalizeRepoPathForScope(fileRow.path).toLowerCase();
    if (normalizedPath.endsWith(".tf")) {
      const resourceBlocks = terraformResourceBlocks(source);
      const infraSurfaceCount = attached.filter(row => row.surfaceKind === "infra-resource").length;
      if (resourceBlocks.length > 1 && infraSurfaceCount <= 1) {
        infraOverMerge.push({
          path: fileRow.path,
          resourceCount: resourceBlocks.length,
          resourceTypes: [...new Set(resourceBlocks.map(block => block.type))]
        });
      }
    }
  }

  const results = [];
  if (genericEvidenceRows.length > 0) {
    const message = "Some surface rows use generic full-file-read evidence; evidence must name concrete handlers, resources, tables, commands, dependencies, rules, or spec sections.";
    results.push(phase === "handoff"
      ? fail("surface-evidence-specificity", message, cappedDetailList("rows", genericEvidenceRows))
      : warn("surface-evidence-specificity", message, cappedDetailList("rows", genericEvidenceRows)));
  }
  if (routeOverMerge.length > 0) {
    results.push(warn("surface-route-overmerge-heuristic", "Some route files appear to expose multiple handlers but have one route/API surface row.", cappedDetailList("files", routeOverMerge)));
  }
  if (infraOverMerge.length > 0) {
    results.push(warn("surface-infra-overmerge-heuristic", "Some Terraform files appear to define multiple resource blocks but have one infra-resource surface row.", cappedDetailList("files", infraOverMerge)));
  }
  return results;
}

function validateSurfaceRowShape(row, prefix, results) {
  if (row?.schema !== "foundation.backfill.surface-registry-row.v1") {
    results.push(fail(`${prefix}:schema`, "Surface row schema is invalid", { schema: row?.schema }));
  }
  if (!isNonEmptyString(row?.runId)) results.push(fail(`${prefix}:run-id`, "Surface row requires runId"));
  if (!isNonEmptyString(row?.surfaceId)) results.push(fail(`${prefix}:surface-id`, "Surface row requires surfaceId"));
  if (!VALID_SURFACE_KINDS.has(row?.surfaceKind)) {
    results.push(fail(`${prefix}:surface-kind`, "surfaceKind is outside enum", { surfaceKind: row?.surfaceKind }));
  }
  if (!VALID_SOURCE_CATEGORIES.has(row?.sourceCategory)) {
    results.push(fail(`${prefix}:source-category`, "sourceCategory is outside enum", { sourceCategory: row?.sourceCategory }));
  }
  if (!VALID_SURFACE_STATUSES.has(row?.status)) {
    results.push(fail(`${prefix}:status`, "Surface status is outside enum", { status: row?.status }));
  }
  if (!VALID_CONFIDENCE.has(row?.confidence)) {
    results.push(fail(`${prefix}:confidence`, "Surface confidence is outside enum", { confidence: row?.confidence }));
  }
  if (!isNonEmptyString(row?.label)) results.push(fail(`${prefix}:label`, "Surface row requires label"));
  for (const field of ["upstreamFileIds", "upstreamPaths", "consumerHints", "actorHints", "stateHints", "ruleHints", "dataObjects", "externalSystems"]) {
    if (!Array.isArray(row?.[field])) results.push(fail(`${prefix}:${field}`, `${field} must be an array`));
  }
  if (!isObjectArray(row?.upstreamContentHashes)) results.push(fail(`${prefix}:upstream-content-hashes`, "upstreamContentHashes must be objects"));
  if (!isObjectArray(row?.evidenceRefs) || row.evidenceRefs.length === 0) {
    results.push(fail(`${prefix}:evidence-refs`, "Surface rows require evidenceRefs"));
  } else if (row.status !== "pending" && !row.evidenceRefs.some(ref => ref?.relationship === "agent-read-full-file" && ref?.fileId === row.upstreamFileIds?.[0])) {
    results.push(fail(`${prefix}:full-file-read-evidence`, "Terminal or review Surface rows must record agent-read-full-file evidence for the upstream file"));
  }
  if (!Array.isArray(row?.reviewFlags)) {
    results.push(fail(`${prefix}:review-flags`, "reviewFlags must be an array"));
  } else {
    for (const [index, flag] of row.reviewFlags.entries()) {
      const label = `${prefix}:review-flags:${index + 1}`;
      if (!VALID_REVIEW_FLAG_SEVERITY.has(flag?.severity)) results.push(fail(`${label}:severity`, "Review flag severity is invalid"));
      if (!isNonEmptyString(flag?.reason)) results.push(fail(`${label}:reason`, "Review flag requires reason"));
      if (!isNonEmptyString(flag?.nextAction)) results.push(fail(`${label}:next-action`, "Review flag requires nextAction"));
    }
  }
  if (row.status === "ready-for-capability") {
    if (row.surfaceKind === "support-classification") {
      results.push(fail(`${prefix}:support-ready`, "Support classifications must not be marked ready-for-capability"));
    }
    if (!isNonEmptyString(row.exposedObject)) results.push(fail(`${prefix}:exposed-object`, "Ready surfaces require exposedObject"));
    if (!isNonEmptyString(row.operation)) results.push(fail(`${prefix}:operation`, "Ready surfaces require operation"));
  }
  if (row.surfaceKind === "support-classification" && row.status !== "pending" && !isNonEmptyString(row.supportReason)) {
    results.push(fail(`${prefix}:support-reason`, "Support classifications require supportReason"));
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

function validateSurfaceRows({ repoRoot = null, fileRows, surfaceRows, phase = "handoff" }) {
  const results = [];
  const fileById = new Map(fileRows.map(row => [row.fileId, row]));
  const rowsByUpstream = new Map();
  const pending = [];
  const needsEvidence = [];
  const blockingFlags = [];
  const outOfScopeRows = [];
  const stale = [];

  results.push(validateUnique(surfaceRows, "surfaceId", "surface"));
  for (const [index, row] of surfaceRows.entries()) {
    const prefix = `surface:${row?.surfaceId || index + 1}`;
    validateSurfaceRowShape(row, prefix, results);
    if (row.status === "pending") pending.push(row.surfaceId);
    if (row.status === "needs-evidence") needsEvidence.push(row.surfaceId);
    if (rowHasBlockingFlag(row)) blockingFlags.push(row.surfaceId);

    for (const fileId of row.upstreamFileIds || []) {
      if (!rowsByUpstream.has(fileId)) rowsByUpstream.set(fileId, []);
      rowsByUpstream.get(fileId).push(row);
      if (!fileById.has(fileId)) results.push(fail(`${prefix}:upstream-resolves`, "Surface row references missing upstream file row", { fileId }));
      const upstream = fileById.get(fileId);
      if (upstream && !isSurfaceRegistryEligibleRow(upstream)) {
        outOfScopeRows.push({ surfaceId: row.surfaceId, fileId, path: upstream.path, reason: surfaceRegistryScopeDecision(upstream).reason });
      }
    }
    for (const ref of row.upstreamContentHashes || []) {
      const upstream = fileById.get(ref.fileId);
      if (!upstream) continue;
      if (ref.path !== upstream.path || ref.contentHash !== upstream.contentHash || ref.sizeBytes !== upstream.sizeBytes) {
        stale.push({ surfaceId: row.surfaceId, fileId: ref.fileId, path: ref.path });
      }
    }
  }

  results.push(stale.length === 0
    ? pass("surface-upstream-fresh", "Surface upstream hashes match File Registry rows")
    : fail("surface-upstream-fresh", "Surface rows must be refreshed when upstream File Registry rows change", { stale }));

  results.push(outOfScopeRows.length === 0
    ? pass("surface-scope-eligible", "Surface rows only reference Surface Registry-eligible file rows")
    : fail("surface-scope-eligible", "Surface Registry must not include inert artifacts, fixtures, generated files, test evidence, or support-only docs/assets", { outOfScopeRows }));

  const unresolvedEligibleRows = [];
  for (const fileRow of fileRows.filter(isSurfaceRegistryEligibleRow)) {
    const attached = rowsByUpstream.get(fileRow.fileId) || [];
    const hasReadySurface = attached.some(row => row.status === "ready-for-capability");
    const hasSupportClassification = attached.some(row => row.surfaceKind === "support-classification" && row.status === "mapped");
    const hasReviewBlocker = attached.some(row => row.status === "needs-evidence" && rowHasBlockingFlag(row));
    if (!hasReadySurface && !hasSupportClassification && !hasReviewBlocker) {
      unresolvedEligibleRows.push({ fileId: fileRow.fileId, path: fileRow.path });
    }
  }
  if (unresolvedEligibleRows.length === 0) {
    results.push(pass("surface-covers-eligible-files", "Every Surface Registry-eligible file row resolves to a surface, support classification, or review blocker"));
  } else if (phase === "handoff") {
    results.push(fail("surface-covers-eligible-files", "Surface Registry-eligible File Registry rows must be resolved before Capability Matrix", { unresolvedEligibleRows }));
  } else {
    results.push(warn("surface-covers-eligible-files", `${unresolvedEligibleRows.length} Surface Registry-eligible File Registry row(s) still need resolution`, { unresolvedEligibleRows }));
  }

  if (phase === "handoff") {
    results.push(pending.length === 0
      ? pass("handoff-no-pending-surfaces", "No pending surface rows remain")
      : fail("handoff-no-pending-surfaces", "Handoff requires zero pending surface rows", { pending }));
    results.push(needsEvidence.length === 0
      ? pass("handoff-no-needs-evidence", "No needs-evidence surface rows remain")
      : fail("handoff-no-needs-evidence", "Handoff requires resolving needs-evidence rows", { needsEvidence }));
    results.push(blockingFlags.length === 0
      ? pass("handoff-no-blocking-surface-flags", "No blocking surface review flags remain")
      : fail("handoff-no-blocking-surface-flags", "Handoff requires no blocking surface review flags", { blockingFlags }));
  } else {
    results.push(warn("batch-pending-surfaces-allowed", `${pending.length} pending surface row(s) remain in batch phase`, { pendingCount: pending.length }));
  }

  results.push(...surfaceQualityWarnings({ repoRoot, fileRows, rowsByUpstream, phase }));

  return results;
}

function parseJsonScript(html, scriptId) {
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const attrs = match[1];
    const body = match[2].trim();
    if (new RegExp(`\\bid=["']${scriptId}["']`, "i").test(attrs) && /\btype=["']application\/json["']/i.test(attrs)) {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    }
  }
  return null;
}

function validateSurfaceReportState({ repoRoot, runId, outDir, reportPath, fileRows, surfaceRows }) {
  if (!reportPath) return [];
  if (!fs.existsSync(reportPath)) return [fail("surface-report-exists", "Report path passed to checker does not exist", { reportPath })];
  const html = fs.readFileSync(reportPath, "utf8");
  const state = parseJsonScript(html, "backfill-surface-registry-state");
  if (!state) return [fail("surface-report-state", "Report is missing backfill-surface-registry-state JSON script")];
  const evalSummary = readSurfaceEvalSummary(repoRoot, runId, outDir);
  const evalRevisionTargetCount = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets.length : 0;
  const evalFindings = Array.isArray(evalSummary?.findings) ? evalSummary.findings : [];
  const checkPath = surfaceCheckPathFor(repoRoot, runId, outDir);
  const check = fs.existsSync(checkPath) ? readJson(checkPath) : null;
  const checkerPass = check?.summary?.fail === 0;
  const evalPass = Boolean(evalSummary?.acceptabilityGate?.acceptable);
  const evalHandoffReady = evalPass && evalRevisionTargetCount === 0;
  const pendingCount = surfaceRows.filter(row => row.status === "pending").length;
  const needsEvidenceCount = surfaceRows.filter(row => row.status === "needs-evidence").length;
  const blockingFlagCount = surfaceRows.filter(row => (row.reviewFlags || []).some(flag => flag.severity === "blocking")).length;
  const expected = {
    registryPath: path.relative(repoRoot, surfaceRegistryPathFor(repoRoot, runId, outDir)),
    checkerPath: path.relative(repoRoot, checkPath),
    checkerResult: checkerPass ? "pass" : "fail-or-missing",
    evalReceiptPath: path.relative(repoRoot, surfaceEvalReceiptPathFor(repoRoot, runId, outDir)),
    evalSummaryPath: path.relative(repoRoot, surfaceEvalSummaryPathFor(repoRoot, runId, outDir)),
    evalResult: evalHandoffReady ? "pass" : (evalPass ? "pass-with-revisions" : "fail-or-missing"),
    evalScore: evalSummary?.totalScore ?? null,
    evalRevisionTargetCount,
    evalWarningCount: evalFindings.filter(finding => finding?.severity === "warning").length,
    evalBlockingFindingCount: evalFindings.filter(finding => finding?.severity === "blocking").length,
    eligibleFileCount: surfaceRegistryScopeCounts(fileRows).eligible.length,
    skippedFileCount: surfaceRegistryScopeCounts(fileRows).skipped.length,
    pendingCount,
    needsEvidenceCount,
    readyForCapabilityCount: surfaceRows.filter(row => row.status === "ready-for-capability").length,
    supportCount: surfaceRows.filter(row => row.surfaceKind === "support-classification").length,
    blockingFlagCount,
    nextLayer: pendingCount === 0 && needsEvidenceCount === 0 && blockingFlagCount === 0 && checkerPass && evalHandoffReady
      ? "capability matrix"
      : "surface registry revision"
  };
  const drift = [];
  for (const [field, value] of Object.entries(expected)) {
    if (state[field] !== value) drift.push({ field, expected: value, actual: state[field] });
  }
  return drift.length === 0
    ? [pass("surface-report-state-current", "Surface report state matches canonical artifacts")]
    : [fail("surface-report-state-current", "Surface report state must match canonical artifacts", { drift })];
}

function validateSurfaceRegistry({ repoRoot, runId, outDir = defaultBackfillDir(repoRoot), phase = "handoff", reportPath = null }) {
  const results = [];
  const upstream = validateFileRegistryHandoff(repoRoot, runId, outDir);
  results.push(...upstream.results);
  const surfacePath = surfaceRegistryPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(surfacePath)) {
    return {
      registryPath: surfacePath,
      fileRegistryPath: upstream.registry.registryPath,
      fileRows: upstream.registry.rows,
      surfaceRows: [],
      results: [...results, fail("surface-registry-exists", `Surface registry does not exist: ${surfacePath}`)]
    };
  }
  const parsed = readJsonl(surfacePath);
  results.push(pass("surface-registry-exists", "Surface registry exists"));
  if (parsed.errors.length > 0) {
    results.push(...parsed.errors.map(error => fail(`surface-jsonl:${error.line}`, "Surface registry JSONL line must parse", error)));
    return { registryPath: surfacePath, fileRows: upstream.registry.rows, surfaceRows: parsed.rows, results };
  }
  results.push(pass("surface-jsonl", "Every surface registry line parses as JSON"));
  results.push(...validateSurfaceRows({ repoRoot, fileRows: upstream.registry.rows, surfaceRows: parsed.rows, phase }));
  results.push(...validateSurfaceReportState({ repoRoot, runId, outDir, reportPath, fileRows: upstream.registry.rows, surfaceRows: parsed.rows }));
  return {
    registryPath: surfacePath,
    fileRegistryPath: upstream.registry.registryPath,
    fileRows: upstream.registry.rows,
    surfaceRows: parsed.rows,
    results
  };
}

function selectSurfaceEvalSample(surfaceRows, mode = "risk") {
  if (mode === "all" || surfaceRows.length <= 120) return surfaceRows;
  const selected = new Map();
  for (const row of surfaceRows) {
    if (row.status !== "ready-for-capability" && row.status !== "mapped") selected.set(row.surfaceId, row);
    if (row.reviewFlags?.length > 0) selected.set(row.surfaceId, row);
    if (row.surfaceKind !== "support-classification") selected.set(row.surfaceId, row);
  }
  for (const row of surfaceRows) {
    const stratum = `${row.surfaceKind}:${row.sourceCategory}`;
    if (![...selected.values()].some(existing => `${existing.surfaceKind}:${existing.sourceCategory}` === stratum)) {
      selected.set(row.surfaceId, row);
    }
  }
  return [...selected.values()].sort((left, right) => left.upstreamPaths[0].localeCompare(right.upstreamPaths[0]) || left.surfaceId.localeCompare(right.surfaceId));
}

function plausibleSurfaceKindForFile(row, fileRow) {
  if (!fileRow) return false;
  if ((row.evidenceRefs || []).some(ref => ref?.relationship === "agent-read-full-file" && ref?.fileId === fileRow.fileId)) return true;
  if (row.surfaceKind === "external-dependency") return (fileRow.externalSystems || []).includes(row.exposedObject);
  if (row.surfaceKind === "support-classification") return true;
  const allowed = {
    route: new Set(["route"]),
    screen: new Set(["route", "component"]),
    api: new Set(["route", "service"]),
    command: new Set(["script", "package"]),
    job: new Set(["script", "service"]),
    table: new Set(["model", "migration"]),
    workflow: new Set(["service", "script"]),
    "infra-resource": new Set(["infra"]),
    doc: new Set(["doc"]),
    test: new Set(["test"]),
    "generated-artifact": new Set(["generated"])
  };
  return allowed[row.surfaceKind]?.has(fileRow.kind) || false;
}

function scoreSurfaceRow(row, fileById) {
  const findings = [];
  const categoryScores = {
    kindAndBoundary: 20,
    evidenceTraceability: 20,
    specificity: 20,
    capabilityReadiness: 20,
    revisionState: 20
  };
  const fileRow = fileById.get(row.upstreamFileIds?.[0]);

  if (!plausibleSurfaceKindForFile(row, fileRow)) {
    findings.push({ category: "kindAndBoundary", severity: "blocking", message: "Surface kind does not match upstream file evidence." });
    categoryScores.kindAndBoundary = 0;
  }
  if (!Array.isArray(row.evidenceRefs) || row.evidenceRefs.length === 0 || !fileRow) {
    findings.push({ category: "evidenceTraceability", severity: "blocking", message: "Surface row lacks usable upstream evidence." });
    categoryScores.evidenceTraceability = 0;
  } else if (!row.evidenceRefs.some(ref => ref?.relationship === "agent-read-full-file" && ref?.fileId === fileRow.fileId)) {
    findings.push({ category: "evidenceTraceability", severity: "blocking", message: "Surface row was not marked with full-file-read evidence." });
    categoryScores.evidenceTraceability = 0;
  } else if (hasGenericFullFileEvidence(row, fileRow)) {
    findings.push({ category: "evidenceTraceability", severity: "blocking", message: "Full-file-read evidence is generic; name concrete handlers, resources, tables, commands, dependencies, rules, or spec sections." });
    categoryScores.evidenceTraceability = 0;
  }
  if (!isNonEmptyString(row.label) || row.label.length < 8 || row.label.includes("undefined")) {
    findings.push({ category: "specificity", severity: "blocking", message: "Surface label is too vague." });
    categoryScores.specificity = 0;
  }
  if (row.surfaceKind !== "support-classification" && (!isNonEmptyString(row.exposedObject) || !isNonEmptyString(row.operation))) {
    findings.push({ category: "capabilityReadiness", severity: "blocking", message: "Surface row is missing exposed object or operation." });
    categoryScores.capabilityReadiness = 0;
  }
  if (row.surfaceKind === "support-classification" && !isNonEmptyString(row.supportReason)) {
    findings.push({ category: "capabilityReadiness", severity: "blocking", message: "Support classification lacks a reason from full-file review." });
    categoryScores.capabilityReadiness = 0;
  }
  if (row.upstreamFileIds?.length > 5) {
    findings.push({ category: "kindAndBoundary", severity: "warning", message: "Surface row may be over-merged across too many upstream files." });
    categoryScores.kindAndBoundary = Math.min(categoryScores.kindAndBoundary, 12);
  }
  const filePath = normalizeRepoPathForScope(fileRow?.path).toLowerCase();
  const serviceText = `${row.label || ""} ${row.exposedObject || ""} ${row.operation || ""}`;
  if (
    filePath.includes("/services/") &&
    row.surfaceKind === "api" &&
    row.sourceCategory === "exposed" &&
    !/\b(client|tool|plugin|sdk)\b/i.test(serviceText)
  ) {
    findings.push({ category: "kindAndBoundary", severity: "warning", message: "Internal service module is marked as exposed API; verify it is not dormant, legacy, helper, or only route-internal support." });
    categoryScores.kindAndBoundary = Math.min(categoryScores.kindAndBoundary, 18);
  }
  if (row.status === "pending" || row.status === "needs-evidence" || rowHasBlockingFlag(row)) {
    findings.push({ category: "revisionState", severity: "blocking", message: "Surface row is not in terminal handoff state." });
    categoryScores.revisionState = 0;
  }

  const score = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  return {
    subjectRowId: row.surfaceId,
    surfaceKind: row.surfaceKind,
    label: row.label,
    upstreamPaths: row.upstreamPaths,
    categoryScores,
    score,
    findings,
    acceptabilityGate: {
      acceptable: findings.every(finding => finding.severity !== "blocking") && score >= 90,
      threshold: "No blocking findings for row-level surface receipt"
    }
  };
}

function aggregateSurfaceEval(checkResults, rowReceipts) {
  const checkSummary = summarizeResults(checkResults);
  if (rowReceipts.length === 0) {
    const categoryScores = {
      upstreamCoverageAndFreshness: checkSummary.fail === 0 ? 20 : 0,
      kindAndBoundary: 20,
      evidenceTraceability: 20,
      specificity: 20,
      capabilityReadiness: 20
    };
    const totalScore = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
    return {
      categoryScores,
      totalScore,
      normalizedMinimum: Math.min(...Object.values(categoryScores).map(score => score / 2)),
      acceptable: checkSummary.fail === 0
    };
  }
  const allAcceptable = rowReceipts.every(receipt => receipt.acceptabilityGate.acceptable);
  const categoryScores = {
    upstreamCoverageAndFreshness: checkSummary.fail === 0 ? 20 : 0,
    kindAndBoundary: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.kindAndBoundary), 20),
    evidenceTraceability: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.evidenceTraceability), 20),
    specificity: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.specificity), 20),
    capabilityReadiness: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.capabilityReadiness), 20)
  };
  const totalScore = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  const normalizedMinimum = Math.min(...Object.values(categoryScores).map(score => score / 2));
  return {
    categoryScores,
    totalScore,
    normalizedMinimum,
    acceptable: checkSummary.fail === 0 && allAcceptable && totalScore >= 96 && normalizedMinimum >= 9
  };
}

function mergeSurfaceRowsForRefresh({ fileRows, existingSurfaceRows }) {
  const fileById = new Map(fileRows.map(row => [row.fileId, row]));
  const eligibleRows = surfaceRegistryEligibleRows(fileRows);
  const eligibleFileIds = new Set(eligibleRows.map(row => row.fileId));
  const existingByFileId = new Map();
  for (const row of existingSurfaceRows) {
    for (const fileId of row.upstreamFileIds || []) {
      if (!existingByFileId.has(fileId)) existingByFileId.set(fileId, []);
      existingByFileId.get(fileId).push(row);
    }
  }
  const changed = [];
  const removed = [];
  const output = [];
  for (const [fileId, rows] of existingByFileId.entries()) {
    if (!fileById.has(fileId) || !eligibleFileIds.has(fileId)) removed.push(...rows.map(row => row.surfaceId));
  }
  for (const fileRow of eligibleRows) {
    const rows = existingByFileId.get(fileRow.fileId) || [];
    const current = rows.length > 0 && rows.every(row => (row.upstreamContentHashes || []).some(ref => (
      ref.fileId === fileRow.fileId && ref.contentHash === fileRow.contentHash && ref.sizeBytes === fileRow.sizeBytes
    )));
    if (current) {
      output.push(...rows);
      continue;
    }
    changed.push(fileRow.path);
    output.push(createPendingSurfaceRow(fileRow));
  }
  output.sort((left, right) => left.upstreamPaths[0].localeCompare(right.upstreamPaths[0]) || left.surfaceId.localeCompare(right.surfaceId));
  return { rows: output, changed, removed, skipped: surfaceRegistryScopeCounts(fileRows).skipped };
}

export {
  VALID_CONFIDENCE,
  VALID_REVIEW_FLAG_SEVERITY,
  VALID_SOURCE_CATEGORIES,
  VALID_SURFACE_KINDS,
  VALID_SURFACE_STATUSES,
  appendRunLogEvent,
  aggregateSurfaceEval,
  createAgentMarkedSurfaceRow,
  createInitialSurfaceRows,
  createPendingSurfaceRow,
  defaultBackfillDir,
  ensureDir,
  isSurfaceRegistryEligibleRow,
  markSurfaceRowsForFile,
  mergeSurfaceRowsForRefresh,
  nextSurfaceRegistryTarget,
  parseCliArgs,
  readFileRegistryRows,
  readJson,
  readJsonl,
  renderResultsText,
  scoreSurfaceRow,
  selectSurfaceEvalSample,
  summarizeResults,
  surfaceRegistryEligibleRows,
  surfaceRegistryScopeCounts,
  surfaceRegistryScopeDecision,
  surfaceCheckPathFor,
  surfaceEvalReceiptPathFor,
  surfaceEvalSummaryPathFor,
  surfaceRefreshPathFor,
  surfaceRegistryPathFor,
  validateFileRegistryHandoff,
  validateSurfaceRegistry,
  writeJson,
  writeJsonl
};
