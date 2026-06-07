import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { registryPathFor } from "./artifact-inventory-core.mjs";
import { surfaceFunctionMapPathFor } from "./surface-function-map-core.mjs";
import {
  capabilityMapPathFor
} from "./capability-map-core.mjs";
import {
  specJobQueuePathFor
} from "./spec-job-queue-core.mjs";
import {
  contextPackPathFor
} from "./context-pack-core.mjs";
import {
  processActionMapCheckPathFor,
  processActionMapEvalReceiptPathFor,
  processActionMapPathFor,
  processActionMapSummaryPathFor,
  readJson,
  readJsonl,
  scoreProcessActionMapRow,
  validateProcessActionMap,
  writeJsonl
} from "./process-action-map-core.mjs";

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
const processRefreshScript = path.join(scriptsDir, "process-action-map-refresh.mjs");
const processReportScript = path.join(scriptsDir, "process-action-map-report.mjs");

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-process-action-map-"));
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
  fs.writeFileSync(path.join(repoRoot, "README.md"), "# Process / Action Map fixture\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, ".gitignore"), "node_modules\n", "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  return repoRoot;
}

function runNode(script, args, cwd) {
  return execFileSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", maxBuffer: 30 * 1024 * 1024 });
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
  runNode(fileFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot);
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

function preparePassingSpecJobQueueHandoff(repoRoot, runId) {
  prepareCapabilityMap(repoRoot, runId);
  runNode(splitInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const capabilityRows = readJsonl(capabilityMapPathFor(repoRoot, runId)).rows;
  const packageId = capabilityRows.find(row => row.name.toLowerCase().includes("project test suite"))?.capabilityId;
  const dashboardId = capabilityRows.find(row => row.name.toLowerCase().includes("dashboard"))?.capabilityId;
  runNode(splitFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--capability-ids", packageId,
    "--slices-json", JSON.stringify(readyPackageSlice(packageId))
  ], repoRoot);
  runNode(splitFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--capability-ids", dashboardId,
    "--slices-json", JSON.stringify(dashboardSlices(dashboardId))
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
      excludedRefs: [{ path: "web/app/dashboard/page.tsx", reason: "Dashboard screen rendering belongs to a separate queued slice." }],
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
  for (const slice of readJsonl(specJobQueuePathFor(repoRoot, runId)).rows) {
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
    evidenceRefs: (packRow.evidenceRefs || []).slice(0, 2).map(ref => ({
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
      jobSpecId: `target.${label.replace(/[^a-z0-9]+/g, "-")}.job`,
      technicalSpecId: `target.${label.replace(/[^a-z0-9]+/g, "-")}.technical`,
      evalSpecId: `target.${label.replace(/[^a-z0-9]+/g, "-")}.eval`,
      sections: ["process", "states", "rules", "recovery", "evidence"]
    },
    status: "ready-for-specs",
    confidence: "high"
  };
}

function hasFailure(results, id) {
  return results.some(result => result.id === id && result.status === "fail");
}

test("init requires current Context Pack handoff and creates one pending process row per active pack", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-01";
  const reportPath = preparePassingContextPackHandoff(repoRoot, runId);
  const output = runNode(processInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", reportPath], repoRoot);
  assert.match(output, /process-action-map-skeleton/);
  const rows = readJsonl(processActionMapPathFor(repoRoot, runId)).rows;
  assert.equal(rows.length, 3);
  assert.equal(rows.every(row => row.status === "pending"), true);
  assert.equal(rows.every(row => row.upstreamPackRef?.packRowFingerprint?.startsWith("sha256:")), true);

  const receiptPath = path.join(repoRoot, "docs", "specs", "backfill", `context-pack-eval-${runId}.jsonl`);
  const receipts = readJsonl(receiptPath).rows;
  receipts[0] = {
    ...receipts[0],
    revisionTargets: ["ep-fixture"],
    findings: [{ category: "processActionReadiness", severity: "warning", message: "Fixture revision required.", subjectRowId: "ep-fixture" }]
  };
  writeJsonl(receiptPath, receipts);
  assert.throws(
    () => runNode(processInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot),
    error => {
      assert.match(`${error.stdout || ""}${error.stderr || ""}${error.message}`, /revision targets must be resolved/);
      return true;
    }
  );
});

test("fill loop rejects coarse shortcuts and handoff reaches Author Specs after check eval report", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-02";
  const runLog = path.join("docs", "specs", "backfill", `run-log-${runId}.jsonl`);
  const contextReportPath = preparePassingContextPackHandoff(repoRoot, runId, runLog);
  runNode(processInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", contextReportPath, "--run-log", runLog], repoRoot);
  const before = readJsonl(processActionMapPathFor(repoRoot, runId)).rows;
  const nextOutput = runNode(processFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot);
  const nextPayload = JSON.parse(nextOutput);
  assert.equal(nextPayload.schema, "foundation.backfill.process-action-map-next-target.v1");
  assert.equal(typeof nextPayload.target.processMapId, "string");
  assert.deepEqual(readJsonl(processActionMapPathFor(repoRoot, runId)).rows, before);

  assert.throws(
    () => runNode(processFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /exactly one Context Pack row at a time/);
      return true;
    }
  );
  assert.throws(
    () => runNode(processFillScript, ["--repo", repoRoot, "--run-id", runId, "--pack-ids", before[0].upstreamPackId, "--processes-file", "generated.json"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /does not accept --processes-file/);
      return true;
    }
  );

  const packRows = readJsonl(contextPackPathFor(repoRoot, runId)).rows;
  const packById = new Map(packRows.map(row => [row.packId, row]));
  assert.throws(
    () => runNode(processFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--pack-id", `${packRows[0].packId},${packRows[1].packId}`,
      "--processes-json", JSON.stringify(processSpecForPack(packRows[0]))
    ], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /requires exactly one --pack-id or exactly one --slice-id/);
      return true;
    }
  );
  assert.throws(
    () => runNode(processFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--pack-id", packRows[0].packId,
      "--processes-json", JSON.stringify([processSpecForPack(packRows[0]), processSpecForPack(packRows[0])])
    ], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /requires exactly one process spec/);
      return true;
    }
  );

  const firstPack = packById.get(nextPayload.target.upstreamPackId);
  const outOfOrderPack = packRows.find(row => row.packId !== firstPack.packId);
  assert.throws(
    () => runNode(processFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--pack-id", outOfOrderPack.packId,
      "--processes-json", JSON.stringify(processSpecForPack(outOfOrderPack))
    ], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /must use the current --next target/);
      return true;
    }
  );

  runNode(processFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--pack-id", firstPack.packId,
    "--processes-json", JSON.stringify(processSpecForPack(firstPack)),
    "--run-log", runLog
  ], repoRoot);
  assert.throws(
    () => runNode(processEvalScript, ["--repo", repoRoot, "--run-id", runId, "--pack-id", firstPack.packId, "--run-log", runLog], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /requires a current passing Process \/ Action Map check/);
      return true;
    }
  );
  assert.throws(
    () => runNode(processFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--pack-id", outOfOrderPack.packId,
      "--processes-json", JSON.stringify(processSpecForPack(outOfOrderPack)),
      "--run-log", runLog
    ], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /must use the current --next target/);
      return true;
    }
  );
  runNode(processCheckScript, ["--repo", repoRoot, "--run-id", runId, "--phase", "batch", "--run-log", runLog], repoRoot);
  const firstEval = runNode(processEvalScript, ["--repo", repoRoot, "--run-id", runId, "--pack-id", firstPack.packId, "--run-log", runLog], repoRoot);
  assert.match(firstEval, /Selected row outstanding: yes/);

  while (true) {
    const current = JSON.parse(runNode(processFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot)).target;
    if (!current) break;
    const packRow = packById.get(current.upstreamPackId);
    runNode(processFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--pack-id", packRow.packId,
      "--processes-json", JSON.stringify(processSpecForPack(packRow)),
      "--run-log", runLog
    ], repoRoot);
    runNode(processCheckScript, ["--repo", repoRoot, "--run-id", runId, "--phase", "batch", "--run-log", runLog], repoRoot);
    const rowEval = runNode(processEvalScript, ["--repo", repoRoot, "--run-id", runId, "--pack-id", packRow.packId, "--run-log", runLog], repoRoot);
    assert.match(rowEval, /Selected row outstanding: yes/);
  }
  const checkOutput = runNode(processCheckScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  assert.match(checkOutput, /Summary: .* 0 fail/);
  const check = readJson(processActionMapCheckPathFor(repoRoot, runId));
  assert.equal(check.schema, "foundation.backfill.process-action-map-check.v1");
  assert.equal(check.summary.fail, 0);

  const evalOutput = runNode(processEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", "--run-log", runLog], repoRoot);
  assert.match(evalOutput, /Outstanding: yes/);
  assert.match(evalOutput, /Revision targets: 0/);
  const receipts = readJsonl(processActionMapEvalReceiptPathFor(repoRoot, runId)).rows;
  assert.equal(receipts[0].receiptType, "summary");
  assert.equal(receipts[0].processRowCount, 3);
  assert.equal(receipts[0].acceptabilityGate.outstanding, true);
  assert.equal(receipts.filter(receipt => receipt.receiptType === "row").every(receipt => receipt.acceptabilityGate.outstanding), true);
  assert.equal(fs.existsSync(processActionMapSummaryPathFor(repoRoot, runId)), true);

  const report = JSON.parse(runNode(processReportScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot));
  assert.equal(report.state.checkerResult, "pass");
  assert.equal(report.state.evalResult, "pass");
  assert.equal(report.state.rowOutstandingMissingCount, 0);
  assert.equal(report.state.nextLayer, "Author Specs");

  const checkWithReport = runNode(processCheckScript, ["--repo", repoRoot, "--run-id", runId, "--report", report.reportPath], repoRoot);
  assert.match(checkWithReport, /process-action-map-report-state-current/);
  const reportFile = path.join(repoRoot, report.reportPath);
  const drifted = fs.readFileSync(reportFile, "utf8").replace(`"readyForSpecsCount": 3`, `"readyForSpecsCount": 99`);
  fs.writeFileSync(reportFile, drifted, "utf8");
  const drift = validateProcessActionMap({ repoRoot, runId, reportPath: reportFile }).results;
  assert.equal(hasFailure(drift, "process-action-map-report-state-current"), true);
});

test("report command bootstraps current report-state check artifact", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-05";
  const contextReportPath = preparePassingContextPackHandoff(repoRoot, runId);
  runNode(processInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", contextReportPath], repoRoot);
  const checkPath = processActionMapCheckPathFor(repoRoot, runId);
  assert.equal(fs.existsSync(checkPath), false);

  const report = JSON.parse(runNode(processReportScript, ["--repo", repoRoot, "--run-id", runId], repoRoot));
  assert.equal(fs.existsSync(checkPath), true);
  const check = readJson(checkPath);
  assert.equal(check.reportPath, report.reportPath);
  assert.equal(check.results.some(result => result.id === "process-action-map-report-state-current" && result.status === "pass"), true);
  assert.equal(check.summary.fail > 0, true);
});

test("checker rejects parent capability refs carried into Process / Action Map work", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-06";
  const contextReportPath = preparePassingContextPackHandoff(repoRoot, runId);
  runNode(processInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", contextReportPath], repoRoot);
  const processPath = processActionMapPathFor(repoRoot, runId);
  const rows = readJsonl(processPath).rows;
  writeJsonl(processPath, rows.map((row, index) => index === 0
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
  const results = validateProcessActionMap({ repoRoot, runId }).results;
  assert.equal(results.some(result => result.status === "fail" && result.id.endsWith(":capability-ref-queue-eligible")), true);
});

test("init names Context Pack report refresh command when report state is stale", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-06";
  const contextReportPath = preparePassingContextPackHandoff(repoRoot, runId);
  const reportFile = path.join(repoRoot, contextReportPath);
  fs.writeFileSync(reportFile, fs.readFileSync(reportFile, "utf8").replace(`"nextLayer": "Process / Action Map"`, `"nextLayer": "Context Pack revision"`), "utf8");

  const failure = runNodeFailure(processInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", contextReportPath], repoRoot);
  assert.match(failure, /upstream-context-pack-report-refresh-required/);
  assert.match(failure, /foundation:context-pack:report/);
});

test("eval flags weak process coverage and refresh resets stale Context Pack rows", () => {
  const packRow = {
    packId: "ep-dashboard",
    status: "ready-for-process-map",
    upstreamSliceId: "slice-dashboard",
    upstreamCapabilityIds: ["cap-dashboard"]
  };
  const weakRow = {
    processMapId: "pam-weak",
    upstreamPackId: "ep-dashboard",
    upstreamPackRef: { packRowFingerprint: "sha256:stale" },
    upstreamSliceId: "slice-dashboard",
    upstreamCapabilityIds: ["cap-dashboard"],
    actor: "",
    trigger: "",
    intendedOutcome: "",
    domainObject: "",
    actions: [],
    stateModel: { states: [], transitions: [], emptyStates: [], loadingStates: [], errorStates: [] },
    permissions: [],
    rules: [],
    visibleBehavior: [],
    edgeCases: [],
    recoveryPaths: [],
    evidenceRefs: [],
    graphHints: {},
    specTargets: {},
    explicitGaps: [],
    blockingQuestions: [],
    blockingGaps: [],
    humanDecisions: [],
    reviewFlags: [],
    status: "ready-for-specs",
    confidence: "medium"
  };
  const receipt = scoreProcessActionMapRow(weakRow, new Map([["ep-dashboard", packRow]]));
  assert.equal(receipt.findings.some(finding => finding.category === "processSpecificity" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "stateRuleCompleteness" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "recoveryEdgeCoverage" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "upstreamTraceability" && finding.severity === "blocking"), true);
  assert.equal(receipt.findings.some(finding => finding.category === "processSpecificity" && finding.severity === "warning" && /visible\/operator/.test(finding.message)), true);
  assert.equal(receipt.acceptabilityGate.outstanding, false);

  const repoRoot = makeRepo();
  const runId = "20260603-03";
  const contextReportPath = preparePassingContextPackHandoff(repoRoot, runId);
  runNode(processInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", contextReportPath], repoRoot);
  const packById = new Map(readJsonl(contextPackPathFor(repoRoot, runId)).rows.map(row => [row.packId, row]));
  while (true) {
    const current = JSON.parse(runNode(processFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot)).target;
    if (!current) break;
    const pack = packById.get(current.upstreamPackId);
    runNode(processFillScript, [
      "--repo", repoRoot,
      "--run-id", runId,
      "--pack-id", pack.packId,
      "--processes-json", JSON.stringify(processSpecForPack(pack))
    ], repoRoot);
    runNode(processCheckScript, ["--repo", repoRoot, "--run-id", runId, "--phase", "batch"], repoRoot);
    runNode(processEvalScript, ["--repo", repoRoot, "--run-id", runId, "--pack-id", pack.packId], repoRoot);
  }
  runNode(processCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(processEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);

  const packPath = contextPackPathFor(repoRoot, runId);
  const packs = readJsonl(packPath).rows;
  writeJsonl(packPath, packs.map((row, index) => index === 0
    ? { ...row, sufficiencyRationale: `${row.sufficiencyRationale} Revised upstream evidence boundary for Process / Action Map refresh coverage.` }
    : row));
  const stale = validateProcessActionMap({ repoRoot, runId }).results;
  assert.equal(hasFailure(stale, "process-action-map-upstream-fresh"), true);
  const refresh = JSON.parse(runNode(processRefreshScript, ["--repo", repoRoot, "--run-id", runId], repoRoot));
  assert.equal(refresh.changedCount > 0, true);
  const refreshedRows = readJsonl(processActionMapPathFor(repoRoot, runId)).rows;
  assert.equal(refreshedRows.some(row => row.status === "pending"), true);
});

test("report refuses handoff when a row has warnings or unresolved revision targets", () => {
  const repoRoot = makeRepo();
  const runId = "20260603-04";
  const contextReportPath = preparePassingContextPackHandoff(repoRoot, runId);
  runNode(processInitScript, ["--repo", repoRoot, "--run-id", runId, "--report", contextReportPath], repoRoot);
  const next = JSON.parse(runNode(processFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot)).target;
  const pack = readJsonl(contextPackPathFor(repoRoot, runId)).rows.find(row => row.packId === next.upstreamPackId);
  const weakSpec = {
    ...processSpecForPack(pack),
    visibleBehavior: [],
    specTargets: {}
  };
  runNode(processFillScript, [
    "--repo", repoRoot,
    "--run-id", runId,
    "--pack-id", pack.packId,
    "--processes-json", JSON.stringify(weakSpec)
  ], repoRoot);
  runNode(processCheckScript, ["--repo", repoRoot, "--run-id", runId, "--phase", "batch"], repoRoot);
  const evalFailure = runNodeFailure(processEvalScript, ["--repo", repoRoot, "--run-id", runId, "--pack-id", pack.packId], repoRoot);
  assert.match(evalFailure, /Selected row outstanding: no/);
  const receipts = readJsonl(processActionMapEvalReceiptPathFor(repoRoot, runId)).rows;
  assert.equal(receipts[0].revisionTargets.length > 0, true);
  assert.equal(receipts[0].findings.some(finding => finding.severity === "warning"), true);

  const report = JSON.parse(runNode(processReportScript, ["--repo", repoRoot, "--run-id", runId], repoRoot));
  assert.notEqual(report.state.nextLayer, "Author Specs");
  assert.equal(report.state.evalRevisionTargetCount > 0, true);
  assert.equal(report.state.rowOutstandingMissingCount > 0, true);
});
