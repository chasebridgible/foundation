import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  capabilityCheckPathFor,
  capabilityEvalReceiptPathFor,
  capabilityMatrixPathFor,
  capabilitySummaryPathFor,
  defaultBackfillDir,
  readJson,
  readJsonl,
  scoreCapabilityRow,
  summarizeResults,
  validateCapabilityMatrix,
  writeJsonl
} from "./capability-matrix-core.mjs";
import { surfaceRegistryPathFor } from "./surface-registry-core.mjs";

const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
const fileInitScript = path.join(scriptsDir, "file-registry-init.mjs");
const fileFillScript = path.join(scriptsDir, "file-registry-fill.mjs");
const fileCheckScript = path.join(scriptsDir, "file-registry-check.mjs");
const fileEvalScript = path.join(scriptsDir, "file-registry-eval.mjs");
const surfaceInitScript = path.join(scriptsDir, "surface-registry-init.mjs");
const surfaceFillScript = path.join(scriptsDir, "surface-registry-fill.mjs");
const surfaceCheckScript = path.join(scriptsDir, "surface-registry-check.mjs");
const surfaceEvalScript = path.join(scriptsDir, "surface-registry-eval.mjs");
const surfaceReportScript = path.join(scriptsDir, "surface-registry-report.mjs");
const capabilityInitScript = path.join(scriptsDir, "capability-matrix-init.mjs");
const capabilityFillScript = path.join(scriptsDir, "capability-matrix-fill.mjs");
const capabilityCheckScript = path.join(scriptsDir, "capability-matrix-check.mjs");
const capabilityEvalScript = path.join(scriptsDir, "capability-matrix-eval.mjs");
const capabilityRefreshScript = path.join(scriptsDir, "capability-matrix-refresh.mjs");
const capabilityReportScript = path.join(scriptsDir, "capability-matrix-report.mjs");

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-capability-matrix-"));
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
  fs.writeFileSync(path.join(repoRoot, "README.md"), "# Capability matrix fixture\n", "utf8");
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
      consumerHints: ["user"],
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

function prepareSurfaceRegistry(repoRoot, runId = "20260529-01", runLog = null) {
  prepareFileRegistry(repoRoot, runId);
  const initArgs = ["--repo", repoRoot, "--run-id", runId];
  if (runLog) initArgs.push("--run-log", runLog);
  runNode(surfaceInitScript, initArgs, repoRoot);
  const pendingPaths = [...new Set(readJsonl(surfaceRegistryPathFor(repoRoot, runId)).rows.map(row => row.upstreamPaths[0]))];
  for (const filePath of pendingPaths) {
    runNode(surfaceFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--path", filePath,
      "--surfaces-json", JSON.stringify(surfaceSpecsForPath(filePath)),
      ...(runLog ? ["--run-log", runLog] : [])
    ], repoRoot);
  }
  runNode(surfaceCheckScript, ["--repo", repoRoot, "--run-id", runId, ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
  runNode(surfaceEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
  runNode(surfaceReportScript, ["--repo", repoRoot, "--run-id", runId, ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
}

function prepareCapabilitySkeleton(repoRoot, runId = "20260529-01", runLog = null) {
  prepareSurfaceRegistry(repoRoot, runId, runLog);
  runNode(capabilityInitScript, ["--repo", repoRoot, "--run-id", runId, ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
}

function capabilitySpec(surfaceIds, overrides = {}) {
  return [{
    name: "Authenticated dashboard review",
    actor: "Authenticated workspace user",
    intendedOutcome: "Review current dashboard metrics and supporting event context.",
    domainObject: "Dashboard workspace",
    actions: ["Open dashboard", "Request dashboard API data", "Review dashboard event context"],
    states: ["loading", "loaded", "empty", "error"],
    rules: ["Dashboard data must come from authenticated app/API surfaces", "Database event rows back the dashboard context"],
    experience: "The user sees dashboard content or a bounded loading, empty, or error state.",
    backingContracts: ["Dashboard screen surface", "GET /dashboard API surface", "dashboard_events table"],
    failureAndRecovery: ["API failures render an error state without hiding the dashboard boundary"],
    evidence: surfaceIds.map(surfaceId => `${surfaceId} reviewed in Surface Registry`),
    status: "ready-for-queue",
    confidence: "high",
    ...overrides
  }];
}

function prepareCapabilityMatrix(repoRoot, runId = "20260529-01", runLog = null) {
  prepareCapabilitySkeleton(repoRoot, runId, runLog);
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
    "--capabilities-json", JSON.stringify(capabilitySpec(dashboardSurfaceIds)),
    ...(runLog ? ["--run-log", runLog] : [])
  ], repoRoot);
  runNode(capabilityFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--surface-ids", packageSurfaceIds.join(","),
    "--capabilities-json", JSON.stringify([{
      name: "Developer validation command",
      actor: "Repository developer",
      intendedOutcome: "Run the project test suite from the package script.",
      domainObject: "Package test command",
      actions: ["Run npm test", "Inspect test results"],
      states: ["command available", "tests running", "tests passed", "tests failed"],
      rules: ["The package script is the command boundary for project test execution"],
      experience: "The developer invokes the test command and receives terminal pass or fail output.",
      backingContracts: ["package test command surface"],
      failureAndRecovery: ["A failing test run returns non-zero output for revision"],
      evidence: packageSurfaceIds.map(surfaceId => `${surfaceId} package command surface`),
      status: "ready-for-queue",
      confidence: "high"
    }]),
    ...(runLog ? ["--run-log", runLog] : [])
  ], repoRoot);
}

function hasFailure(results, id) {
  return results.some(result => result.id === id && result.status === "fail");
}

test("init requires passing Surface Registry handoff and creates pending capability rows", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareSurfaceRegistry(repoRoot, runId);
  const output = runNode(capabilityInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(output, /capability-matrix-skeleton/);
  const rows = readJsonl(capabilityMatrixPathFor(repoRoot, runId)).rows;
  assert.equal(rows.length > 0, true);
  assert.equal(rows.every(row => row.status === "pending"), true);
  assert.equal(rows.every(row => row.upstreamSurfaceRefs[0].surfaceFingerprint.startsWith("sha256:")), true);
});

test("checker rejects pending rows at handoff and allows them during batch phase", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilitySkeleton(repoRoot, runId);
  const handoff = validateCapabilityMatrix({ repoRoot, runId, phase: "handoff" });
  assert.equal(hasFailure(handoff.results, "handoff-no-pending-capabilities"), true);
  const batch = validateCapabilityMatrix({ repoRoot, runId, phase: "batch" });
  assert.equal(hasFailure(batch.results, "handoff-no-pending-capabilities"), false);
  assert.equal(batch.results.some(result => result.id === "batch-pending-capabilities-allowed" && result.status === "warn"), true);
});

test("fill --next names the next pending surface target without mutating rows", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilitySkeleton(repoRoot, runId);
  const before = readJsonl(capabilityMatrixPathFor(repoRoot, runId)).rows;
  const output = runNode(capabilityFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot);
  const payload = JSON.parse(output);
  const after = readJsonl(capabilityMatrixPathFor(repoRoot, runId)).rows;
  assert.equal(payload.schema, "foundation.backfill.capability-matrix-next-target.v1");
  assert.equal(typeof payload.target.surfaceId, "string");
  assert.deepEqual(after, before);
});

test("fill groups reviewed surfaces and checker passes handoff", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilityMatrix(repoRoot, runId);
  const output = runNode(capabilityCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(output, /Summary: .* 0 fail/);
  const rows = readJsonl(capabilityMatrixPathFor(repoRoot, runId)).rows;
  assert.equal(rows.some(row => row.name === "Authenticated dashboard review"), true);
  assert.equal(rows.every(row => row.status === "ready-for-queue"), true);
});

test("checker fails stale upstream refs, missing coverage, and needs-split rows without split criteria", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilityMatrix(repoRoot, runId);
  const matrixPath = capabilityMatrixPathFor(repoRoot, runId);
  const rows = readJsonl(matrixPath).rows;
  rows[0] = {
    ...rows[0],
    upstreamSurfaceIds: rows[0].upstreamSurfaceIds.slice(1),
    upstreamSurfaceRefs: [{ ...rows[0].upstreamSurfaceRefs[0], surfaceFingerprint: "sha256:stale" }]
  };
  rows[1] = {
    ...rows[1],
    status: "needs-split",
    splitNeeded: true,
    splitReason: "",
    splitCriteria: []
  };
  writeJsonl(matrixPath, rows);
  const results = validateCapabilityMatrix({ repoRoot, runId }).results;
  assert.equal(hasFailure(results, "capability-upstream-fresh"), true);
  assert.equal(hasFailure(results, "capability-covers-ready-surfaces"), true);
  assert.equal(results.some(result => result.id.endsWith(":split-reason") && result.status === "fail"), true);
});

test("fill rejects generated capability files and batch shortcuts", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilitySkeleton(repoRoot, runId);
  const rows = readJsonl(capabilityMatrixPathFor(repoRoot, runId)).rows;
  assert.throws(
    () => runNode(capabilityFillScript, ["--repo", repoRoot, "--run-id", runId, "--surface-ids", rows[0].upstreamSurfaceIds[0], "--capabilities-file", "generated.json"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /does not accept --capabilities-file/);
      return true;
    }
  );
  assert.throws(
    () => runNode(capabilityFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /does not support --all or --batch-size/);
      return true;
    }
  );
  assert.throws(
    () => runNode(capabilityFillScript, ["--repo", repoRoot, "--run-id", runId, "--batch-size", "10"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /does not support --all or --batch-size/);
      return true;
    }
  );
});

test("eval flags broad ready-for-queue rows and writes receipts for passing rows", () => {
  const surfaceById = new Map(Array.from({ length: 9 }, (_, index) => [`surface:${index}`, {
    surfaceId: `surface:${index}`,
    surfaceKind: index % 2 === 0 ? "api" : "screen",
    status: "ready-for-capability",
    label: `Surface ${index}`,
    upstreamPaths: [`path/${index}.ts`],
    actorHints: [`actor ${index}`]
  }]));
  const row = {
    capabilityId: "cap-broad",
    name: "Broad dashboard and backend and infrastructure management capability",
    actor: "Many different users",
    intendedOutcome: "Use many unrelated pieces of the application in a single broad row.",
    domainObject: "Application estate",
    actions: ["Open dashboard", "Deploy services", "Run database migrations"],
    states: ["loaded", "deployed", "migrated"],
    rules: ["Different permission models apply"],
    experience: "Multiple unrelated experiences are collapsed.",
    backingContracts: ["dashboard", "deployment", "database"],
    failureAndRecovery: ["recover by splitting"],
    evidence: [...surfaceById.keys()],
    evidenceRefs: [...surfaceById.keys()].map(surfaceId => ({ surfaceId, detail: surfaceId })),
    upstreamSurfaceIds: [...surfaceById.keys()],
    status: "ready-for-queue",
    reviewFlags: []
  };
  const receipt = scoreCapabilityRow(row, surfaceById);
  assert.equal(receipt.findings.some(finding => finding.category === "splitDiscipline" && finding.severity === "blocking"), true);

  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilityMatrix(repoRoot, runId);
  const output = runNode(capabilityEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
  assert.match(output, /Acceptable: yes/);
  const receipts = readJsonl(capabilityEvalReceiptPathFor(repoRoot, runId));
  assert.equal(receipts.errors.length, 0);
  assert.equal(receipts.rows[0].receiptType, "summary");
  assert.equal(receipts.rows[0].calibration.status, "calibration-not-gold");
  assert.equal(fs.existsSync(capabilitySummaryPathFor(repoRoot, runId)), true);
});

test("refresh invalidates capabilities when upstream Surface Registry rows change", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilityMatrix(repoRoot, runId);
  const surfacePath = surfaceRegistryPathFor(repoRoot, runId);
  const surfaces = readJsonl(surfacePath).rows.map(row => (
    row.status === "ready-for-capability"
      ? { ...row, label: `${row.label} changed`, updatedAt: new Date().toISOString() }
      : row
  ));
  writeJsonl(surfacePath, surfaces);
  const output = runNode(capabilityRefreshScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const payload = JSON.parse(output);
  assert.equal(payload.changedCount > 0, true);
  const rows = readJsonl(capabilityMatrixPathFor(repoRoot, runId)).rows;
  assert.equal(rows.some(row => row.status === "pending"), true);
});

test("report command embeds matrix state and checker can detect report drift", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  const runLog = path.join("docs", "specs", "backfill", `run-log-${runId}.jsonl`);
  prepareCapabilityMatrix(repoRoot, runId, runLog);
  runNode(capabilityCheckScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  runNode(capabilityEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", "--run-log", runLog], repoRoot);
  const reportOutput = runNode(capabilityReportScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  const report = JSON.parse(reportOutput);
  assert.equal(report.state.checkerResult, "pass");
  assert.equal(report.state.evalResult, "pass");
  assert.equal(report.state.nextLayer, "split and queue");

  const checkOutput = runNode(capabilityCheckScript, ["--repo", repoRoot, "--run-id", runId, "--report", report.reportPath], repoRoot);
  assert.match(checkOutput, /capability-report-state-current/);
  const reportPath = path.join(repoRoot, report.reportPath);
  const drifted = fs.readFileSync(reportPath, "utf8").replace(`"readyForQueueCount": 2`, `"readyForQueueCount": 99`);
  fs.writeFileSync(reportPath, drifted, "utf8");
  const drift = validateCapabilityMatrix({ repoRoot, runId, reportPath }).results;
  assert.equal(hasFailure(drift, "capability-report-state-current"), true);
});

test("check command writes check artifact", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  prepareCapabilityMatrix(repoRoot, runId);
  runNode(capabilityCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const check = readJson(capabilityCheckPathFor(repoRoot, runId));
  assert.equal(check.schema, "foundation.backfill.capability-matrix-check.v1");
  assert.equal(summarizeResults(check.results).fail, 0);
});
