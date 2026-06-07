import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { registryPathFor } from "./artifact-inventory-core.mjs";
import { surfaceFunctionMapPathFor } from "./surface-function-map-core.mjs";
import { capabilityMapPathFor } from "./capability-map-core.mjs";
import { specJobQueuePathFor } from "./spec-job-queue-core.mjs";
import { contextPackPathFor } from "./context-pack-core.mjs";
import {
  processActionMapEvalReceiptPathFor,
  processActionMapPathFor,
  readJsonl as readProcessJsonl,
  writeJsonl as writeProcessJsonl
} from "./process-action-map-core.mjs";
import {
  authorSpecsCheckPathFor,
  authorSpecsEvalReceiptPathFor,
  authorSpecsPathFor,
  authorSpecsSummaryPathFor,
  readJson,
  readJsonl,
  scoreAuthorSpecRow,
  validateAuthorSpecs,
  writeJsonl
} from "./author-specs-core.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
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
const evidenceReportScript = path.join(scriptsDir, "context-pack-report.mjs");
const processInitScript = path.join(scriptsDir, "process-action-map-init.mjs");
const processFillScript = path.join(scriptsDir, "process-action-map-fill.mjs");
const processCheckScript = path.join(scriptsDir, "process-action-map-check.mjs");
const processEvalScript = path.join(scriptsDir, "process-action-map-eval.mjs");
const processReportScript = path.join(scriptsDir, "process-action-map-report.mjs");
const authorInitScript = path.join(scriptsDir, "author-specs-init.mjs");
const authorFillScript = path.join(scriptsDir, "author-specs-fill.mjs");
const authorCheckScript = path.join(scriptsDir, "author-specs-check.mjs");
const authorEvalScript = path.join(scriptsDir, "author-specs-eval.mjs");
const authorRefreshScript = path.join(scriptsDir, "author-specs-refresh.mjs");
const authorReportScript = path.join(scriptsDir, "author-specs-report.mjs");

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-author-specs-"));
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
  fs.writeFileSync(path.join(repoRoot, "README.md"), "# Author Specs fixture\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, ".gitignore"), "node_modules\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  return repoRoot;
}

function runNode(script, args, cwd) {
  return execFileSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", maxBuffer: 40 * 1024 * 1024 });
}

function runNodeFailure(script, args, cwd) {
  try {
    runNode(script, args, cwd);
  } catch (error) {
    return `${error.stdout || ""}${error.stderr || ""}${error.message}`;
  }
  assert.fail(`Expected command to fail: ${script} ${args.join(" ")}`);
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

function prepareArtifactInventory(repoRoot, runId) {
  runNode(fileInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  for (;;) {
    const next = JSON.parse(runNode(fileFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot));
    if (!next.target) break;
    runNode(fileFillScript, ["--repo", repoRoot, "--run-id", runId, "--path", next.target.path], repoRoot);
  }
  runNode(fileCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(fileEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
}

function prepareSurfaceFunctionMap(repoRoot, runId) {
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

function prepareCapabilityMap(repoRoot, runId) {
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
      name: "Authenticated reviewers can inspect dashboard screen API and persistence evidence for operational decisions",
      capabilityTitle: "Authenticated reviewers can inspect dashboard screen API and persistence evidence for operational decisions",
      capabilityAltitude: "sole",
      actor: "Authenticated workspace reviewer",
      intendedOutcome: "Review dashboard screen data and persistence context for operational decisions.",
      domainObject: "Authenticated dashboard review workflow",
      actions: ["Open dashboard screen for store metrics", "Fetch dashboard API store payload", "Inspect dashboard event persistence contract"],
      states: ["screen loading", "screen loaded", "API response ready", "event persistence ready"],
      rules: ["Dashboard screen data comes from authenticated API requests", "Event persistence supplies dashboard context records"],
      experience: "The reviewer sees current dashboard values with bounded loading and error states.",
      backingContracts: ["Dashboard page screen", "GET /dashboard API", "dashboard_events table"],
      failureAndRecovery: ["API or persistence failure routes to bounded dashboard revision evidence"],
      evidence: dashboardSurfaceIds.map(surfaceId => `${surfaceId} reviewed and mapped to dashboard behavior`),
      status: "ready-for-queue",
      confidence: "high"
    }])
  ], repoRoot);
  runNode(capabilityFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--surface-ids", packageSurfaceIds.join(","),
    "--capabilities-json", JSON.stringify([{
      name: "Repository developers can run the project test suite from the package script",
      capabilityTitle: "Repository developers can run the project test suite from the package script",
      capabilityAltitude: "sole",
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
  return [{
    name: "Dashboard screen API and persistence evidence slice",
    upstreamCapabilityIds: [capabilityId],
    ownerSkill: "backfill-context-pack",
    scope: "Capture dashboard screen states, GET /dashboard API payload behavior, dashboard_events persistence context, and package test verification evidence for the single queue-eligible dashboard capability.",
    includedBehaviors: [
      "Dashboard screen loading loaded empty and error state evidence",
      "GET /dashboard API payload and failure evidence",
      "dashboard_events persistence contract evidence",
      "Package test command verification boundary"
    ],
    excludedBehaviors: ["Package command-only capability behavior stays outside this dashboard slice"],
    exitCriterion: `Context Pack receipt cites ${capabilityId} and verifies dashboard screen states, API payloads, persistence context, and test-command evidence.`,
    nextAction: "Collect dashboard screen API persistence and verification evidence and write the receipt row.",
    verificationTargets: [`${capabilityId} dashboard screen API persistence test evidence receipt`],
    childSliceRationale: "The queue slice preserves the single queue-eligible dashboard capability boundary without splitting it downstream.",
    status: "ready",
    confidence: "high"
  }];
}

function preparePassingSpecJobQueueHandoff(repoRoot, runId) {
  prepareCapabilityMap(repoRoot, runId);
  runNode(splitInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const capabilityRows = readJsonl(capabilityMapPathFor(repoRoot, runId)).rows;
  const sliceSpecsForCapability = capabilityId => {
    const row = capabilityRows.find(candidate => candidate.capabilityId === capabilityId);
    return row?.name.toLowerCase().includes("dashboard")
      ? dashboardSlices(capabilityId)
      : readyPackageSlice(capabilityId);
  };
  for (;;) {
    const next = JSON.parse(runNode(splitFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot));
    if (!next.target) break;
    const capabilityId = next.target.upstreamCapabilityIds[0];
    runNode(splitFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--capability-ids", capabilityId,
      "--slices-json", JSON.stringify(sliceSpecsForCapability(capabilityId))
    ], repoRoot);
  }
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
      excludedRefs: [{ path: "web/app/dashboard/page.tsx", reason: "Dashboard screen rendering belongs to a separate queued slice." }],
      sufficiencyRationale: "The package command pack is sufficient because it ties the queued command slice to the exact package script line, the package command surface, and the upstream capability trace without loading dashboard runtime files.",
      status: "ready-for-process-map",
      confidence: "high"
    };
  }
  if (lowerName.includes("screen") && lowerName.includes("api") && lowerName.includes("persistence")) {
    const screenFileId = fileIdByPath(repoRoot, runId, "web/app/dashboard/page.tsx");
    const screenSurfaceId = surfaceIdByPath(repoRoot, runId, "web/app/dashboard/page.tsx");
    const apiFileId = fileIdByPath(repoRoot, runId, "backend/src/routes/dashboard.ts");
    const apiSurfaceId = surfaceIdByPath(repoRoot, runId, "backend/src/routes/dashboard.ts");
    const schemaFileId = fileIdByPath(repoRoot, runId, "database/migrations/001_dashboard.sql");
    const schemaSurfaceId = surfaceIdByPath(repoRoot, runId, "database/migrations/001_dashboard.sql");
    return {
      upstreamSliceId: slice.sliceId,
      upstreamSurfaceIds: [screenSurfaceId, apiSurfaceId, schemaSurfaceId, packageSurfaceId],
      upstreamFileIds: [screenFileId, apiFileId, schemaFileId, packageFileId],
      evidenceRefs: [
        {
          category: "file",
          relationship: "screen-source",
          path: "web/app/dashboard/page.tsx",
          fileId: screenFileId,
          surfaceId: screenSurfaceId,
          lineRange: "L2-L4",
          snippet: "export default function DashboardPage() { return <main>Dashboard</main>; }",
          detail: "DashboardPage export and main element anchor the dashboard screen states named by this queued slice.",
          questionAnswered: "Which source lines define the dashboard screen states?"
        },
        {
          category: "file",
          relationship: "api-source",
          path: "backend/src/routes/dashboard.ts",
          fileId: apiFileId,
          surfaceId: apiSurfaceId,
          lineRange: "L2-L4",
          snippet: "fastify.get(\"/dashboard\", async () => ({ stores: [] }));",
          detail: "Fastify GET dashboard route anchors the API payload behavior named by this queued slice.",
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
          detail: "Dashboard events table declaration anchors the persistence context named by this queued slice.",
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
          detail: "Package script entry provides the concrete command boundary for checking this dashboard slice after spec authoring.",
          questionAnswered: "Which command verifies dashboard behavior changes after spec authoring?"
        }
      ],
      excludedRefs: [{
        path: "package.json",
        reason: "The package command-only capability behavior remains outside this dashboard pack; only the test command line is included as verification evidence."
      }],
      sufficiencyRationale: "The dashboard pack is sufficient because it includes the screen source, API route, persistence schema, test command boundary, and upstream capability trace needed for this single queued slice without expanding to unrelated repository files.",
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
      excludedRefs: [{ path: "backend/src/routes/dashboard.ts", reason: "Dashboard API payload proof belongs to the API Context Pack slice." }],
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
    excludedRefs: [{ path: "web/app/dashboard/page.tsx", reason: "Dashboard screen rendering proof belongs to the screen Context Pack slice." }],
    sufficiencyRationale: "The dashboard API pack is sufficient because it includes the exact route source, related persistence schema context, the test command boundary, and the upstream capability trace while excluding the screen rendering slice.",
    status: "ready-for-process-map",
    confidence: "high"
  };
}

function preparePassingContextPackHandoff(repoRoot, runId, runLog = null) {
  preparePassingSpecJobQueueHandoff(repoRoot, runId);
  runNode(evidenceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const sliceById = new Map(readJsonl(specJobQueuePathFor(repoRoot, runId)).rows.map(row => [row.sliceId, row]));
  for (;;) {
    const next = JSON.parse(runNode(evidenceFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot));
    if (!next.target) break;
    const slice = sliceById.get(next.target.upstreamSliceId);
    runNode(evidenceFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--slice-ids", slice.sliceId,
      "--packs-json", JSON.stringify([packSpecForSlice(repoRoot, runId, slice)]),
      ...(runLog ? ["--run-log", runLog] : [])
    ], repoRoot);
  }
  runNode(evidenceCheckScript, ["--repo", repoRoot, "--run-id", runId, ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
  runNode(evidenceEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
  const report = JSON.parse(runNode(evidenceReportScript, ["--repo", repoRoot, "--run-id", runId, ...(runLog ? ["--run-log", runLog] : [])], repoRoot));
  assert.equal(report.state.nextLayer, "Process / Action Map");
  return report.reportPath;
}

function processSpecForPack(packRow) {
  const lowerName = `${packRow.upstreamSliceRef?.name || packRow.upstreamSliceId}`.toLowerCase();
  const isPackage = lowerName.includes("package");
  const isDashboardCombined = !isPackage && lowerName.includes("screen") && lowerName.includes("api") && lowerName.includes("persistence");
  if (isDashboardCombined) {
    const label = "dashboard operational review";
    const actor = "Authenticated dashboard reviewer";
    return {
      upstreamPackId: packRow.packId,
      actor,
      role: "workspace reviewer",
      trigger: "Authenticated reviewer opens the dashboard route and the system loads dashboard screen, API payload, and persistence-backed context.",
      intendedOutcome: "See dashboard screen states, receive dashboard API payload data, and preserve dashboard event context with bounded failure evidence for operational review.",
      domainObject: "Dashboard screen API and persistence review workflow",
      actions: [
        "Navigate to the dashboard screen",
        "Request GET /dashboard store payload data",
        "Trace dashboard event context to persisted records",
        "Run the package test command after revisions"
      ],
      stateModel: {
        states: [
          "dashboard route entered",
          "dashboard loading visible",
          "dashboard content visible",
          "API response returned",
          "dashboard event persistence ready",
          "dashboard error visible"
        ],
        transitions: [
          "dashboard route entered -> dashboard loading visible -> API response returned -> dashboard content visible",
          "API response returned -> dashboard event persistence ready",
          "dashboard loading visible -> dashboard error visible when API or persistence evidence fails"
        ],
        emptyStates: ["No stores returns a bounded empty dashboard state"],
        loadingStates: ["Dashboard shows request or route loading state"],
        errorStates: ["Dashboard or API exposes bounded failure state when route or persistence evidence fails"]
      },
      permissions: ["Actor has access to the authenticated dashboard boundary"],
      rules: ["Dashboard behavior must preserve screen states, API payload contract, persistence context, and test-command verification from the Context Pack evidence"],
      visibleBehavior: ["User or operator can distinguish loading, content, empty, API failure, and persistence failure outcomes"],
      edgeCases: ["The dashboard can receive an empty store list, an upstream request failure, or unavailable dashboard event persistence"],
      recoveryPaths: ["Use visible error evidence, API route evidence, persistence schema evidence, or package test output to revise the affected spec slice"],
      evidenceRefs: (packRow.evidenceRefs || []).slice(0, 4).map(ref => ({
        ...ref,
        detail: `${ref.detail} This evidence anchors the ${label} Process / Action Map row.`
      })),
      graphHints: {
        processLabel: `${label} process`,
        actorNodes: [actor],
        toolNodes: ["dashboard route", "GET /dashboard API", "dashboard_events table", "npm test"],
        evidenceNodes: [packRow.packId],
        metricNodes: [],
        gapNodes: []
      },
      specTargets: {
        jobSpecId: `fixture.${label.replace(/[^a-z0-9]+/g, "-")}.job`,
        technicalSpecId: `fixture.${label.replace(/[^a-z0-9]+/g, "-")}.technical`,
        evalSpecId: `fixture.${label.replace(/[^a-z0-9]+/g, "-")}.eval`,
        sections: ["process", "states", "rules", "recovery", "evidence"]
      },
      status: "ready-for-specs",
      confidence: "high"
    };
  }
  const isScreen = lowerName.includes("screen");
  const label = isPackage ? "package test command" : isScreen ? "dashboard screen review" : "dashboard API payload review";
  const actor = isPackage ? "Repository developer" : isScreen ? "Authenticated dashboard reviewer" : "Frontend dashboard client";
  const object = isPackage ? "Package test command execution" : isScreen ? "Dashboard screen rendering process" : "Dashboard API payload contract";
  return {
    upstreamPackId: packRow.packId,
    actor,
    role: isPackage ? "developer" : isScreen ? "workspace reviewer" : "API consumer",
    trigger: isPackage
      ? "Developer runs the npm test package script after changing repository behavior."
      : isScreen
        ? "Authenticated reviewer opens the dashboard route to inspect store data."
        : "Dashboard client requests GET /dashboard to load store payload data.",
    intendedOutcome: isPackage
      ? "Run the project test suite and receive a deterministic pass or fail terminal result for revision."
      : isScreen
        ? "See the dashboard screen render with bounded loading content and error behavior for review."
        : "Receive a dashboard stores payload or a bounded failure result that the screen can handle.",
    domainObject: object,
    actions: isPackage
      ? ["Invoke npm test from the repository root", "Observe terminal progress and final exit status"]
      : isScreen
        ? ["Navigate to the dashboard screen", "Read loaded dashboard content and state cues"]
        : ["Issue the GET /dashboard request", "Parse the returned stores payload or error result"],
    stateModel: {
      states: isPackage
        ? ["command available", "test process running", "test pass output visible", "test failure output visible"]
        : isScreen
          ? ["dashboard route entered", "dashboard loading visible", "dashboard content visible", "dashboard error visible"]
          : ["request pending", "stores payload returned", "empty stores payload returned", "API failure returned"],
      transitions: isPackage
        ? ["command available -> test process running -> test pass output visible or test failure output visible"]
        : isScreen
          ? ["dashboard route entered -> dashboard loading visible -> dashboard content visible or dashboard error visible"]
          : ["request pending -> stores payload returned, empty stores payload returned, or API failure returned"],
      emptyStates: isPackage ? ["No tests discovered produces an explicit terminal result"] : ["No stores returns a bounded empty dashboard state"],
      loadingStates: isPackage ? ["Terminal shows test process running"] : ["Dashboard shows request or route loading state"],
      errorStates: isPackage ? ["Terminal shows failing command output"] : ["Dashboard or API exposes bounded failure state"]
    },
    permissions: isPackage ? ["Developer has shell access to the target repository"] : ["Actor has access to the authenticated dashboard boundary"],
    rules: isPackage
      ? ["The package script is the verification command boundary for this slice"]
      : ["Dashboard behavior must preserve bounded loading empty and failure states from the Context Pack evidence"],
    visibleBehavior: isPackage
      ? ["Terminal displays progress and a final pass or fail result"]
      : ["User or operator can distinguish loading content empty and failure outcomes"],
    edgeCases: isPackage
      ? ["The test runner can find no tests or fail before assertions execute"]
      : ["The dashboard can receive an empty store list or an upstream request failure"],
    recoveryPaths: isPackage
      ? ["Inspect terminal failure output revise files and rerun npm test"]
      : ["Use visible error evidence or API failure evidence to revise the affected spec slice"],
    evidenceRefs: (packRow.evidenceRefs || []).map(ref => ({
      ...ref,
      detail: `${ref.detail} This evidence anchors the ${label} Process / Action Map row.`
    })),
    graphHints: {
      processLabel: `${label} process`,
      actorNodes: [actor],
      toolNodes: isPackage ? ["npm test"] : ["dashboard route", "Context Pack evidence"],
      evidenceNodes: [packRow.packId],
      metricNodes: [],
      gapNodes: []
    },
    specTargets: {
      jobSpecId: `fixture.${label.replace(/[^a-z0-9]+/g, "-")}.job`,
      technicalSpecId: `fixture.${label.replace(/[^a-z0-9]+/g, "-")}.technical`,
      evalSpecId: `fixture.${label.replace(/[^a-z0-9]+/g, "-")}.eval`,
      sections: ["process", "states", "rules", "recovery", "evidence"]
    },
    status: "ready-for-specs",
    confidence: "high"
  };
}

function preparePassingProcessActionMapHandoff(repoRoot, runId, runLog = null) {
  const contextReport = preparePassingContextPackHandoff(repoRoot, runId, runLog);
  runNode(processInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", contextReport, ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
  const packById = new Map(readJsonl(contextPackPathFor(repoRoot, runId)).rows.map(row => [row.packId, row]));
  while (true) {
    const current = JSON.parse(runNode(processFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot)).target;
    if (!current) break;
    const pack = packById.get(current.upstreamPackId);
    runNode(processFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--pack-id", pack.packId,
      "--processes-json", JSON.stringify(processSpecForPack(pack)),
      ...(runLog ? ["--run-log", runLog] : [])
    ], repoRoot);
    runNode(processCheckScript, ["--repo", repoRoot, "--run-id", runId, "--phase", "batch", ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
    runNode(processEvalScript, ["--repo", repoRoot, "--run-id", runId, "--pack-id", pack.packId, ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
  }
  runNode(processCheckScript, ["--repo", repoRoot, "--run-id", runId, ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
  runNode(processEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", ...(runLog ? ["--run-log", runLog] : [])], repoRoot);
  const report = JSON.parse(runNode(processReportScript, ["--repo", repoRoot, "--run-id", runId, ...(runLog ? ["--run-log", runLog] : [])], repoRoot));
  assert.equal(report.state.nextLayer, "Author Specs");
  return report.reportPath;
}

function specSlug(row) {
  return `${row.upstreamSliceId}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function writeTargetSpecs(repoRoot, processRow, { weak = false, compressed = false } = {}) {
  const repoName = path.basename(repoRoot);
  const slug = specSlug(processRow);
  const jobSpecId = `fixture.${slug}.job`;
  const technicalSpecId = `fixture.${slug}.technical`;
  const jobPath = path.join("docs", "specs", `${slug}.job.html`);
  const technicalPath = path.join("docs", "specs", `${slug}.technical.html`);
  fs.mkdirSync(path.join(repoRoot, "docs", "specs"), { recursive: true });
  const commonRelated = JSON.stringify([{ id: technicalSpecId, relationship: "sibling" }]);
  const evidenceDetails = processRow.evidenceRefs.map(ref => [ref.path, ref.detail, ref.questionAnswered].filter(Boolean).join(" ")).join(" ");
  const explicitGaps = [...(processRow.explicitGaps || []), ...(processRow.blockingGaps || [])];
  const humanDecisions = processRow.humanDecisions || [];
  const uncertaintyText = explicitGaps.length || humanDecisions.length
    ? `Explicit gaps and human decisions: ${[...explicitGaps, ...humanDecisions].join("; ")}.`
    : "Remaining uncertainty: no explicit upstream gaps or human decisions are named for this row.";
  const jobText = weak
    ? `Actor ${processRow.actor}. Outcome ${processRow.intendedOutcome}. Evidence ${processRow.processMapId}.`
    : compressed
      ? `Actor: ${processRow.actor}. Intended outcome: ${processRow.intendedOutcome}. Domain object: ${processRow.domainObject}. Actions: family-specific workflow actions stay preserved. States: relevant states and transitions stay represented. Rules: route-family rules remain in force. Edge cases: target-specific edge cases are documented. Recovery: recovery remains bounded. Evidence: current behavior is preserved from the upstream row. Visible behavior and rendered UX boundary: operator behavior stays nonvisual or visible as applicable. Upstream process ${processRow.processMapId} and slice ${processRow.upstreamSliceId}.`
    : `Actor: ${processRow.actor}. Role: ${processRow.role}. Trigger: ${processRow.trigger}. Intended outcome: ${processRow.intendedOutcome}. Domain object: ${processRow.domainObject}. Actions: ${processRow.actions.join("; ")}. States: ${processRow.stateModel.states.join("; ")}. State transitions: ${processRow.stateModel.transitions.join("; ")}. Permissions: ${processRow.permissions.join("; ")}. Rules: ${processRow.rules.join("; ")}. Edge cases: ${processRow.edgeCases.join("; ")}. Recovery: ${processRow.recoveryPaths.join("; ")}. Evidence: ${evidenceDetails}. Capability evidence: ${(processRow.upstreamCapabilityIds || []).join("; ")}. Visible behavior and rendered UX boundary: ${processRow.visibleBehavior.join("; ")}. ${uncertaintyText} Upstream process ${processRow.processMapId} and slice ${processRow.upstreamSliceId}.`;
  const technicalText = weak
    ? `Required contract: ${processRow.trigger}. Current evidence: ${processRow.processMapId}.`
    : compressed
      ? `Required contract: preserve family-specific responses and persistence. Current evidence: upstream process ${processRow.processMapId}. Architecture constraint: the current behavior remains observable through named route surfaces. Implementation latitude: internals can change. Failure behavior and recovery stay bounded. Observability records pass or fail evidence. Verification targets include generic spec checks for this target. Data model and API route contracts remain mapped.`
    : `Required contract: preserve trigger ${processRow.trigger}, actor ${processRow.actor}, role ${processRow.role}, outcome ${processRow.intendedOutcome}, domain object ${processRow.domainObject}, actions ${processRow.actions.join("; ")}, state transitions ${processRow.stateModel.transitions.join("; ")}, permissions ${processRow.permissions.join("; ")}, rules ${processRow.rules.join("; ")}, and observable command or route result. Current evidence: ${evidenceDetails}. Capability evidence: ${(processRow.upstreamCapabilityIds || []).join("; ")}. Architecture constraint: the current contract surface remains observable through the named command, route, screen, service, event, queue, schema, or data model. Implementation latitude: framework modules and internal storage can change when the contract remains intact. Data model and API contract surfaces stay mapped to the evidence. Failure behavior and recovery preserve edge cases ${processRow.edgeCases.join("; ")} and recovery paths ${processRow.recoveryPaths.join("; ")}. Observability records pass or fail evidence. Verification targets prove ${processRow.trigger}, ${processRow.actions.join("; ")}, and ${evidenceDetails} through the package command, screen route, API route, or schema evidence. ${uncertaintyText} Upstream process ${processRow.processMapId} and slice ${processRow.upstreamSliceId}.`;
  const jobHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="spec:id" content="${jobSpecId}">
<meta name="spec:type" content="job">
<meta name="spec:status" content="draft">
<meta name="spec:last-updated" content="2026-06-03">
<title>${slug} job</title>
<script type="application/json" id="spec-metadata">
{
  "id": "${jobSpecId}",
  "title": "${slug} job",
  "type": "job",
  "status": "draft",
  "lastUpdated": "2026-06-03",
  "reviewCadence": "per-change",
  "confidence": "high",
  "parent": null,
  "children": [],
  "relatedSpecs": ${commonRelated},
  "ownedPaths": [{ "path": "${repoName}/${jobPath}", "kind": "doc", "ownership": "direct" }],
  "implementationPaths": [],
  "coverage": [],
  "tags": ["backfill", "author-specs"]
}
</script>
<script type="application/json" id="graph-metadata">
{
  "schema": "foundation.visible-business-graph.v1",
  "ownerSpecId": "${jobSpecId}",
  "nodes": [{ "id": "spec:${jobSpecId}", "type": "job", "label": "${slug} job", "source": { "specId": "${jobSpecId}", "sectionId": "job-intent" }, "status": "draft", "confidence": "high" }],
  "edges": []
}
</script>
</head>
<body><main><section id="job-intent" data-spec-section="job-intent" data-spec-canonical="true"><h1>${slug} job</h1><p>${jobText}</p></section></main></body></html>`;
  const technicalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="spec:id" content="${technicalSpecId}">
<meta name="spec:type" content="technical">
<meta name="spec:status" content="draft">
<meta name="spec:last-updated" content="2026-06-03">
<title>${slug} technical</title>
<script type="application/json" id="spec-metadata">
{
  "id": "${technicalSpecId}",
  "title": "${slug} technical",
  "type": "technical",
  "status": "draft",
  "lastUpdated": "2026-06-03",
  "reviewCadence": "per-change",
  "confidence": "high",
  "parent": "${jobSpecId}",
  "children": [],
  "relatedSpecs": [{ "id": "${jobSpecId}", "relationship": "sibling" }],
  "ownedPaths": [{ "path": "${repoName}/${technicalPath}", "kind": "doc", "ownership": "direct" }],
  "implementationPaths": [],
  "coverage": [],
  "tags": ["backfill", "author-specs"]
}
</script>
<script type="application/json" id="graph-metadata">
{
  "schema": "foundation.visible-business-graph.v1",
  "ownerSpecId": "${technicalSpecId}",
  "nodes": [{ "id": "spec:${technicalSpecId}", "type": "technical-contract", "label": "${slug} technical", "source": { "specId": "${technicalSpecId}", "sectionId": "required-depth" }, "status": "draft", "confidence": "high" }],
  "edges": []
}
</script>
</head>
<body><main><section id="required-depth" data-spec-section="required-depth" data-spec-canonical="true"><h1>${slug} technical</h1><p>${technicalText}</p></section></main></body></html>`;
  fs.writeFileSync(path.join(repoRoot, jobPath), jobHtml, "utf8");
  fs.writeFileSync(path.join(repoRoot, technicalPath), technicalHtml, "utf8");
  return { jobPath, technicalPath, jobSpecId, technicalSpecId };
}

function hasFailure(results, id) {
  return results.some(result => result.id === id && result.status === "fail");
}

test("init requires current Process / Action Map handoff and creates one pending author row per active process", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-11";
  const processReport = preparePassingProcessActionMapHandoff(repoRoot, runId);
  const output = runNode(authorInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", processReport], repoRoot);
  assert.match(output, /author-specs-skeleton/);
  const rows = readJsonl(authorSpecsPathFor(repoRoot, runId)).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows.every(row => row.status === "pending"), true);
  assert.equal(rows.every(row => row.upstreamProcessRef?.processRowFingerprint?.startsWith("sha256:")), true);

  const receiptPath = processActionMapEvalReceiptPathFor(repoRoot, runId);
  const receipts = readProcessJsonl(receiptPath).rows;
  receipts[0] = {
    ...receipts[0],
    revisionTargets: ["pam-fixture"],
    findings: [{ category: "authorSpecsReadiness", severity: "warning", message: "Fixture revision required.", subjectRowId: "pam-fixture" }],
    acceptabilityGate: { acceptable: false, outstanding: false }
  };
  writeProcessJsonl(receiptPath, receipts);
  const failure = runNodeFailure(authorInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(failure, /Outstanding current Process \/ Action Map eval receipt is required/);
});

test("one-target fill loop rejects shortcuts and handoff reaches Evaluate Job Slices", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-12";
  const runLog = path.join("docs", "specs", "backfill", `run-log-${runId}.jsonl`);
  const processReport = preparePassingProcessActionMapHandoff(repoRoot, runId, runLog);
  runNode(authorInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", processReport, "--run-log", runLog], repoRoot);
  const before = readJsonl(authorSpecsPathFor(repoRoot, runId)).rows;
  const nextOutput = runNode(authorFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot);
  const nextPayload = JSON.parse(nextOutput);
  assert.equal(nextPayload.schema, "foundation.backfill.author-specs-next-target.v1");
  assert.equal(typeof nextPayload.target.authorSpecId, "string");
  assert.deepEqual(readJsonl(authorSpecsPathFor(repoRoot, runId)).rows, before);

  assert.throws(
    () => runNode(authorFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /exactly one Process \/ Action Map row at a time/);
      return true;
    }
  );
  assert.throws(
    () => runNode(authorFillScript, ["--repo", repoRoot, "--run-id", runId, "--process-map-id", before[0].upstreamProcessMapId, "--author-file", "generated.json"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /does not accept generated author\/spec payload/);
      return true;
    }
  );

  const processRows = readJsonl(processActionMapPathFor(repoRoot, runId)).rows;
  const firstProcess = processRows.find(row => row.processMapId === nextPayload.target.upstreamProcessMapId);
  const outOfOrderProcess = processRows.find(row => row.processMapId !== firstProcess.processMapId);
  const firstSpecs = writeTargetSpecs(repoRoot, firstProcess);
  const outOfOrderSpecs = writeTargetSpecs(repoRoot, outOfOrderProcess);
  assert.throws(
    () => runNode(authorFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--process-map-id", `${firstProcess.processMapId},${outOfOrderProcess.processMapId}`,
      "--job-spec", firstSpecs.jobPath,
      "--technical-spec", firstSpecs.technicalPath
    ], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /requires exactly one --process-map-id/);
      return true;
    }
  );
  assert.throws(
    () => runNode(authorFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--process-map-id", outOfOrderProcess.processMapId,
      "--job-spec", outOfOrderSpecs.jobPath,
      "--technical-spec", outOfOrderSpecs.technicalPath
    ], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /must use the current --next target/);
      return true;
    }
  );

  runNode(authorFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--process-map-id", firstProcess.processMapId,
    "--job-spec", firstSpecs.jobPath,
    "--technical-spec", firstSpecs.technicalPath,
    "--run-log", runLog
  ], repoRoot);
  assert.throws(
    () => runNode(authorEvalScript, ["--repo", repoRoot, "--run-id", runId, "--process-map-id", firstProcess.processMapId, "--run-log", runLog], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /requires a current passing Author Specs check/);
      return true;
    }
  );
  assert.throws(
    () => runNode(authorFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--process-map-id", outOfOrderProcess.processMapId,
      "--job-spec", outOfOrderSpecs.jobPath,
      "--technical-spec", outOfOrderSpecs.technicalPath,
      "--run-log", runLog
    ], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /must use the current --next target/);
      return true;
    }
  );
  runNode(authorCheckScript, ["--repo", repoRoot, "--run-id", runId, "--phase", "batch", "--run-log", runLog], repoRoot);
  const firstEval = runNode(authorEvalScript, ["--repo", repoRoot, "--run-id", runId, "--process-map-id", firstProcess.processMapId, "--run-log", runLog], repoRoot);
  assert.match(firstEval, /Selected row outstanding: yes/);
  const rowEvalRunLog = readJsonl(path.join(repoRoot, runLog)).rows;
  const latestEvalEvent = [...rowEvalRunLog].reverse().find(event => event.phase === "evaluation" && event.summary?.includes("Author Specs row eval"));
  assert.match(latestEvalEvent.nextAction, /Select the next Author Specs target with --next/);
  assert.doesNotMatch(latestEvalEvent.nextAction, /Record handoff/);

  while (true) {
    const current = JSON.parse(runNode(authorFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot)).target;
    if (!current) break;
    const processRow = processRows.find(row => row.processMapId === current.upstreamProcessMapId);
    const specs = writeTargetSpecs(repoRoot, processRow);
    runNode(authorFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--process-map-id", processRow.processMapId,
      "--job-spec", specs.jobPath,
      "--technical-spec", specs.technicalPath,
      "--run-log", runLog
    ], repoRoot);
    runNode(authorCheckScript, ["--repo", repoRoot, "--run-id", runId, "--phase", "batch", "--run-log", runLog], repoRoot);
    const rowEval = runNode(authorEvalScript, ["--repo", repoRoot, "--run-id", runId, "--process-map-id", processRow.processMapId, "--run-log", runLog], repoRoot);
    assert.match(rowEval, /Selected row outstanding: yes/);
  }

  const checkOutput = runNode(authorCheckScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  assert.match(checkOutput, /Summary: .* 0 fail/);
  const check = readJson(authorSpecsCheckPathFor(repoRoot, runId));
  assert.equal(check.schema, "foundation.backfill.author-specs-check.v1");
  assert.equal(check.summary.fail, 0);

  const evalOutput = runNode(authorEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", "--run-log", runLog], repoRoot);
  assert.match(evalOutput, /Outstanding: yes/);
  assert.match(evalOutput, /Revision targets: 0/);
  const receipts = readJsonl(authorSpecsEvalReceiptPathFor(repoRoot, runId)).rows;
  assert.equal(receipts[0].receiptType, "summary");
  assert.equal(receipts[0].authorRowCount, 2);
  assert.equal(receipts[0].acceptabilityGate.outstanding, true);
  assert.equal(receipts.filter(receipt => receipt.receiptType === "row").every(receipt => receipt.acceptabilityGate.outstanding), true);
  assert.equal(fs.existsSync(authorSpecsSummaryPathFor(repoRoot, runId)), true);

  const report = JSON.parse(runNode(authorReportScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot));
  assert.equal(report.state.checkerResult, "pass");
  assert.equal(report.state.evalResult, "pass");
  assert.equal(report.state.rowOutstandingMissingCount, 0);
  assert.equal(report.state.nextLayer, "Evaluate Job Slices");

  const checkWithReport = runNode(authorCheckScript, ["--repo", repoRoot, "--run-id", runId, "--report", report.reportPath], repoRoot);
  assert.match(checkWithReport, /author-specs-report-state-current/);
  const reportFile = path.join(repoRoot, report.reportPath);
  const drifted = fs.readFileSync(reportFile, "utf8").replace(`"readyForSliceEvalCount": 2`, `"readyForSliceEvalCount": 99`);
  fs.writeFileSync(reportFile, drifted, "utf8");
  const drift = validateAuthorSpecs({ repoRoot, runId, reportPath: reportFile }).results;
  assert.equal(hasFailure(drift, "author-specs-report-state-current"), true);
});

test("handoff and scoring reject under-reviewed Author Specs rows", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-13";
  const processReport = preparePassingProcessActionMapHandoff(repoRoot, runId);
  runNode(authorInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", processReport], repoRoot);
  const next = JSON.parse(runNode(authorFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot)).target;
  const processRow = readJsonl(processActionMapPathFor(repoRoot, runId)).rows.find(row => row.processMapId === next.upstreamProcessMapId);
  const weakSpecs = writeTargetSpecs(repoRoot, processRow, { weak: true });
  runNode(authorFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--process-map-id", processRow.processMapId,
    "--job-spec", weakSpecs.jobPath,
    "--technical-spec", weakSpecs.technicalPath
  ], repoRoot);
  const checkFailure = runNodeFailure(authorCheckScript, ["--repo", repoRoot, "--run-id", runId, "--phase", "batch"], repoRoot);
  assert.match(checkFailure, /required-language/);

  const rows = readJsonl(authorSpecsPathFor(repoRoot, runId)).rows;
  const receipt = scoreAuthorSpecRow(rows.find(row => row.upstreamProcessMapId === processRow.processMapId), new Map([[processRow.processMapId, processRow]]), repoRoot);
  assert.equal(receipt.acceptabilityGate.outstanding, false);
  assert.equal(receipt.findings.some(finding => finding.severity === "blocking"), true);

  const report = JSON.parse(runNode(authorReportScript, ["--repo", repoRoot, "--run-id", runId], repoRoot));
  assert.notEqual(report.state.nextLayer, "Evaluate Job Slices");
  assert.equal(report.state.rowOutstandingMissingCount > 0, true);
});

test("checker rejects parent capability refs carried into Author Specs work", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-16";
  const processReport = preparePassingProcessActionMapHandoff(repoRoot, runId);
  runNode(authorInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", processReport], repoRoot);
  const authorPath = authorSpecsPathFor(repoRoot, runId);
  const rows = readJsonl(authorPath).rows;
  writeJsonl(authorPath, rows.map((row, index) => index === 0
    ? {
        ...row,
        capabilityRefs: [{
          capabilityId: "cap-parent-dashboard",
          name: "Dashboard parent",
          capabilityTitle: "Operators can understand dashboard health across the workspace",
          capabilityAltitude: "parent",
          queueEligible: false
        }]
      }
    : row));
  const results = validateAuthorSpecs({ repoRoot, runId }).results;
  assert.equal(results.some(result => result.status === "fail" && result.id.endsWith(":capability-ref-queue-eligible")), true);
});

test("row scorer rejects generic compression of Process / Action Map specifics", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-15";
  const processReport = preparePassingProcessActionMapHandoff(repoRoot, runId);
  runNode(authorInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", processReport], repoRoot);
  const next = JSON.parse(runNode(authorFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot)).target;
  const processRow = readJsonl(processActionMapPathFor(repoRoot, runId)).rows.find(row => row.processMapId === next.upstreamProcessMapId);
  const compressedSpecs = writeTargetSpecs(repoRoot, processRow, { compressed: true });
  runNode(authorFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--process-map-id", processRow.processMapId,
    "--job-spec", compressedSpecs.jobPath,
    "--technical-spec", compressedSpecs.technicalPath
  ], repoRoot);
  const checkOutput = runNode(authorCheckScript, ["--repo", repoRoot, "--run-id", runId, "--phase", "batch"], repoRoot);
  assert.match(checkOutput, /Summary: .* 0 fail/);

  const rows = readJsonl(authorSpecsPathFor(repoRoot, runId)).rows;
  const receipt = scoreAuthorSpecRow(rows.find(row => row.upstreamProcessMapId === processRow.processMapId), new Map([[processRow.processMapId, processRow]]), repoRoot);
  assert.equal(receipt.acceptabilityGate.outstanding, false);
  assert.equal(receipt.score < 100, true);
  assert.equal(receipt.findings.some(finding => /compress specific upstream row details|omit material/.test(finding.message)), true);
  assert.equal(receipt.findings.some(finding => /verification that would prove this specific Process \/ Action Map row/.test(finding.message)), true);

  const evalFailure = runNodeFailure(authorEvalScript, ["--repo", repoRoot, "--run-id", runId, "--process-map-id", processRow.processMapId]);
  assert.match(evalFailure, /Selected row outstanding: no/);
});

test("refresh resets stale Process / Action Map references", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-16";
  const processReport = preparePassingProcessActionMapHandoff(repoRoot, runId);
  runNode(authorInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", processReport], repoRoot);
  const processPath = processActionMapPathFor(repoRoot, runId);
  const processes = readJsonl(processPath).rows;
  writeProcessJsonl(processPath, processes.map((row, index) => index === 0
    ? { ...row, intendedOutcome: `${row.intendedOutcome} Revised upstream intent for Author Specs refresh coverage.` }
    : row));
  const stale = validateAuthorSpecs({ repoRoot, runId }).results;
  assert.equal(hasFailure(stale, "author-specs-upstream-fresh"), true);
  const refresh = JSON.parse(runNode(authorRefreshScript, ["--repo", repoRoot, "--run-id", runId], repoRoot));
  assert.equal(refresh.changedCount > 0, true);
  const refreshedRows = readJsonl(authorSpecsPathFor(repoRoot, runId)).rows;
  assert.equal(refreshedRows.some(row => row.status === "pending"), true);
});
