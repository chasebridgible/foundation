import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  capabilityMapPathFor,
  capabilityEvalReceiptPathFor,
  capabilitySummaryPathFor,
  writeJsonl as writeCapabilityJsonl
} from "./capability-map-core.mjs";
import { surfaceFunctionMapPathFor } from "./surface-function-map-core.mjs";
import {
  defaultBackfillDir,
  readJson,
  readJsonl,
  scoreSpecJobQueueRow,
  specJobQueueCheckPathFor,
  specJobQueueEvalReceiptPathFor,
  specJobQueuePathFor,
  specJobQueueSummaryPathFor,
  summarizeResults,
  validateSpecJobQueue,
  writeJsonl
} from "./spec-job-queue-core.mjs";

const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
const fileInitScript = path.join(scriptsDir, "artifact-inventory-init.mjs");
const fileFillScript = path.join(scriptsDir, "artifact-inventory-fill.mjs");
const fileCheckScript = path.join(scriptsDir, "artifact-inventory-check.mjs");
const fileEvalScript = path.join(scriptsDir, "artifact-inventory-eval.mjs");
const surfaceInitScript = path.join(scriptsDir, "surface-function-map-init.mjs");
const surfaceFillScript = path.join(scriptsDir, "surface-function-map-fill.mjs");
const surfaceCheckScript = path.join(scriptsDir, "surface-function-map-check.mjs");
const surfaceEvalScript = path.join(scriptsDir, "surface-function-map-eval.mjs");
const capabilityInitScript = path.join(scriptsDir, "capability-map-init.mjs");
const capabilityFillScript = path.join(scriptsDir, "capability-map-fill.mjs");
const capabilityCheckScript = path.join(scriptsDir, "capability-map-check.mjs");
const capabilityEvalScript = path.join(scriptsDir, "capability-map-eval.mjs");
const splitInitScript = path.join(scriptsDir, "spec-job-queue-init.mjs");
const splitFillScript = path.join(scriptsDir, "spec-job-queue-fill.mjs");
const splitCheckScript = path.join(scriptsDir, "spec-job-queue-check.mjs");
const splitEvalScript = path.join(scriptsDir, "spec-job-queue-eval.mjs");
const splitRefreshScript = path.join(scriptsDir, "spec-job-queue-refresh.mjs");
const splitReportScript = path.join(scriptsDir, "spec-job-queue-report.mjs");

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-spec-job-queue-"));
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
  fs.writeFileSync(path.join(repoRoot, "README.md"), "# Spec Job Queue fixture\n", "utf8");
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

function prepareArtifactInventory(repoRoot, runId = "20260529-01") {
  runNode(fileInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(fileFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot);
  runNode(fileCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(fileEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
}

function prepareSurfaceFunctionMap(repoRoot, runId = "20260529-01") {
  prepareArtifactInventory(repoRoot, runId);
  runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const pendingPaths = [...new Set(readJsonl(surfaceFunctionMapPathFor(repoRoot, runId)).rows.map(row => row.upstreamPaths[0]))];
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
  prepareSurfaceFunctionMap(repoRoot, runId);
  runNode(capabilityInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
}

function prepareCapabilityMap(repoRoot, runId = "20260529-01") {
  prepareCapabilitySkeleton(repoRoot, runId);
  const rows = readJsonl(capabilityMapPathFor(repoRoot, runId)).rows;
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
      splitReason: "Screen rendering, API payload, and persistence contracts need separate Context Pack slices before spec authoring.",
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

function prepareSpecJobQueueSkeleton(repoRoot, runId = "20260529-01") {
  prepareCapabilityMap(repoRoot, runId);
  runNode(splitInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
}

function capabilityIdsByStatus(repoRoot, runId, status) {
  return readJsonl(capabilityMapPathFor(repoRoot, runId)).rows
    .filter(row => row.status === status)
    .map(row => row.capabilityId);
}

function readyPackageSlice(capabilityId) {
  return [{
    name: "Package test command evidence slice",
    upstreamCapabilityIds: [capabilityId],
    ownerSkill: "backfill-context-pack",
    scope: "Capture package test command execution evidence for receipt",
    includedBehaviors: ["Package script command invocation and terminal result capture"],
    excludedBehaviors: ["Dashboard runtime behavior stays outside this command slice"],
    exitCriterion: `Context Pack receipt cites ${capabilityId} and verifies package script command execution.`,
    nextAction: "Collect package script command evidence and write the receipt row.",
    verificationTargets: [`${capabilityId} package script execution receipt`],
    status: "ready",
    confidence: "high"
  }];
}

function dashboardSlices(capabilityId) {
  return [
    {
      name: "Dashboard screen Context Pack slice",
      upstreamCapabilityIds: [capabilityId],
      ownerSkill: "backfill-context-pack",
      scope: "Capture dashboard screen rendering states for evidence receipt",
      includedBehaviors: ["Dashboard screen loading loaded empty and error state evidence"],
      excludedBehaviors: ["API payload contract proof stays outside this screen slice"],
      exitCriterion: `Context Pack receipt cites ${capabilityId} and verifies dashboard screen rendering states.`,
      nextAction: "Collect dashboard screen evidence and write the receipt row.",
      verificationTargets: [`${capabilityId} dashboard screen rendering receipt`],
      childSliceRationale: "Screen rendering is one child of the broader dashboard capability.",
      status: "ready",
      confidence: "high"
    },
    {
      name: "Dashboard API Context Pack slice",
      upstreamCapabilityIds: [capabilityId],
      ownerSkill: "backfill-context-pack",
      scope: "Capture dashboard API payload behavior for evidence receipt",
      includedBehaviors: ["Dashboard API request response payload and failure evidence"],
      excludedBehaviors: ["Screen rendering proof stays outside this API slice"],
      exitCriterion: `Context Pack receipt cites ${capabilityId} and verifies dashboard API payload behavior.`,
      nextAction: "Collect dashboard API evidence and write the receipt row.",
      verificationTargets: [`${capabilityId} dashboard API payload receipt`],
      childSliceRationale: "API payload behavior is one child of the broader dashboard capability.",
      status: "ready",
      confidence: "high"
    }
  ];
}

function preparePassingSpecJobQueue(repoRoot, runId = "20260529-01", runLog = null) {
  prepareSpecJobQueueSkeleton(repoRoot, runId);
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

test("init requires Capability Map eval with resolved revision targets and creates pending slices", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilityMap(repoRoot, runId);
  const output = runNode(splitInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(output, /spec-job-queue-skeleton/);
  const rows = readJsonl(specJobQueuePathFor(repoRoot, runId)).rows;
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
  prepareSpecJobQueueSkeleton(repoRoot, runId);
  const handoff = validateSpecJobQueue({ repoRoot, runId, phase: "handoff" });
  assert.equal(hasFailure(handoff.results, "handoff-no-pending-slices"), true);
  const batch = validateSpecJobQueue({ repoRoot, runId, phase: "batch" });
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
  const queuePath = specJobQueuePathFor(repoRoot, runId);
  const rows = readJsonl(queuePath).rows;
  const pendingSplit = rows.find(row => row.upstreamCapabilityIds.includes(splitIds[0]));
  writeJsonl(queuePath, rows.map(row => row.sliceId === pendingSplit.sliceId
    ? { ...row, status: "ready", ownerSkill: "backfill-context-pack", scope: "Capture dashboard parent behavior for evidence receipt", includedBehaviors: ["Dashboard screen API and persistence evidence together"], excludedBehaviors: ["No separate child slice evidence recorded"], exitCriterion: `Context Pack receipt cites ${splitIds[0]} and verifies dashboard parent behavior.`, nextAction: "Collect broad dashboard evidence and write one receipt.", verificationTargets: [`${splitIds[0]} broad dashboard receipt`] }
    : row));
  const results = validateSpecJobQueue({ repoRoot, runId }).results;
  assert.equal(hasFailure(results, "spec-job-queue-needs-split-child-slices"), true);
});

test("fill --next is read-only and fill rejects coarse shortcuts", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareSpecJobQueueSkeleton(repoRoot, runId);
  const before = readJsonl(specJobQueuePathFor(repoRoot, runId)).rows;
  const output = runNode(splitFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot);
  const payload = JSON.parse(output);
  const after = readJsonl(specJobQueuePathFor(repoRoot, runId)).rows;
  assert.equal(payload.schema, "foundation.backfill.spec-job-queue-next-target.v1");
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

test("semantic alignment gate rejects unrelated child-slice taxonomy", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareSpecJobQueueSkeleton(repoRoot, runId);
  const splitId = capabilityIdsByStatus(repoRoot, runId, "needs-split")[0];
  const unrelatedSlices = [
    {
      name: "OpenClaw SQL validation evidence slice",
      upstreamCapabilityIds: [splitId],
      ownerSkill: "backfill-context-pack",
      scope: "Capture OpenClaw SQL parser validation and generated query receipt evidence",
      includedBehaviors: ["OpenClaw SQL validation query parsing and database syntax evidence"],
      excludedBehaviors: ["Dashboard screen and API payload behavior stay outside this SQL slice"],
      exitCriterion: `Context Pack receipt cites ${splitId} and verifies OpenClaw SQL validation.`,
      nextAction: "Collect OpenClaw SQL validation evidence and write the receipt row.",
      verificationTargets: [`${splitId} OpenClaw SQL validation receipt`],
      childSliceRationale: "SQL validation is one child slice.",
      status: "ready",
      confidence: "high"
    },
    {
      name: "OpenClaw SQL migration evidence slice",
      upstreamCapabilityIds: [splitId],
      ownerSkill: "backfill-context-pack",
      scope: "Capture OpenClaw SQL migration execution and database schema receipt evidence",
      includedBehaviors: ["OpenClaw SQL migration execution and schema validation evidence"],
      excludedBehaviors: ["Dashboard screen and API payload behavior stay outside this migration slice"],
      exitCriterion: `Context Pack receipt cites ${splitId} and verifies OpenClaw SQL migration behavior.`,
      nextAction: "Collect OpenClaw SQL migration evidence and write the receipt row.",
      verificationTargets: [`${splitId} OpenClaw SQL migration receipt`],
      childSliceRationale: "SQL migration is one child slice.",
      status: "ready",
      confidence: "high"
    }
  ];

  assert.throws(
    () => runNode(splitFillScript, ["--repo", repoRoot, "--run-id", runId, "--capability-ids", splitId, "--slices-json", JSON.stringify(unrelatedSlices)], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /semantic alignment failed/);
      return true;
    }
  );

  const queuePath = specJobQueuePathFor(repoRoot, runId);
  const rows = readJsonl(queuePath).rows;
  const pendingSplit = rows.find(row => row.upstreamCapabilityIds.includes(splitId));
  writeJsonl(queuePath, [
    ...rows.filter(row => row.sliceId !== pendingSplit.sliceId),
    ...unrelatedSlices.map((slice, index) => ({
      ...pendingSplit,
      ...slice,
      sliceId: `slice-unrelated-${index + 1}`,
      evidenceRefs: pendingSplit.evidenceRefs,
      upstreamCapabilityRefs: pendingSplit.upstreamCapabilityRefs,
      capabilityRefs: pendingSplit.capabilityRefs
    }))
  ]);
  const results = validateSpecJobQueue({ repoRoot, runId }).results;
  assert.equal(hasFailure(results, "spec-job-queue-semantic-alignment"), true);
});

test("filled child slices pass check and eval writes canonical receipts", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingSpecJobQueue(repoRoot, runId);
  const output = runNode(splitCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(output, /Summary: .* 0 fail/);
  const evalOutput = runNode(splitEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
  assert.match(evalOutput, /Acceptable: yes/);
  assert.match(evalOutput, /Revision targets: 0/);
  const receipts = readJsonl(specJobQueueEvalReceiptPathFor(repoRoot, runId));
  assert.equal(receipts.errors.length, 0);
  assert.equal(receipts.rows[0].receiptType, "summary");
  assert.equal(typeof receipts.rows[0].queueFingerprint, "string");
  assert.equal(receipts.rows[0].queueRowCount, 3);
  assert.equal(fs.existsSync(specJobQueueSummaryPathFor(repoRoot, runId)), true);
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
    ownerSkill: "backfill-context-pack",
    scope: "Handle all application system things",
    includedBehaviors: ["everything"],
    exitCriterion: "done",
    nextAction: "do it",
    verificationTargets: [],
    evidenceRefs: [{ capabilityId: "cap-dashboard", detail: "agent-read-the-file" }],
    reviewFlags: []
  };
  const receipt = scoreSpecJobQueueRow(row, new Map([["cap-dashboard", capability]]), new Map([["cap-dashboard", [row]]]));
  assert.equal(receipt.findings.some(finding => finding.category === "sliceSpecificity" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "evidenceSupport" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "splitDiscipline" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "semanticAlignment" && finding.severity === "blocking"), true);
});

test("checker blocks stale spec-job-queue eval receipts after queue changes", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingSpecJobQueue(repoRoot, runId);
  runNode(splitEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
  const queuePath = specJobQueuePathFor(repoRoot, runId);
  const rows = readJsonl(queuePath).rows;
  writeJsonl(queuePath, rows.map((row, index) => index === 0
    ? { ...row, scope: `${row.scope} with refreshed evidence boundary` }
    : row));
  const results = validateSpecJobQueue({ repoRoot, runId }).results;
  assert.equal(hasFailure(results, "spec-job-queue-eval-current"), true);
  const checkOutput = runNode(splitEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
  assert.match(checkOutput, /Acceptable: yes/);
  const refreshed = validateSpecJobQueue({ repoRoot, runId }).results;
  assert.equal(hasFailure(refreshed, "spec-job-queue-eval-current"), false);
});

test("refresh invalidates slices when upstream Capability Map rows change", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingSpecJobQueue(repoRoot, runId);
  const matrixPath = capabilityMapPathFor(repoRoot, runId);
  const capabilities = readJsonl(matrixPath).rows.map(row => (
    row.status === "ready-for-queue"
      ? { ...row, name: `${row.name} changed`, updatedAt: new Date().toISOString() }
      : row
  ));
  writeCapabilityJsonl(matrixPath, capabilities);
  const output = runNode(splitRefreshScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const payload = JSON.parse(output);
  assert.equal(payload.changedCount > 0, true);
  const rows = readJsonl(specJobQueuePathFor(repoRoot, runId)).rows;
  assert.equal(rows.some(row => row.status === "pending"), true);
});

test("report embeds Job / Spec Queue state and checker detects report drift", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  const runLog = path.join("docs", "specs", "backfill", `run-log-${runId}.jsonl`);
  preparePassingSpecJobQueue(repoRoot, runId, runLog);
  runNode(splitCheckScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  runNode(splitEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", "--run-log", runLog], repoRoot);
  const reportOutput = runNode(splitReportScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  const report = JSON.parse(reportOutput);
  assert.equal(report.state.checkerResult, "pass");
  assert.equal(report.state.evalResult, "pass");
  assert.equal(report.state.evalQueueFresh, true);
  assert.equal(report.state.nextLayer, "Context Pack");

  const checkOutput = runNode(splitCheckScript, ["--repo", repoRoot, "--run-id", runId, "--report", report.reportPath], repoRoot);
  assert.match(checkOutput, /spec-job-queue-report-state-current/);
  const reportPath = path.join(repoRoot, report.reportPath);
  const drifted = fs.readFileSync(reportPath, "utf8").replace(`"readyCount": 3`, `"readyCount": 99`);
  fs.writeFileSync(reportPath, drifted, "utf8");
  const drift = validateSpecJobQueue({ repoRoot, runId, reportPath }).results;
  assert.equal(hasFailure(drift, "spec-job-queue-report-state-current"), true);

  const reportHtml = fs.readFileSync(reportPath, "utf8");
  assert.match(reportHtml, /id="backfill-spec-job-queue"/);
});

test("check command writes check artifact", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingSpecJobQueue(repoRoot, runId);
  runNode(splitCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const check = readJson(specJobQueueCheckPathFor(repoRoot, runId));
  assert.equal(check.schema, "foundation.backfill.spec-job-queue-check.v1");
  assert.equal(summarizeResults(check.results).fail, 0);
  assert.equal(fs.existsSync(capabilitySummaryPathFor(repoRoot, runId)), true);
});
