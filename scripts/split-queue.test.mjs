import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  capabilityMatrixPathFor,
  capabilityEvalReceiptPathFor,
  capabilitySummaryPathFor,
  writeJsonl as writeCapabilityJsonl
} from "./capability-matrix-core.mjs";
import { surfaceRegistryPathFor } from "./surface-registry-core.mjs";
import {
  defaultBackfillDir,
  readJson,
  readJsonl,
  scoreSplitQueueRow,
  splitQueueCheckPathFor,
  splitQueueEvalReceiptPathFor,
  splitQueuePathFor,
  splitQueueSummaryPathFor,
  summarizeResults,
  validateSplitQueue,
  writeJsonl
} from "./split-queue-core.mjs";

const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
const fileInitScript = path.join(scriptsDir, "file-registry-init.mjs");
const fileFillScript = path.join(scriptsDir, "file-registry-fill.mjs");
const fileCheckScript = path.join(scriptsDir, "file-registry-check.mjs");
const fileEvalScript = path.join(scriptsDir, "file-registry-eval.mjs");
const surfaceInitScript = path.join(scriptsDir, "surface-registry-init.mjs");
const surfaceFillScript = path.join(scriptsDir, "surface-registry-fill.mjs");
const surfaceCheckScript = path.join(scriptsDir, "surface-registry-check.mjs");
const surfaceEvalScript = path.join(scriptsDir, "surface-registry-eval.mjs");
const capabilityInitScript = path.join(scriptsDir, "capability-matrix-init.mjs");
const capabilityFillScript = path.join(scriptsDir, "capability-matrix-fill.mjs");
const capabilityCheckScript = path.join(scriptsDir, "capability-matrix-check.mjs");
const capabilityEvalScript = path.join(scriptsDir, "capability-matrix-eval.mjs");
const splitInitScript = path.join(scriptsDir, "split-queue-init.mjs");
const splitFillScript = path.join(scriptsDir, "split-queue-fill.mjs");
const splitCheckScript = path.join(scriptsDir, "split-queue-check.mjs");
const splitEvalScript = path.join(scriptsDir, "split-queue-eval.mjs");
const splitRefreshScript = path.join(scriptsDir, "split-queue-refresh.mjs");
const splitReportScript = path.join(scriptsDir, "split-queue-report.mjs");

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-split-queue-"));
  execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
  fs.mkdirSync(path.join(repoRoot, "web", "app", "dashboard"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "backend", "src", "routes"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "database", "migrations"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({
    scripts: { test: "node --test" },
    dependencies: { fastify: "^5.0.0", next: "^16.0.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(repoRoot, "web", "app", "dashboard", "page.tsx"), `
export default function DashboardPage() {
  return <main>Dashboard</main>;
}
`, "utf8");
  fs.writeFileSync(path.join(repoRoot, "backend", "src", "routes", "dashboard.ts"), `
export async function dashboardRoute(fastify) {
  fastify.get("/dashboard", async () => ({ stores: [] }));
}
`, "utf8");
  fs.writeFileSync(path.join(repoRoot, "database", "migrations", "001_dashboard.sql"), `
CREATE TABLE dashboard_events (
  id serial primary key,
  label text not null
);
`, "utf8");
  fs.writeFileSync(path.join(repoRoot, "README.md"), "# Split queue fixture\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, ".gitignore"), "node_modules\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  return repoRoot;
}

function runNode(script, args, cwd) {
  return execFileSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function surfaceSpecsForPath(filePath) {
  if (filePath === "package.json") {
    return [{
      surfaceKind: "command",
      label: "package test command",
      exposedObject: "npm test",
      operation: "runs node test suite",
      consumerHints: ["developer", "automation"],
      actorHints: ["developer"],
      confidence: "high",
      evidence: "Full package.json read shows scripts.test is node --test."
    }];
  }
  if (filePath === "web/app/dashboard/page.tsx") {
    return [{
      surfaceKind: "screen",
      label: "Dashboard page screen",
      exposedObject: "DashboardPage",
      operation: "renders dashboard page",
      consumerHints: ["authenticated user"],
      actorHints: ["authenticated user"],
      stateHints: ["dashboard loading", "dashboard content"],
      ruleHints: ["dashboard route is part of authenticated app"],
      confidence: "high",
      evidence: "Full page.tsx read shows DashboardPage renders dashboard UI."
    }];
  }
  if (filePath === "backend/src/routes/dashboard.ts") {
    return [{
      surfaceKind: "api",
      label: "GET /dashboard API",
      exposedObject: "GET /dashboard",
      operation: "returns dashboard store payload",
      consumerHints: ["frontend client"],
      actorHints: ["authenticated user"],
      dataObjects: ["stores"],
      stateHints: ["request received", "response returned"],
      ruleHints: ["route returns store array"],
      confidence: "high",
      evidence: "Full route file read shows fastify.get('/dashboard') returns a stores array."
    }];
  }
  if (filePath === "database/migrations/001_dashboard.sql") {
    return [{
      surfaceKind: "table",
      label: "dashboard_events table",
      exposedObject: "dashboard_events",
      operation: "stores dashboard event labels",
      consumerHints: ["backend service"],
      dataObjects: ["dashboard_events"],
      confidence: "high",
      evidence: "Full SQL read shows CREATE TABLE dashboard_events."
    }];
  }
  throw new Error(`Unexpected surface path ${filePath}`);
}

function prepareFileRegistry(repoRoot, runId = "20260529-01") {
  runNode(fileInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(fileFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot);
  runNode(fileCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(fileEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
}

function prepareSurfaceRegistry(repoRoot, runId = "20260529-01") {
  prepareFileRegistry(repoRoot, runId);
  runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const pendingPaths = [...new Set(readJsonl(surfaceRegistryPathFor(repoRoot, runId)).rows.map(row => row.upstreamPaths[0]))];
  for (const filePath of pendingPaths) {
    runNode(surfaceFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--path", filePath,
      "--surfaces-json", JSON.stringify(surfaceSpecsForPath(filePath))
    ], repoRoot);
  }
  runNode(surfaceCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(surfaceEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
}

function prepareCapabilitySkeleton(repoRoot, runId = "20260529-01") {
  prepareSurfaceRegistry(repoRoot, runId);
  runNode(capabilityInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
}

function prepareCapabilityMatrix(repoRoot, runId = "20260529-01") {
  prepareCapabilitySkeleton(repoRoot, runId);
  const rows = readJsonl(capabilityMatrixPathFor(repoRoot, runId)).rows;
  const dashboardSurfaceIds = rows
    .filter(row => row.surfaceRefs[0].path !== "package.json")
    .map(row => row.upstreamSurfaceIds[0]);
  const packageSurfaceIds = rows
    .filter(row => row.surfaceRefs[0].path === "package.json")
    .map(row => row.upstreamSurfaceIds[0]);
  runNode(capabilityFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--surface-ids", dashboardSurfaceIds.join(","),
    "--capabilities-json", JSON.stringify([{
      name: "Authenticated dashboard discovery capability",
      actor: "Authenticated workspace reviewer",
      intendedOutcome: "Review dashboard screen data and persistence context for operational decisions.",
      domainObject: "Authenticated dashboard review workflow",
      actions: [
        "Open dashboard screen for store metrics",
        "Fetch dashboard API store payload",
        "Inspect dashboard event persistence contract"
      ],
      states: ["screen loading", "screen loaded", "API response ready", "event persistence ready"],
      rules: [
        "Dashboard screen data comes from authenticated API requests",
        "Event persistence supplies dashboard context records"
      ],
      experience: "The reviewer sees current dashboard values with bounded loading and error states.",
      backingContracts: ["Dashboard page screen", "GET /dashboard API", "dashboard_events table"],
      failureAndRecovery: ["API or persistence failure routes to bounded dashboard revision evidence"],
      evidence: dashboardSurfaceIds.map(surfaceId => `${surfaceId} reviewed and mapped to dashboard behavior`),
      status: "needs-split",
      splitNeeded: true,
      splitReason: "Screen rendering, API payload, and persistence contracts need separate evidence pack slices before spec authoring.",
      splitCriteria: [
        "Screen rendering behavior is separated from API payload verification.",
        "API payload verification is separated from database persistence contract coverage."
      ],
      confidence: "high"
    }])
  ], repoRoot);
  runNode(capabilityFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--surface-ids", packageSurfaceIds.join(","),
    "--capabilities-json", JSON.stringify([{
      name: "Developer test command execution",
      actor: "Repository developer",
      intendedOutcome: "Run the project test suite from the package script.",
      domainObject: "Repository package test script boundary",
      actions: ["Execute package script for automated tests", "Inspect terminal test pass or fail output"],
      states: ["command available", "tests running", "tests passed", "tests failed"],
      rules: ["The package script is the command boundary for project test execution"],
      experience: "The developer invokes the test command and receives terminal pass or fail output.",
      backingContracts: ["package test command surface"],
      failureAndRecovery: ["A failing test run returns non-zero output for revision"],
      evidence: packageSurfaceIds.map(surfaceId => `${surfaceId} package command surface`),
      status: "ready-for-queue",
      confidence: "high"
    }])
  ], repoRoot);
  runNode(capabilityCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(capabilityEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
}

function prepareSplitQueueSkeleton(repoRoot, runId = "20260529-01") {
  prepareCapabilityMatrix(repoRoot, runId);
  runNode(splitInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
}

function capabilityIdsByStatus(repoRoot, runId, status) {
  return readJsonl(capabilityMatrixPathFor(repoRoot, runId)).rows
    .filter(row => row.status === status)
    .map(row => row.capabilityId);
}

function readyPackageSlice(capabilityId) {
  return [{
    name: "Package test command evidence slice",
    upstreamCapabilityIds: [capabilityId],
    ownerSkill: "backfill-evidence-pack",
    scope: "Capture package test command execution evidence for receipt",
    includedBehaviors: ["Package script command invocation and terminal result capture"],
    excludedBehaviors: ["Dashboard runtime behavior stays outside this command slice"],
    exitCriterion: `Evidence pack receipt cites ${capabilityId} and verifies package script command execution.`,
    nextAction: "Collect package script command evidence and write the receipt row.",
    verificationTargets: [`${capabilityId} package script execution receipt`],
    status: "ready",
    confidence: "high"
  }];
}

function dashboardSlices(capabilityId) {
  return [
    {
      name: "Dashboard screen evidence pack slice",
      upstreamCapabilityIds: [capabilityId],
      ownerSkill: "backfill-evidence-pack",
      scope: "Capture dashboard screen rendering states for evidence receipt",
      includedBehaviors: ["Dashboard screen loading loaded empty and error state evidence"],
      excludedBehaviors: ["API payload contract proof stays outside this screen slice"],
      exitCriterion: `Evidence pack receipt cites ${capabilityId} and verifies dashboard screen rendering states.`,
      nextAction: "Collect dashboard screen evidence and write the receipt row.",
      verificationTargets: [`${capabilityId} dashboard screen rendering receipt`],
      childSliceRationale: "Screen rendering is one child of the broader dashboard capability.",
      status: "ready",
      confidence: "high"
    },
    {
      name: "Dashboard API evidence pack slice",
      upstreamCapabilityIds: [capabilityId],
      ownerSkill: "backfill-evidence-pack",
      scope: "Capture dashboard API payload behavior for evidence receipt",
      includedBehaviors: ["Dashboard API request response payload and failure evidence"],
      excludedBehaviors: ["Screen rendering proof stays outside this API slice"],
      exitCriterion: `Evidence pack receipt cites ${capabilityId} and verifies dashboard API payload behavior.`,
      nextAction: "Collect dashboard API evidence and write the receipt row.",
      verificationTargets: [`${capabilityId} dashboard API payload receipt`],
      childSliceRationale: "API payload behavior is one child of the broader dashboard capability.",
      status: "ready",
      confidence: "high"
    }
  ];
}

function preparePassingSplitQueue(repoRoot, runId = "20260529-01", runLog = null) {
  prepareSplitQueueSkeleton(repoRoot, runId);
  const readyIds = capabilityIdsByStatus(repoRoot, runId, "ready-for-queue");
  const splitIds = capabilityIdsByStatus(repoRoot, runId, "needs-split");
  runNode(splitFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--capability-ids", readyIds.join(","),
    "--slices-json", JSON.stringify(readyPackageSlice(readyIds[0])),
    ...(runLog ? ["--run-log", runLog] : [])
  ], repoRoot);
  runNode(splitFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--capability-ids", splitIds.join(","),
    "--slices-json", JSON.stringify(dashboardSlices(splitIds[0])),
    ...(runLog ? ["--run-log", runLog] : [])
  ], repoRoot);
}

function hasFailure(results, id) {
  return results.some(result => result.id === id && result.status === "fail");
}

test("init requires Capability Matrix eval with resolved revision targets and creates pending slices", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilityMatrix(repoRoot, runId);
  const output = runNode(splitInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(output, /split-queue-skeleton/);
  const rows = readJsonl(splitQueuePathFor(repoRoot, runId)).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows.every(row => row.status === "pending"), true);
  assert.equal(rows.every(row => row.upstreamCapabilityRefs[0].capabilityFingerprint.startsWith("sha256:")), true);

  const receiptPath = capabilityEvalReceiptPathFor(repoRoot, runId);
  const receipts = readJsonl(receiptPath).rows;
  receipts[0] = {
    ...receipts[0],
    findings: [{
      category: "specificity",
      severity: "warning",
      message: "Fixture warning requiring revision.",
      subjectRowId: "cap:fixture"
    }],
    revisionTargets: ["cap:fixture"]
  };
  writeCapabilityJsonl(receiptPath, receipts);
  assert.throws(
    () => runNode(splitInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot),
    error => {
      assert.match(`${error.stdout || ""}${error.stderr || ""}${error.message}`, /revision targets must be resolved/);
      return true;
    }
  );
});

test("checker rejects pending handoff and requires needs-split child slices", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareSplitQueueSkeleton(repoRoot, runId);
  const handoff = validateSplitQueue({ repoRoot, runId, phase: "handoff" });
  assert.equal(hasFailure(handoff.results, "handoff-no-pending-slices"), true);
  const batch = validateSplitQueue({ repoRoot, runId, phase: "batch" });
  assert.equal(hasFailure(batch.results, "handoff-no-pending-slices"), false);
  assert.equal(batch.results.some(result => result.id === "batch-pending-slices-allowed" && result.status === "warn"), true);

  const readyIds = capabilityIdsByStatus(repoRoot, runId, "ready-for-queue");
  const splitIds = capabilityIdsByStatus(repoRoot, runId, "needs-split");
  runNode(splitFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--capability-ids", readyIds.join(","),
    "--slices-json", JSON.stringify(readyPackageSlice(readyIds[0]))
  ], repoRoot);
  const queuePath = splitQueuePathFor(repoRoot, runId);
  const rows = readJsonl(queuePath).rows;
  const pendingSplit = rows.find(row => row.upstreamCapabilityIds.includes(splitIds[0]));
  writeJsonl(queuePath, rows.map(row => row.sliceId === pendingSplit.sliceId
    ? { ...row, status: "ready", ownerSkill: "backfill-evidence-pack", scope: "Capture dashboard parent behavior for evidence receipt", includedBehaviors: ["Dashboard screen API and persistence evidence together"], excludedBehaviors: ["No separate child slice evidence recorded"], exitCriterion: `Evidence pack receipt cites ${splitIds[0]} and verifies dashboard parent behavior.`, nextAction: "Collect broad dashboard evidence and write one receipt.", verificationTargets: [`${splitIds[0]} broad dashboard receipt`] }
    : row));
  const results = validateSplitQueue({ repoRoot, runId }).results;
  assert.equal(hasFailure(results, "split-queue-needs-split-child-slices"), true);
});

test("fill --next is read-only and fill rejects coarse shortcuts", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareSplitQueueSkeleton(repoRoot, runId);
  const before = readJsonl(splitQueuePathFor(repoRoot, runId)).rows;
  const output = runNode(splitFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot);
  const payload = JSON.parse(output);
  const after = readJsonl(splitQueuePathFor(repoRoot, runId)).rows;
  assert.equal(payload.schema, "foundation.backfill.split-queue-next-target.v1");
  assert.equal(typeof payload.target.sliceId, "string");
  assert.deepEqual(after, before);

  const splitId = capabilityIdsByStatus(repoRoot, runId, "needs-split")[0];
  assert.throws(
    () => runNode(splitFillScript, ["--repo", repoRoot, "--run-id", runId, "--capability-ids", splitId, "--slices-json", JSON.stringify(dashboardSlices(splitId).slice(0, 1))], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /needs-split capabilities require at least two child slice specs/);
      return true;
    }
  );
  assert.throws(
    () => runNode(splitFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /does not support --all or --batch-size/);
      return true;
    }
  );
  assert.throws(
    () => runNode(splitFillScript, ["--repo", repoRoot, "--run-id", runId, "--capability-ids", splitId, "--slices-file", "generated.json"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /does not accept --slices-file/);
      return true;
    }
  );
});

test("filled child slices pass check and eval writes canonical receipts", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingSplitQueue(repoRoot, runId);
  const output = runNode(splitCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(output, /Summary: .* 0 fail/);
  const evalOutput = runNode(splitEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
  assert.match(evalOutput, /Acceptable: yes/);
  assert.match(evalOutput, /Revision targets: 0/);
  const receipts = readJsonl(splitQueueEvalReceiptPathFor(repoRoot, runId));
  assert.equal(receipts.errors.length, 0);
  assert.equal(receipts.rows[0].receiptType, "summary");
  assert.equal(fs.existsSync(splitQueueSummaryPathFor(repoRoot, runId)), true);
});

test("eval flags broad vague slices and generic evidence", () => {
  const capability = {
    capabilityId: "cap-dashboard",
    name: "Dashboard review",
    status: "needs-split",
    splitNeeded: true,
    splitCriteria: ["Split screen behavior from API payload behavior."]
  };
  const row = {
    sliceId: "slice-broad",
    name: "Entire application system slice",
    status: "ready",
    upstreamCapabilityIds: ["cap-dashboard"],
    upstreamCapabilityRefs: [{ capabilityId: "cap-dashboard", capabilityFingerprint: "sha256:stale" }],
    ownerSkill: "backfill-evidence-pack",
    scope: "Handle all application system things",
    includedBehaviors: ["everything"],
    exitCriterion: "done",
    nextAction: "do it",
    verificationTargets: [],
    evidenceRefs: [{ capabilityId: "cap-dashboard", detail: "agent-read-the-file" }],
    reviewFlags: []
  };
  const receipt = scoreSplitQueueRow(row, new Map([["cap-dashboard", capability]]), new Map([["cap-dashboard", [row]]]));
  assert.equal(receipt.findings.some(finding => finding.category === "sliceSpecificity" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "evidenceSupport" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "splitDiscipline" && finding.severity === "blocking"), true);
});

test("refresh invalidates slices when upstream Capability Matrix rows change", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingSplitQueue(repoRoot, runId);
  const matrixPath = capabilityMatrixPathFor(repoRoot, runId);
  const capabilities = readJsonl(matrixPath).rows.map(row => (
    row.status === "ready-for-queue"
      ? { ...row, name: `${row.name} changed`, updatedAt: new Date().toISOString() }
      : row
  ));
  writeCapabilityJsonl(matrixPath, capabilities);
  const output = runNode(splitRefreshScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const payload = JSON.parse(output);
  assert.equal(payload.changedCount > 0, true);
  const rows = readJsonl(splitQueuePathFor(repoRoot, runId)).rows;
  assert.equal(rows.some(row => row.status === "pending"), true);
});

test("report embeds split queue state and checker detects report drift", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  const runLog = path.join("docs", "specs", "backfill", `run-log-${runId}.jsonl`);
  preparePassingSplitQueue(repoRoot, runId, runLog);
  runNode(splitCheckScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  runNode(splitEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", "--run-log", runLog], repoRoot);
  const reportOutput = runNode(splitReportScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  const report = JSON.parse(reportOutput);
  assert.equal(report.state.checkerResult, "pass");
  assert.equal(report.state.evalResult, "pass");
  assert.equal(report.state.nextLayer, "evidence pack");

  const checkOutput = runNode(splitCheckScript, ["--repo", repoRoot, "--run-id", runId, "--report", report.reportPath], repoRoot);
  assert.match(checkOutput, /split-queue-report-state-current/);
  const reportPath = path.join(repoRoot, report.reportPath);
  const drifted = fs.readFileSync(reportPath, "utf8").replace(`"readyCount": 3`, `"readyCount": 99`);
  fs.writeFileSync(reportPath, drifted, "utf8");
  const drift = validateSplitQueue({ repoRoot, runId, reportPath }).results;
  assert.equal(hasFailure(drift, "split-queue-report-state-current"), true);

  const legacyHtml = fs.readFileSync(reportPath, "utf8");
  assert.match(legacyHtml, /id="backfill-slice-queue"/);
});

test("check command writes check artifact", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingSplitQueue(repoRoot, runId);
  runNode(splitCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const check = readJson(splitQueueCheckPathFor(repoRoot, runId));
  assert.equal(check.schema, "foundation.backfill.split-queue-check.v1");
  assert.equal(summarizeResults(check.results).fail, 0);
  assert.equal(fs.existsSync(capabilitySummaryPathFor(repoRoot, runId)), true);
});
