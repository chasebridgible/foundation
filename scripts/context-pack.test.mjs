import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  capabilityEvalReceiptPathFor,
  capabilityMapPathFor,
  writeJsonl as writeCapabilityJsonl
} from "./capability-map-core.mjs";
import { registryPathFor } from "./artifact-inventory-core.mjs";
import { surfaceFunctionMapPathFor } from "./surface-function-map-core.mjs";
import {
  contextPackCheckPathFor,
  contextPackEvalReceiptPathFor,
  contextPackPathFor,
  contextPackSummaryPathFor,
  readJson,
  readJsonl,
  scoreContextPackRow,
  summarizeResults,
  upstreamSliceRef,
  validateContextPack,
  validateContextPackRows,
  writeJsonl
} from "./context-pack-core.mjs";
import {
  specJobQueueEvalReceiptPathFor,
  specJobQueuePathFor,
  specJobQueueSummaryPathFor
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
const evidenceInitScript = path.join(scriptsDir, "context-pack-init.mjs");
const evidenceFillScript = path.join(scriptsDir, "context-pack-fill.mjs");
const evidenceCheckScript = path.join(scriptsDir, "context-pack-check.mjs");
const evidenceEvalScript = path.join(scriptsDir, "context-pack-eval.mjs");
const evidenceRefreshScript = path.join(scriptsDir, "context-pack-refresh.mjs");
const evidenceReportScript = path.join(scriptsDir, "context-pack-report.mjs");

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-context-pack-"));
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
  fs.writeFileSync(path.join(repoRoot, "README.md"), "# Context Pack fixture\n", "utf8");
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
      evidence: "Package script exposes the node test command boundary."
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
      evidence: "DashboardPage export and main element expose dashboard screen behavior."
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
      evidence: "Fastify dashboard route returns a stores array payload."
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
      evidence: "CREATE TABLE dashboard_events declares dashboard event persistence."
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

function prepareCapabilityMap(repoRoot, runId = "20260529-01") {
  prepareSurfaceFunctionMap(repoRoot, runId);
  runNode(capabilityInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
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

function capabilityIdsByStatus(repoRoot, runId, status) {
  return readJsonl(capabilityMapPathFor(repoRoot, runId)).rows
    .filter(row => row.status === status)
    .map(row => row.capabilityId);
}

function preparePassingSpecJobQueueHandoff(repoRoot, runId = "20260529-01") {
  prepareCapabilityMap(repoRoot, runId);
  runNode(splitInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const readyIds = capabilityIdsByStatus(repoRoot, runId, "ready-for-queue");
  const splitIds = capabilityIdsByStatus(repoRoot, runId, "needs-split");
  runNode(splitFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--capability-ids", readyIds.join(","),
    "--slices-json", JSON.stringify(readyPackageSlice(readyIds[0]))
  ], repoRoot);
  runNode(splitFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--capability-ids", splitIds.join(","),
    "--slices-json", JSON.stringify(dashboardSlices(splitIds[0]))
  ], repoRoot);
  runNode(splitCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(splitEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
}

function fileIdByPath(repoRoot, runId, filePath) {
  return readJsonl(registryPathFor(repoRoot, runId)).rows.find(row => row.path === filePath)?.fileId;
}

function surfaceIdByPath(repoRoot, runId, filePath) {
  return readJsonl(surfaceFunctionMapPathFor(repoRoot, runId)).rows.find(row => row.upstreamPaths?.[0] === filePath)?.surfaceId;
}

function packSpecForSlice(repoRoot, runId, slice) {
  const packageFileId = fileIdByPath(repoRoot, runId, "package.json");
  const packageSurfaceId = surfaceIdByPath(repoRoot, runId, "package.json");
  const lowerName = slice.name.toLowerCase();
  if (lowerName.includes("package")) {
    return {
      upstreamSliceId: slice.sliceId,
      upstreamSurfaceIds: [packageSurfaceId],
      upstreamFileIds: [packageFileId],
      evidenceRefs: [{
        category: "test",
        relationship: "verification-command",
        path: "package.json",
        fileId: packageFileId,
        surfaceId: packageSurfaceId,
        lineRange: "L2-L5",
        snippet: "\"test\": \"node --test\"",
        detail: "Package script entry gives the exact repository test command boundary used to verify this queued command slice.",
        questionAnswered: "Which concrete command verifies package test command execution?"
      }],
      excludedRefs: [{
        path: "web/app/dashboard/page.tsx",
        reason: "Dashboard screen rendering belongs to a separate queued slice and should not expand this command pack."
      }],
      sufficiencyRationale: "The package command pack is sufficient because it ties the queued command slice to the exact package script line, the package command surface, and the upstream capability trace without loading dashboard runtime files.",
      status: "ready-for-process-map",
      confidence: "high"
    };
  }
  if (lowerName.includes("screen")) {
    const screenFileId = fileIdByPath(repoRoot, runId, "web/app/dashboard/page.tsx");
    const screenSurfaceId = surfaceIdByPath(repoRoot, runId, "web/app/dashboard/page.tsx");
    return {
      upstreamSliceId: slice.sliceId,
      upstreamSurfaceIds: [screenSurfaceId, packageSurfaceId],
      upstreamFileIds: [screenFileId, packageFileId],
      evidenceRefs: [
        {
          category: "file",
          relationship: "screen-source",
          path: "web/app/dashboard/page.tsx",
          fileId: screenFileId,
          surfaceId: screenSurfaceId,
          lineRange: "L2-L4",
          snippet: "export default function DashboardPage() { return <main>Dashboard</main>; }",
          detail: "DashboardPage export and main element provide the exact source anchor for dashboard screen Process / Action Map.",
          questionAnswered: "Which source lines define the dashboard screen behavior?"
        },
        {
          category: "test",
          relationship: "verification-command",
          path: "package.json",
          fileId: packageFileId,
          surfaceId: packageSurfaceId,
          lineRange: "L2-L5",
          snippet: "\"test\": \"node --test\"",
          detail: "Package script entry provides the concrete command boundary for checking screen-slice verification changes.",
          questionAnswered: "Which command verifies screen behavior changes after spec authoring?"
        }
      ],
      excludedRefs: [{
        path: "backend/src/routes/dashboard.ts",
        reason: "Dashboard API payload proof belongs to the API Context Pack slice."
      }],
      sufficiencyRationale: "The dashboard screen pack is sufficient because it includes the exact screen source line, the test command boundary, and the upstream capability trace while excluding API payload and persistence evidence from this screen-only slice.",
      status: "ready-for-process-map",
      confidence: "high"
    };
  }
  const apiFileId = fileIdByPath(repoRoot, runId, "backend/src/routes/dashboard.ts");
  const apiSurfaceId = surfaceIdByPath(repoRoot, runId, "backend/src/routes/dashboard.ts");
  const schemaFileId = fileIdByPath(repoRoot, runId, "database/migrations/001_dashboard.sql");
  const schemaSurfaceId = surfaceIdByPath(repoRoot, runId, "database/migrations/001_dashboard.sql");
  return {
    upstreamSliceId: slice.sliceId,
    upstreamSurfaceIds: [apiSurfaceId, schemaSurfaceId, packageSurfaceId],
    upstreamFileIds: [apiFileId, schemaFileId, packageFileId],
    evidenceRefs: [
      {
        category: "file",
        relationship: "api-source",
        path: "backend/src/routes/dashboard.ts",
        fileId: apiFileId,
        surfaceId: apiSurfaceId,
        lineRange: "L2-L4",
        snippet: "fastify.get(\"/dashboard\", async () => ({ stores: [] }));",
        detail: "Fastify GET dashboard route line anchors the API payload behavior for Process / Action Map.",
        questionAnswered: "Which source line defines the dashboard API payload?"
      },
      {
        category: "schema",
        relationship: "persistence-context",
        path: "database/migrations/001_dashboard.sql",
        fileId: schemaFileId,
        surfaceId: schemaSurfaceId,
        lineRange: "L2-L5",
        snippet: "CREATE TABLE dashboard_events",
        detail: "Dashboard events table declaration gives persistence context adjacent to the API evidence slice.",
        questionAnswered: "Which schema object provides dashboard persistence context?"
      },
      {
        category: "test",
        relationship: "verification-command",
        path: "package.json",
        fileId: packageFileId,
        surfaceId: packageSurfaceId,
        lineRange: "L2-L5",
        snippet: "\"test\": \"node --test\"",
        detail: "Package script entry provides the concrete command boundary for checking API-slice verification changes.",
        questionAnswered: "Which command verifies API behavior changes after spec authoring?"
      }
    ],
    excludedRefs: [{
      path: "web/app/dashboard/page.tsx",
      reason: "Dashboard screen rendering proof belongs to the screen Context Pack slice."
    }],
    sufficiencyRationale: "The dashboard API pack is sufficient because it includes the exact route source, related persistence schema context, the test command boundary, and the upstream capability trace while excluding the screen rendering slice.",
    status: "ready-for-process-map",
    confidence: "high"
  };
}

function preparePassingContextPack(repoRoot, runId = "20260529-01", runLog = null) {
  preparePassingSpecJobQueueHandoff(repoRoot, runId);
  runNode(evidenceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const slices = readJsonl(specJobQueuePathFor(repoRoot, runId)).rows;
  for (const slice of slices) {
    runNode(evidenceFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--slice-ids", slice.sliceId,
      "--packs-json", JSON.stringify([packSpecForSlice(repoRoot, runId, slice)]),
      ...(runLog ? ["--run-log", runLog] : [])
    ], repoRoot);
  }
}

function hasFailure(results, id) {
  return results.some(result => result.id === id && result.status === "fail");
}

test("init requires current Define Spec Jobs eval with resolved revision targets and creates pending packs", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingSpecJobQueueHandoff(repoRoot, runId);
  const output = runNode(evidenceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(output, /context-pack-skeleton/);
  const rows = readJsonl(contextPackPathFor(repoRoot, runId)).rows;
  assert.equal(rows.length, 3);
  assert.equal(rows.every(row => row.status === "pending"), true);
  assert.equal(rows.every(row => row.upstreamSliceRef.sliceFingerprint.startsWith("sha256:")), true);
  assert.equal(fs.existsSync(specJobQueueSummaryPathFor(repoRoot, runId)), true);

  const receiptPath = specJobQueueEvalReceiptPathFor(repoRoot, runId);
  const receipts = readJsonl(receiptPath).rows;
  receipts[0] = {
    ...receipts[0],
    findings: [{
      category: "specificity",
      severity: "warning",
      message: "Fixture warning requiring revision.",
      subjectRowId: "slice:fixture"
    }],
    revisionTargets: ["slice:fixture"]
  };
  writeJsonl(receiptPath, receipts);
  assert.throws(
    () => runNode(evidenceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot),
    error => {
      assert.match(`${error.stdout || ""}${error.stderr || ""}${error.message}`, /revision targets must be resolved/);
      return true;
    }
  );
});

test("fill --next is read-only and fill rejects coarse shortcuts", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingSpecJobQueueHandoff(repoRoot, runId);
  runNode(evidenceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const before = readJsonl(contextPackPathFor(repoRoot, runId)).rows;
  const output = runNode(evidenceFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot);
  const payload = JSON.parse(output);
  const after = readJsonl(contextPackPathFor(repoRoot, runId)).rows;
  assert.equal(payload.schema, "foundation.backfill.context-pack-next-target.v1");
  assert.equal(typeof payload.target.packId, "string");
  assert.deepEqual(after, before);

  const sliceId = readJsonl(specJobQueuePathFor(repoRoot, runId)).rows[0].sliceId;
  assert.throws(
    () => runNode(evidenceFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /does not support --all or --batch-size/);
      return true;
    }
  );
  assert.throws(
    () => runNode(evidenceFillScript, ["--repo", repoRoot, "--run-id", runId, "--slice-ids", sliceId, "--packs-file", "generated.json"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /does not accept --packs-file/);
      return true;
    }
  );
});

test("filled packs pass check, eval writes receipts, and report drift is detected", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  const runLog = path.join("docs", "specs", "backfill", `run-log-${runId}.jsonl`);
  preparePassingContextPack(repoRoot, runId, runLog);
  const checkOutput = runNode(evidenceCheckScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  assert.match(checkOutput, /Summary: .* 0 fail/);
  const evalOutput = runNode(evidenceEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", "--run-log", runLog], repoRoot);
  assert.match(evalOutput, /Acceptable: yes/);
  assert.match(evalOutput, /Revision targets: 0/);

  const receipts = readJsonl(contextPackEvalReceiptPathFor(repoRoot, runId));
  assert.equal(receipts.errors.length, 0);
  assert.equal(receipts.rows[0].receiptType, "summary");
  assert.equal(typeof receipts.rows[0].packFingerprint, "string");
  assert.equal(receipts.rows[0].packRowCount, 3);
  assert.equal(fs.existsSync(contextPackSummaryPathFor(repoRoot, runId)), true);

  const reportOutput = runNode(evidenceReportScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  const report = JSON.parse(reportOutput);
  assert.equal(report.state.checkerResult, "pass");
  assert.equal(report.state.evalResult, "pass");
  assert.equal(report.state.evalPackFresh, true);
  assert.equal(report.state.nextLayer, "Process / Action Map");

  const checkWithReport = runNode(evidenceCheckScript, ["--repo", repoRoot, "--run-id", runId, "--report", report.reportPath], repoRoot);
  assert.match(checkWithReport, /context-pack-report-state-current/);
  const reportPath = path.join(repoRoot, report.reportPath);
  const drifted = fs.readFileSync(reportPath, "utf8").replace(`"readyForProcessMapCount": 3`, `"readyForProcessMapCount": 99`);
  fs.writeFileSync(reportPath, drifted, "utf8");
  const drift = validateContextPack({ repoRoot, runId, reportPath }).results;
  assert.equal(hasFailure(drift, "context-pack-report-state-current"), true);
});

test("eval flags generic full-file evidence and missing category coverage", () => {
  const queueRow = {
    sliceId: "slice-dashboard-screen",
    name: "Dashboard screen Context Pack slice",
    status: "ready",
    upstreamCapabilityIds: ["cap-dashboard"],
    scope: "Capture dashboard screen rendering states",
    exitCriterion: "Context Pack receipt cites cap-dashboard and verifies dashboard screen rendering states."
  };
  const row = {
    schema: "foundation.backfill.context-pack-row.v1",
    runId: "20260529-01",
    packId: "ep-weak",
    upstreamSliceId: "slice-dashboard-screen",
    upstreamSliceRef: { sliceId: "slice-dashboard-screen", sliceFingerprint: "sha256:stale" },
    upstreamCapabilityIds: ["cap-dashboard"],
    upstreamSurfaceIds: [],
    upstreamFileIds: [],
    evidenceRefs: [{
      category: "file",
      path: "web/app/dashboard/page.tsx",
      detail: "agent-read-the-file"
    }],
    excludedRefs: [],
    explicitGaps: [],
    sufficiencyRationale: "done",
    blockingQuestions: [],
    blockingGaps: [],
    humanDecisions: [],
    reviewFlags: [],
    tokenBudget: 100,
    estimatedTokens: 10,
    status: "ready-for-process-map",
    confidence: "medium"
  };
  const receipt = scoreContextPackRow(row, new Map([["slice-dashboard-screen", queueRow]]));
  assert.equal(receipt.findings.some(finding => finding.category === "evidenceSpecificity" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "categoryCoverage" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "processActionReadiness" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "upstreamTraceability" && finding.severity === "blocking"), true);
});

test("checker rejects generic full-file evidence refs", () => {
  const queueRow = {
    sliceId: "slice-package",
    name: "Package test command evidence slice",
    runId: "20260529-01",
    status: "ready",
    upstreamCapabilityIds: ["cap-package"]
  };
  const row = {
    schema: "foundation.backfill.context-pack-row.v1",
    runId: "20260529-01",
    packId: "ep-package",
    upstreamSliceId: queueRow.sliceId,
    upstreamSliceRef: upstreamSliceRef(queueRow, "sha256:queue"),
    upstreamCapabilityIds: ["cap-package"],
    upstreamSurfaceIds: ["surface-package"],
    upstreamFileIds: ["file-package"],
    evidenceRefs: [
      {
        category: "queue-slice",
        sliceId: "slice-package",
        detail: "Context Pack is derived from Define Spec Jobs slice slice-package.",
        questionAnswered: "Which queued slice does this Context Pack support?"
      },
      {
        category: "capability",
        capabilityId: "cap-package",
        detail: "Context Pack preserves upstream Capability Map row cap-package.",
        questionAnswered: "Which upstream capability must this pack support?"
      },
      {
        category: "test",
        path: "package.json",
        fileId: "file-package",
        surfaceId: "surface-package",
        lineRange: "L2-L5",
        detail: "agent-read-the-file",
        questionAnswered: "Which exact verification command supports this pack?"
      }
    ],
    excludedRefs: [],
    explicitGaps: [],
    sufficiencyRationale: "The package command pack is sufficient because it ties exact command verification to the queued slice and capability boundary.",
    blockingQuestions: [],
    blockingGaps: [],
    humanDecisions: [],
    reviewFlags: [],
    tokenBudget: 12000,
    estimatedTokens: 200,
    status: "ready-for-process-map",
    confidence: "high"
  };
  const results = validateContextPackRows({
    queueRows: [queueRow],
    capabilityRows: [{ capabilityId: "cap-package" }],
    surfaceRows: [{ surfaceId: "surface-package" }],
    fileRows: [{ fileId: "file-package", path: "package.json" }],
    packRows: [row]
  });
  assert.equal(results.some(result => result.status === "fail" && result.id.includes(":specificity")), true);
});

test("checker blocks stale eval receipts after pack changes and refresh invalidates stale upstream slices", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingContextPack(repoRoot, runId);
  runNode(evidenceCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(evidenceEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
  const packPath = contextPackPathFor(repoRoot, runId);
  const rows = readJsonl(packPath).rows;
  writeJsonl(packPath, rows.map((row, index) => index === 0
    ? { ...row, sufficiencyRationale: `${row.sufficiencyRationale} Additional exact verification sentence for a revised pack.` }
    : row));
  const staleEval = validateContextPack({ repoRoot, runId }).results;
  assert.equal(hasFailure(staleEval, "context-pack-eval-current"), true);
  const staleReport = JSON.parse(runNode(evidenceReportScript, ["--repo", repoRoot, "--run-id", runId], repoRoot));
  assert.equal(staleReport.state.checkPackFresh, false);
  assert.equal(staleReport.state.checkerResult, "fail-or-missing");

  runNode(evidenceEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
  const refreshedEval = validateContextPack({ repoRoot, runId }).results;
  assert.equal(hasFailure(refreshedEval, "context-pack-eval-current"), false);

  const queuePath = specJobQueuePathFor(repoRoot, runId);
  const queueRows = readJsonl(queuePath).rows.map((row, index) => index === 0
    ? { ...row, scope: `${row.scope} with refreshed evidence boundary`, updatedAt: new Date().toISOString() }
    : row);
  writeJsonl(queuePath, queueRows);
  const staleUpstream = validateContextPack({ repoRoot, runId }).results;
  assert.equal(hasFailure(staleUpstream, "context-pack-upstream-fresh"), true);
  const output = runNode(evidenceRefreshScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const payload = JSON.parse(output);
  assert.equal(payload.changedCount > 0, true);
  const refreshedRows = readJsonl(contextPackPathFor(repoRoot, runId)).rows;
  assert.equal(refreshedRows.some(row => row.status === "pending"), true);
});

test("check command writes check artifact", () => {
  const repoRoot = makeRepo();
  const runId = "20260529-01";
  preparePassingContextPack(repoRoot, runId);
  runNode(evidenceCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const check = readJson(contextPackCheckPathFor(repoRoot, runId));
  assert.equal(check.schema, "foundation.backfill.context-pack-check.v1");
  assert.equal(summarizeResults(check.results).fail, 0);
  assert.equal(fs.existsSync(capabilityEvalReceiptPathFor(repoRoot, runId)), true);
});
