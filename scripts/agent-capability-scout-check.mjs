#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

const ALLOWED_FAMILIES = new Set(["OpenAI", "Anthropic", "Google", "Addy Osmani"]);
const IMPORTANCE_VALUES = new Set(["low", "medium", "high"]);
const RUN_STATUSES = new Set(["complete", "blocked", "failed"]);
const SNAPSHOT_STATUSES = new Set(["fetched", "blocked", "failed", "unchanged"]);
const CONFIDENCE_VALUES = new Set(["low", "medium", "high"]);
const REVIEW_STATES = new Set(["proposed", "accepted", "rejected", "deferred"]);
const STANDALONE_EVALS = new Set(["pass", "fail"]);
const MERGE_STATES = new Set(["merged", "pr-open", "blocked", "not-needed"]);
const NOTIFICATION_TARGETS = new Set(["github-pr-comment", "github-issue", "github-comment", "manual"]);
const NOTIFICATION_STATUSES = new Set(["sent", "blocked", "failed"]);

const DEFAULT_DIR = "docs/specs/agent-capability-scout";

function usage() {
  return `Usage:
  npm run foundation:agent-capability-scout:check
  node scripts/agent-capability-scout-check.mjs [--root <repo-root>] [--dir <state-dir>] [--json]

Options:
  --root <path>  Repository root. Defaults to current working directory.
  --dir <path>   Scout state directory relative to root or absolute. Defaults to ${DEFAULT_DIR}.
  --json         Print JSON output.
  --help         Show this help.`;
}

function parseArgs(argv) {
  const options = { root: process.cwd(), dir: DEFAULT_DIR, json: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { ...options, help: true };
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--root") {
      index += 1;
      if (!argv[index]) throw new Error("--root requires a path");
      options.root = argv[index];
      continue;
    }
    if (token === "--dir") {
      index += 1;
      if (!argv[index]) throw new Error("--dir requires a path");
      options.dir = argv[index];
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }
  options.root = path.resolve(options.root);
  options.dir = path.isAbsolute(options.dir) ? options.dir : path.join(options.root, options.dir);
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

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value) {
  return typeof value === "boolean";
}

function isIsoTimestamp(value) {
  return isNonEmptyString(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && Number.isFinite(Date.parse(value));
}

function isRelativeArtifactPath(value) {
  return isNonEmptyString(value) && !path.isAbsolute(value) && !value.includes("..");
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return { value: null, results: [fail(`file:${path.basename(filePath)}:exists`, `Missing required file: ${filePath}`)] };
  }
  try {
    return {
      value: JSON.parse(fs.readFileSync(filePath, "utf8")),
      results: [pass(`file:${path.basename(filePath)}:exists`, `Found ${filePath}`)]
    };
  } catch (error) {
    return {
      value: null,
      results: [
        pass(`file:${path.basename(filePath)}:exists`, `Found ${filePath}`),
        fail(`file:${path.basename(filePath)}:json`, `Invalid JSON in ${filePath}`, { error: error.message })
      ]
    };
  }
}

function readJsonl(filePath, label) {
  if (!fs.existsSync(filePath)) {
    return { rows: [], results: [fail(`${label}:exists`, `Missing required JSONL file: ${filePath}`)] };
  }
  const rows = [];
  const results = [pass(`${label}:exists`, `Found ${filePath}`)];
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    const lineNumber = index + 1;
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (!isPlainObject(parsed)) {
        results.push(fail(`${label}:line:${lineNumber}:object`, "JSONL line must parse to an object"));
        continue;
      }
      rows.push({ line: lineNumber, value: parsed });
    } catch (error) {
      results.push(fail(`${label}:line:${lineNumber}:json`, "JSONL line must parse", { error: error.message }));
    }
  }
  results.push(pass(`${label}:parse`, `${rows.length} row(s) parsed`));
  return { rows, results };
}

function validateRequiredString(results, object, field, id) {
  if (!isNonEmptyString(object[field])) {
    results.push(fail(`${id}:${field}`, `${field} must be a non-empty string`));
  }
}

function validateOptionalArtifactPath(results, object, field, id) {
  if (object[field] === undefined || object[field] === null || object[field] === "") return;
  if (!isRelativeArtifactPath(object[field])) {
    results.push(fail(`${id}:${field}`, `${field} must be a relative artifact path without parent traversal`));
  }
}

function validateSourceRegistry(registry) {
  const results = [];
  if (!isPlainObject(registry)) return [fail("source-registry:object", "Source registry must be a JSON object")];
  if (registry.schema !== "foundation.agent-capability-scout.source-registry.v1") {
    results.push(fail("source-registry:schema", "Source registry schema must be foundation.agent-capability-scout.source-registry.v1"));
  }
  validateRequiredString(results, registry, "version", "source-registry");
  validateRequiredString(results, registry, "defaultCadence", "source-registry");
  validateRequiredString(results, registry, "topicScope", "source-registry");
  if (!Array.isArray(registry.sources) || registry.sources.length === 0) {
    results.push(fail("source-registry:sources", "Source registry must include at least one source"));
    return results;
  }

  const ids = new Set();
  for (const [index, source] of registry.sources.entries()) {
    const id = `source-registry:sources:${index + 1}`;
    if (!isPlainObject(source)) {
      results.push(fail(`${id}:object`, "Source must be an object"));
      continue;
    }
    validateRequiredString(results, source, "id", id);
    validateRequiredString(results, source, "url", id);
    validateRequiredString(results, source, "topicScope", id);
    validateRequiredString(results, source, "cadence", id);
    if (isNonEmptyString(source.id)) {
      if (ids.has(source.id)) results.push(fail(`${id}:id-unique`, "Source IDs must be unique", { sourceId: source.id }));
      ids.add(source.id);
    }
    if (!ALLOWED_FAMILIES.has(source.family)) {
      results.push(fail(`${id}:family`, "Source family is outside the v1 allowlist", { family: source.family, allowed: [...ALLOWED_FAMILIES] }));
    }
    if (!isBoolean(source.enabled)) {
      results.push(fail(`${id}:enabled`, "enabled must be boolean"));
    }
    if (!IMPORTANCE_VALUES.has(source.importance)) {
      results.push(fail(`${id}:importance`, "importance must be low, medium, or high"));
    }
  }

  if (results.length === 0) results.push(pass("source-registry:valid", `Source registry has ${registry.sources.length} valid source(s)`));
  return results;
}

function validateRuns(rows) {
  const results = [];
  const runIds = new Set();
  for (const { line, value: run } of rows) {
    const id = `runs:line:${line}`;
    validateRequiredString(results, run, "runId", id);
    validateRequiredString(results, run, "trigger", id);
    validateRequiredString(results, run, "sourceRegistryVersion", id);
    validateOptionalArtifactPath(results, run, "briefPath", id);
    validateOptionalArtifactPath(results, run, "notificationReceiptPath", id);
    if (isNonEmptyString(run.runId)) {
      if (runIds.has(run.runId)) results.push(fail(`${id}:runId-unique`, "runId must be unique in runs.jsonl"));
      runIds.add(run.runId);
    }
    if (!isIsoTimestamp(run.startedAt)) results.push(fail(`${id}:startedAt`, "startedAt must be an ISO timestamp"));
    if (run.endedAt !== undefined && run.endedAt !== null && !isIsoTimestamp(run.endedAt)) results.push(fail(`${id}:endedAt`, "endedAt must be an ISO timestamp when present"));
    if (!RUN_STATUSES.has(run.status)) results.push(fail(`${id}:status`, "status must be complete, blocked, or failed"));
    if (run.mergeState !== undefined && run.mergeState !== null && !MERGE_STATES.has(run.mergeState)) results.push(fail(`${id}:mergeState`, "mergeState must be merged, pr-open, blocked, or not-needed"));
  }
  if (results.length === 0) results.push(pass("runs:valid", `${rows.length} run row(s) valid`));
  return { results, runIds };
}

function validateSnapshots(rows, sourceIds, runIds) {
  const results = [];
  for (const { line, value: snapshot } of rows) {
    const id = `source-snapshots:line:${line}`;
    validateRequiredString(results, snapshot, "runId", id);
    validateRequiredString(results, snapshot, "sourceId", id);
    validateOptionalArtifactPath(results, snapshot, "evidencePath", id);
    if (isNonEmptyString(snapshot.runId) && runIds.size > 0 && !runIds.has(snapshot.runId)) results.push(fail(`${id}:runId`, "snapshot runId must reference runs.jsonl"));
    if (isNonEmptyString(snapshot.sourceId) && !sourceIds.has(snapshot.sourceId)) results.push(fail(`${id}:sourceId`, "snapshot sourceId must reference source-registry.json"));
    if (!isIsoTimestamp(snapshot.fetchedAt)) results.push(fail(`${id}:fetchedAt`, "fetchedAt must be an ISO timestamp"));
    if (snapshot.contentHash !== undefined && snapshot.contentHash !== null && !isNonEmptyString(snapshot.contentHash)) results.push(fail(`${id}:contentHash`, "contentHash must be a non-empty string when present"));
    if (!SNAPSHOT_STATUSES.has(snapshot.retrievalStatus)) results.push(fail(`${id}:retrievalStatus`, "retrievalStatus must be fetched, blocked, failed, or unchanged"));
  }
  if (results.length === 0) results.push(pass("source-snapshots:valid", `${rows.length} source snapshot row(s) valid`));
  return results;
}

function validateFindings(rows, sourceIds, runIds) {
  const results = [];
  const findingIds = new Set();
  for (const { line, value: finding } of rows) {
    const id = `findings:line:${line}`;
    validateRequiredString(results, finding, "runId", id);
    validateRequiredString(results, finding, "findingId", id);
    validateRequiredString(results, finding, "sourceId", id);
    validateRequiredString(results, finding, "dateSeen", id);
    validateRequiredString(results, finding, "changeType", id);
    validateRequiredString(results, finding, "summary", id);
    validateRequiredString(results, finding, "gradeReason", id);
    validateRequiredString(results, finding, "evidencePath", id);
    validateOptionalArtifactPath(results, finding, "evidencePath", id);
    if (isNonEmptyString(finding.runId) && runIds.size > 0 && !runIds.has(finding.runId)) results.push(fail(`${id}:runId`, "finding runId must reference runs.jsonl"));
    if (isNonEmptyString(finding.sourceId) && !sourceIds.has(finding.sourceId)) results.push(fail(`${id}:sourceId`, "finding sourceId must reference source-registry.json"));
    if (isNonEmptyString(finding.findingId)) {
      if (findingIds.has(finding.findingId)) results.push(fail(`${id}:findingId-unique`, "findingId must be unique"));
      findingIds.add(finding.findingId);
    }
    if (!Number.isInteger(finding.interestGrade) || finding.interestGrade < 1 || finding.interestGrade > 10) {
      results.push(fail(`${id}:interestGrade`, "interestGrade must be an integer from 1 to 10"));
    }
    if (!CONFIDENCE_VALUES.has(finding.confidence)) results.push(fail(`${id}:confidence`, "confidence must be low, medium, or high"));
  }
  if (results.length === 0) results.push(pass("findings:valid", `${rows.length} finding row(s) valid`));
  return { results, findingIds };
}

function validatePrincipleCandidates(rows, findingIds, runIds) {
  const results = [];
  const candidateIds = new Set();
  for (const { line, value: candidate } of rows) {
    const id = `principle-candidates:line:${line}`;
    validateRequiredString(results, candidate, "runId", id);
    validateRequiredString(results, candidate, "candidateId", id);
    validateRequiredString(results, candidate, "findingId", id);
    validateRequiredString(results, candidate, "targetDoc", id);
    validateRequiredString(results, candidate, "proposedPrinciple", id);
    validateRequiredString(results, candidate, "durabilityReason", id);
    validateRequiredString(results, candidate, "evidencePath", id);
    validateOptionalArtifactPath(results, candidate, "patchPath", id);
    validateOptionalArtifactPath(results, candidate, "evidencePath", id);
    if (isNonEmptyString(candidate.runId) && runIds.size > 0 && !runIds.has(candidate.runId)) results.push(fail(`${id}:runId`, "candidate runId must reference runs.jsonl"));
    if (isNonEmptyString(candidate.findingId) && findingIds.size > 0 && !findingIds.has(candidate.findingId)) results.push(fail(`${id}:findingId`, "candidate findingId must reference findings.jsonl"));
    if (isNonEmptyString(candidate.candidateId)) {
      if (candidateIds.has(candidate.candidateId)) results.push(fail(`${id}:candidateId-unique`, "candidateId must be unique"));
      candidateIds.add(candidate.candidateId);
    }
    if (!["docs/principles/agent-principles.html", "docs/principles/ai-evals-principles.html"].includes(candidate.targetDoc)) {
      results.push(fail(`${id}:targetDoc`, "targetDoc must be an approved principles document"));
    }
    if (!REVIEW_STATES.has(candidate.reviewState)) results.push(fail(`${id}:reviewState`, "reviewState must be proposed, accepted, rejected, or deferred"));
    if (!STANDALONE_EVALS.has(candidate.standaloneEval)) results.push(fail(`${id}:standaloneEval`, "standaloneEval must be pass or fail"));
    if (candidate.standaloneEval === "pass") {
      validateRequiredString(results, candidate, "additiveRationale", id);
      if (!candidate.patchPath && !candidate.proposedPrinciple) results.push(fail(`${id}:patch-or-principle`, "passing candidates need proposed wording or patch path"));
    }
  }
  if (results.length === 0) results.push(pass("principle-candidates:valid", `${rows.length} principle candidate row(s) valid`));
  return results;
}

function validateMergeReceipts(rows, runIds) {
  const results = [];
  for (const { line, value: receipt } of rows) {
    const id = `merge-receipts:line:${line}`;
    validateRequiredString(results, receipt, "runId", id);
    if (isNonEmptyString(receipt.runId) && runIds.size > 0 && !runIds.has(receipt.runId)) results.push(fail(`${id}:runId`, "merge receipt runId must reference runs.jsonl"));
    if (!MERGE_STATES.has(receipt.mergeState)) results.push(fail(`${id}:mergeState`, "mergeState must be merged, pr-open, blocked, or not-needed"));
    if (receipt.checks !== undefined && !Array.isArray(receipt.checks)) results.push(fail(`${id}:checks`, "checks must be an array when present"));
    if (receipt.mergedAt !== undefined && receipt.mergedAt !== null && !isIsoTimestamp(receipt.mergedAt)) results.push(fail(`${id}:mergedAt`, "mergedAt must be an ISO timestamp when present"));
    if (receipt.mergeState === "blocked") validateRequiredString(results, receipt, "blocker", id);
  }
  if (results.length === 0) results.push(pass("merge-receipts:valid", `${rows.length} merge receipt row(s) valid`));
  return results;
}

function validateNotifications(rows, runIds) {
  const results = [];
  for (const { line, value: notification } of rows) {
    const id = `notifications:line:${line}`;
    validateRequiredString(results, notification, "runId", id);
    validateRequiredString(results, notification, "summary", id);
    if (isNonEmptyString(notification.runId) && runIds.size > 0 && !runIds.has(notification.runId)) results.push(fail(`${id}:runId`, "notification runId must reference runs.jsonl"));
    if (!NOTIFICATION_TARGETS.has(notification.target)) results.push(fail(`${id}:target`, "target must be github-pr-comment, github-issue, github-comment, or manual"));
    if (!NOTIFICATION_STATUSES.has(notification.status)) results.push(fail(`${id}:status`, "status must be sent, blocked, or failed"));
    if (notification.status === "sent") {
      validateRequiredString(results, notification, "url", id);
      if (!isIsoTimestamp(notification.sentAt)) results.push(fail(`${id}:sentAt`, "sentAt must be an ISO timestamp when status is sent"));
    }
    if (notification.status !== "sent") validateRequiredString(results, notification, "blocker", id);
  }
  if (results.length === 0) results.push(pass("notifications:valid", `${rows.length} notification row(s) valid`));
  return results;
}

function validateBriefs(root, runs) {
  const results = [];
  for (const { line, value: run } of runs) {
    if (!run.briefPath) continue;
    const briefPath = path.join(root, run.briefPath);
    if (!fs.existsSync(briefPath)) {
      results.push(fail(`runs:line:${line}:briefPath:exists`, "briefPath must exist", { briefPath: run.briefPath }));
    }
  }
  if (results.length === 0) results.push(pass("briefs:valid", "All referenced briefs exist"));
  return results;
}

function validateScoutState(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const dir = options.dir ? (path.isAbsolute(options.dir) ? options.dir : path.join(root, options.dir)) : path.join(root, DEFAULT_DIR);
  const results = [];

  if (!fs.existsSync(dir)) return [fail("state-dir:exists", `Scout state directory does not exist: ${dir}`)];
  results.push(pass("state-dir:exists", `Found ${dir}`));

  const registryRead = readJson(path.join(dir, "source-registry.json"));
  results.push(...registryRead.results);
  const registryResults = registryRead.value ? validateSourceRegistry(registryRead.value) : [];
  results.push(...registryResults);
  const sourceIds = new Set(registryRead.value?.sources?.filter(isPlainObject).map(source => source.id).filter(isNonEmptyString) ?? []);

  const runs = readJsonl(path.join(dir, "runs.jsonl"), "runs");
  const snapshots = readJsonl(path.join(dir, "source-snapshots.jsonl"), "source-snapshots");
  const findings = readJsonl(path.join(dir, "findings.jsonl"), "findings");
  const candidates = readJsonl(path.join(dir, "principle-candidates.jsonl"), "principle-candidates");
  const mergeReceipts = readJsonl(path.join(dir, "merge-receipts.jsonl"), "merge-receipts");
  const notifications = readJsonl(path.join(dir, "notifications.jsonl"), "notifications");

  results.push(...runs.results, ...snapshots.results, ...findings.results, ...candidates.results, ...mergeReceipts.results, ...notifications.results);

  const runValidation = validateRuns(runs.rows);
  results.push(...runValidation.results);
  results.push(...validateSnapshots(snapshots.rows, sourceIds, runValidation.runIds));
  const findingValidation = validateFindings(findings.rows, sourceIds, runValidation.runIds);
  results.push(...findingValidation.results);
  results.push(...validatePrincipleCandidates(candidates.rows, findingValidation.findingIds, runValidation.runIds));
  results.push(...validateMergeReceipts(mergeReceipts.rows, runValidation.runIds));
  results.push(...validateNotifications(notifications.rows, runValidation.runIds));
  results.push(...validateBriefs(root, runs.rows));

  if (runs.rows.length === 0) results.push(warn("runs:empty", "Scout state is initialized but has no recorded runs yet"));
  return results;
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
  const lines = ["Agent Capability Scout check"];
  for (const item of results) lines.push(`${item.status.toUpperCase()} [${item.id}] ${item.message}`);
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
  const results = validateScoutState(options);
  if (options.json) console.log(JSON.stringify({ results, summary: summarize(results) }, null, 2));
  else console.log(renderText(results));
  if (summarize(results).fail > 0) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}

export {
  parseArgs,
  readJsonl,
  renderText,
  summarize,
  validateScoutState,
  validateSourceRegistry
};

