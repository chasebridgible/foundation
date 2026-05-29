import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  defaultBackfillDir,
  readJson,
  readJsonl,
  scoreSurfaceRow,
  surfaceCheckPathFor,
  surfaceEvalReceiptPathFor,
  surfaceEvalSummaryPathFor,
  surfaceRegistryPathFor,
  surfaceRegistryScopeCounts,
  summarizeResults,
  validateSurfaceRegistry,
  writeJsonl
} from "./surface-registry-core.mjs";

const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
const fileInitScript = path.join(scriptsDir, "file-registry-init.mjs");
const fileFillScript = path.join(scriptsDir, "file-registry-fill.mjs");
const fileCheckScript = path.join(scriptsDir, "file-registry-check.mjs");
const fileEvalScript = path.join(scriptsDir, "file-registry-eval.mjs");
const surfaceInitScript = path.join(scriptsDir, "surface-registry-init.mjs");
const surfaceFillScript = path.join(scriptsDir, "surface-registry-fill.mjs");
const surfaceCheckScript = path.join(scriptsDir, "surface-registry-check.mjs");
const surfaceEvalScript = path.join(scriptsDir, "surface-registry-eval.mjs");
const surfaceRefreshScript = path.join(scriptsDir, "surface-registry-refresh.mjs");
const surfaceReportScript = path.join(scriptsDir, "surface-registry-report.mjs");

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-surface-registry-"));
  execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
  fs.mkdirSync(path.join(repoRoot, "web-app", "app", "(app)", "dashboard"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "web-app", "backend", "src", "routes"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "database", "migrations"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "scripts"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "data_loaders", "sample_files"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "docs", "knowledge", "inventory", "visuals"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "docs", "specs", "backfill"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({
    scripts: { test: "node --test", deploy: "node scripts/deploy.mjs" },
    dependencies: { fastify: "^5.0.0", next: "^15.0.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(repoRoot, "package-lock.json"), JSON.stringify({ name: "surface-registry-test", lockfileVersion: 3 }, null, 2), "utf8");
  fs.writeFileSync(path.join(repoRoot, "web-app", "app", "(app)", "dashboard", "page.tsx"), `
export default function DashboardPage() {
  return <main>Dashboard</main>;
}
`, "utf8");
  fs.writeFileSync(path.join(repoRoot, "web-app", "backend", "src", "routes", "dashboard.ts"), `
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
  fs.writeFileSync(path.join(repoRoot, "scripts", "deploy.mjs"), `
export async function deploy() {
  return "deployed";
}
`, "utf8");
  fs.writeFileSync(path.join(repoRoot, "README.md"), "# Surface registry test repo\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, ".gitignore"), "node_modules\n.env\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, "data_loaders", "sample_files", "sample_report.rtf"), "{\\rtf1 sample fixture report}", "utf8");
  fs.writeFileSync(path.join(repoRoot, "docs", "knowledge", "inventory", "visuals", "sample.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  execFileSync("git", ["add", "."], { cwd: repoRoot });
  return repoRoot;
}

function runNode(script, args, cwd) {
  return execFileSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function prepareFileRegistry(repoRoot, runId = "20260527-01") {
  runNode(fileInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(fileFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot);
  runNode(fileCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(fileEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
}

function supportSpec(filePath, reason = "Full-file review found no exposed or dependent surface for this layer.") {
  return [{
    surfaceKind: "support-classification",
    label: `support file ${filePath}`,
    exposedObject: filePath,
    operation: "supports repository behavior",
    consumerHints: ["developer"],
    supportReason: reason,
    confidence: "high",
    evidence: `Full ${filePath} read supports the support-classification because it exposes no capability-bearing route, screen, API, command, job, table, workflow, infra resource, or direct external dependency.`
  }];
}

function surfaceSpecsForPath(filePath) {
  if (filePath === "package.json") {
    return [
      {
        surfaceKind: "command",
        label: "npm script test",
        exposedObject: "test",
        operation: "runs node test suite",
        consumerHints: ["developer", "automation"],
        actorHints: ["developer", "automation"],
        confidence: "high",
        evidence: "Full package.json read shows scripts.test is node --test."
      },
      {
        surfaceKind: "command",
        label: "npm script deploy",
        exposedObject: "deploy",
        operation: "runs deployment script",
        consumerHints: ["developer", "operator", "automation"],
        actorHints: ["developer", "operator"],
        confidence: "high",
        evidence: "Full package.json read shows scripts.deploy calls scripts/deploy.mjs."
      },
      {
        surfaceKind: "external-dependency",
        label: "fastify runtime dependency",
        exposedObject: "fastify",
        operation: "depends on backend web framework package",
        consumerHints: ["service", "operator"],
        externalSystems: ["fastify"],
        confidence: "high",
        evidence: "Full package.json read shows fastify in dependencies."
      },
      {
        surfaceKind: "external-dependency",
        label: "next runtime dependency",
        exposedObject: "next",
        operation: "depends on frontend framework package",
        consumerHints: ["service", "operator"],
        externalSystems: ["next"],
        confidence: "high",
        evidence: "Full package.json read shows next in dependencies."
      }
    ];
  }
  if (filePath === "web-app/app/(app)/dashboard/page.tsx") {
    return [{
      surfaceKind: "screen",
      label: "Dashboard page screen",
      exposedObject: "DashboardPage",
      operation: "renders dashboard page",
      consumerHints: ["user"],
      actorHints: ["user"],
      stateHints: ["dashboard"],
      confidence: "high",
      evidence: "Full page.tsx read shows DashboardPage renders the Dashboard main UI."
    }];
  }
  if (filePath === "web-app/backend/src/routes/dashboard.ts") {
    return [{
      surfaceKind: "api",
      label: "GET /dashboard API",
      exposedObject: "GET /dashboard",
      operation: "returns dashboard stores payload",
      consumerHints: ["client", "service"],
      actorHints: ["client"],
      dataObjects: ["stores"],
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
      consumerHints: ["service", "operator"],
      dataObjects: ["dashboard_events"],
      confidence: "high",
      evidence: "Full SQL read shows CREATE TABLE dashboard_events."
    }];
  }
  if (filePath === "scripts/deploy.mjs") {
    return [{
      surfaceKind: "command",
      label: "deploy command module",
      exposedObject: "deploy",
      operation: "executes deployment command behavior",
      consumerHints: ["developer", "operator", "automation"],
      actorHints: ["developer", "operator"],
      confidence: "high",
      evidence: "Full script read shows exported deploy function."
    }];
  }
  if (filePath === "README.md") {
    return [{
      surfaceKind: "doc",
      label: "Surface registry test repo README",
      exposedObject: "README.md",
      operation: "documents the test repo",
      consumerHints: ["developer"],
      actorHints: ["developer"],
      confidence: "high",
      evidence: "Full README read shows repository documentation."
    }];
  }
  if (filePath === ".gitignore") {
    return supportSpec(filePath, "Full .gitignore read shows ignore patterns only; it exposes no route, screen, API, command, job, table, workflow, infra resource, doc, test, generated artifact, or direct external dependency.");
  }
  return supportSpec(filePath, "Full-file review found this is a generated or support artifact for the backfill run, not a repo surface to feed Capability Matrix.");
}

function markSurface(repoRoot, runId, filePath, specs = surfaceSpecsForPath(filePath), runLog = null) {
  const args = ["--repo", repoRoot, "--run-id", runId, "--path", filePath, "--surfaces-json", JSON.stringify(specs)];
  if (runLog) args.push("--run-log", runLog);
  return runNode(surfaceFillScript, args, repoRoot);
}

function prepareSurfaceRegistry(repoRoot, runId = "20260527-01", runLog = null) {
  prepareFileRegistry(repoRoot, runId);
  const initArgs = ["--repo", repoRoot, "--run-id", runId];
  if (runLog) initArgs.push("--run-log", runLog);
  runNode(surfaceInitScript, initArgs, repoRoot);
  const pendingPaths = [...new Set(readJsonl(surfaceRegistryPathFor(repoRoot, runId)).rows.map(row => row.upstreamPaths[0]))];
  for (const filePath of pendingPaths) {
    markSurface(repoRoot, runId, filePath, surfaceSpecsForPath(filePath), runLog);
  }
}

function hasFailure(results, id) {
  return results.some(result => result.id === id && result.status === "fail");
}

function hasWarning(results, id) {
  return results.some(result => result.id === id && result.status === "warn");
}

test("init requires passing File Registry handoff and creates pending surface rows", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareFileRegistry(repoRoot, runId);
  const output = runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(output, /surface-registry-skeleton/);
  const surfaces = readJsonl(surfaceRegistryPathFor(repoRoot, runId));
  const fileRows = readJsonl(path.join(defaultBackfillDir(repoRoot), `file-registry-${runId}.jsonl`)).rows;
  const scope = surfaceRegistryScopeCounts(fileRows);
  assert.equal(surfaces.errors.length, 0);
  assert.equal(surfaces.rows.length > 0, true);
  assert.equal(surfaces.rows.length, scope.eligible.length);
  assert.equal(surfaces.rows.every(row => row.status === "pending"), true);
  assert.equal(surfaces.rows.some(row => row.upstreamPaths.includes("README.md")), false);
  assert.equal(surfaces.rows.some(row => row.upstreamPaths.includes(".gitignore")), false);
  assert.equal(surfaces.rows.some(row => row.upstreamPaths.includes("package-lock.json")), false);
  assert.equal(surfaces.rows.some(row => row.upstreamPaths.includes("data_loaders/sample_files/sample_report.rtf")), false);
  assert.equal(surfaces.rows.some(row => row.upstreamPaths.includes("docs/knowledge/inventory/visuals/sample.png")), false);
  assert.equal(scope.skipped.some(row => row.path === "data_loaders/sample_files/sample_report.rtf"), true);
});

test("checker rejects pending rows at handoff and allows them during batch phase", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareFileRegistry(repoRoot, runId);
  runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);

  const handoff = validateSurfaceRegistry({ repoRoot, runId, phase: "handoff" });
  assert.equal(hasFailure(handoff.results, "handoff-no-pending-surfaces"), true);

  const batch = validateSurfaceRegistry({ repoRoot, runId, phase: "batch" });
  assert.equal(hasFailure(batch.results, "handoff-no-pending-surfaces"), false);
  assert.equal(hasFailure(batch.results, "surface-covers-eligible-files"), false);
  assert.equal(batch.results.some(result => result.id === "batch-pending-surfaces-allowed" && result.status === "warn"), true);
  assert.equal(batch.results.some(result => result.id === "surface-covers-eligible-files" && result.status === "warn"), true);
});

test("fill --next names the next pending upstream file without mutating rows", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareFileRegistry(repoRoot, runId);
  runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);

  const before = readJsonl(surfaceRegistryPathFor(repoRoot, runId)).rows;
  const output = runNode(surfaceFillScript, ["--repo", repoRoot, "--run-id", runId, "--next"], repoRoot);
  const payload = JSON.parse(output);
  const after = readJsonl(surfaceRegistryPathFor(repoRoot, runId)).rows;

  assert.equal(payload.schema, "foundation.backfill.surface-registry-next-target.v1");
  assert.equal(typeof payload.target.path, "string");
  assert.equal(payload.target.status, "pending");
  assert.deepEqual(after, before);
});

test("fill marks one full-read file at a time and checker passes handoff", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareSurfaceRegistry(repoRoot, runId);
  const output = runNode(surfaceCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  assert.match(output, /Summary: .* 0 fail/);

  const surfaces = readJsonl(surfaceRegistryPathFor(repoRoot, runId)).rows;
  assert.equal(surfaces.some(row => row.surfaceKind === "screen"), true);
  assert.equal(surfaces.some(row => row.surfaceKind === "api"), true);
  assert.equal(surfaces.some(row => row.surfaceKind === "table"), true);
  assert.equal(surfaces.some(row => row.surfaceKind === "command"), true);
  assert.equal(surfaces.some(row => row.surfaceKind === "external-dependency"), true);
  assert.equal(surfaces.every(row => row.evidenceRefs.some(ref => ref.relationship === "agent-read-full-file")), true);
});

test("fill can revise failed rows and records a revision event", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  const runLog = path.join("docs", "specs", "backfill", `run-log-${runId}.jsonl`);
  prepareFileRegistry(repoRoot, runId);
  runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const surfacePath = surfaceRegistryPathFor(repoRoot, runId);
  const surfaces = readJsonl(surfacePath).rows;
  surfaces[0] = {
    ...surfaces[0],
    status: "needs-evidence",
    reviewFlags: [{
      severity: "blocking",
      reason: "Fixture failed semantic eval.",
      nextAction: "Revise through the fill loop."
    }]
  };
  writeJsonl(surfacePath, surfaces);

  markSurface(repoRoot, runId, surfaces[0].upstreamPaths[0], surfaceSpecsForPath(surfaces[0].upstreamPaths[0]), runLog);

  const events = readJsonl(path.join(repoRoot, runLog)).rows;
  assert.equal(events.at(-1).event, "revision");
  assert.equal(readJsonl(surfacePath).rows.some(row => row.status === "needs-evidence"), false);
});

test("checker fails duplicate IDs, stale upstream hashes, and unresolved eligible files", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareSurfaceRegistry(repoRoot, runId);
  const surfacePath = surfaceRegistryPathFor(repoRoot, runId);
  const surfaces = readJsonl(surfacePath).rows;
  const duplicate = { ...surfaces[0] };
  const stale = { ...surfaces[1], upstreamContentHashes: [{ ...surfaces[1].upstreamContentHashes[0], contentHash: "sha256:stale" }] };
  const broken = surfaces
    .filter(row => !row.upstreamPaths[0].includes("backend/src/routes/dashboard.ts"))
    .map((row, index) => index === 1 ? stale : row);
  broken.push(duplicate);
  writeJsonl(surfacePath, broken);

  const results = validateSurfaceRegistry({ repoRoot, runId }).results;
  assert.equal(hasFailure(results, "surface-surfaceId-unique"), true);
  assert.equal(hasFailure(results, "surface-upstream-fresh"), true);
  assert.equal(hasFailure(results, "surface-covers-eligible-files"), true);
});

test("fill rejects inert fixture rows outside Surface Registry scope", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareFileRegistry(repoRoot, runId);
  runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);

  assert.throws(
    () => markSurface(repoRoot, runId, "data_loaders/sample_files/sample_report.rtf", supportSpec("data_loaders/sample_files/sample_report.rtf")),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /outside Surface Registry scope/);
      return true;
    }
  );
});

test("fill rejects generated surface files and batch shortcuts", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareFileRegistry(repoRoot, runId);
  runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const surfacesFile = path.join("docs", "specs", "backfill", "generated-surfaces.json");
  fs.writeFileSync(path.join(repoRoot, surfacesFile), JSON.stringify(surfaceSpecsForPath("scripts/deploy.mjs")), "utf8");

  assert.throws(
    () => runNode(surfaceFillScript, ["--repo", repoRoot, "--run-id", runId, "--path", "scripts/deploy.mjs", "--surfaces-file", surfacesFile], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /no longer accepts --surfaces-file/);
      return true;
    }
  );

  assert.throws(
    () => runNode(surfaceFillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /no longer supports --all or --batch-size/);
      return true;
    }
  );

  assert.throws(
    () => runNode(surfaceFillScript, ["--repo", repoRoot, "--run-id", runId, "--batch-size", "10"], repoRoot),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /no longer supports --all or --batch-size/);
      return true;
    }
  );
});

test("fill rejects missing or generic full-file evidence", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareFileRegistry(repoRoot, runId);
  runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);

  assert.throws(
    () => markSurface(repoRoot, runId, "scripts/deploy.mjs", [{
      surfaceKind: "command",
      label: "deploy command module",
      exposedObject: "deploy",
      operation: "executes deployment command behavior",
      consumerHints: ["developer", "operator"],
      confidence: "high"
    }]),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /requires concrete evidence/);
      return true;
    }
  );

  assert.throws(
    () => markSurface(repoRoot, runId, "scripts/deploy.mjs", [{
      surfaceKind: "command",
      label: "deploy command module",
      exposedObject: "deploy",
      operation: "executes deployment command behavior",
      consumerHints: ["developer", "operator"],
      confidence: "high",
      evidence: "Agent read the complete upstream file before marking this surface row."
    }]),
    error => {
      assert.match(`${error.stderr || ""}${error.message}`, /requires concrete evidence/);
      return true;
    }
  );
});

test("checker rejects rows attached to out-of-scope upstream files", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareSurfaceRegistry(repoRoot, runId);
  const fileRows = readJsonl(path.join(defaultBackfillDir(repoRoot), `file-registry-${runId}.jsonl`)).rows;
  const fixture = fileRows.find(row => row.path === "data_loaders/sample_files/sample_report.rtf");
  const surfacePath = surfaceRegistryPathFor(repoRoot, runId);
  const surfaces = readJsonl(surfacePath).rows;
  surfaces.push({
    ...surfaces[0],
    surfaceId: "surface:out-of-scope-fixture",
    upstreamFileIds: [fixture.fileId],
    upstreamPaths: [fixture.path],
    upstreamContentHashes: [{
      fileId: fixture.fileId,
      path: fixture.path,
      contentHash: fixture.contentHash,
      sizeBytes: fixture.sizeBytes
    }],
    evidenceRefs: [{
      fileId: fixture.fileId,
      path: fixture.path,
      relationship: "agent-read-full-file",
      detail: "Synthetic invalid row for scope validation.",
      fullFileRead: true
    }]
  });
  writeJsonl(surfacePath, surfaces);

  const results = validateSurfaceRegistry({ repoRoot, runId }).results;
  assert.equal(hasFailure(results, "surface-scope-eligible"), true);
});

test("checker rejects generic evidence at handoff and warns during batch", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  fs.mkdirSync(path.join(repoRoot, "infrastructure", "applications", "ecs"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "web-app", "backend", "src", "routes", "multi.ts"), `
export async function multiRoutes(fastify) {
  fastify.get("/alpha", async () => ({ ok: true }));
  fastify.post("/beta", async () => ({ ok: true }));
}
`, "utf8");
  fs.writeFileSync(path.join(repoRoot, "infrastructure", "applications", "ecs", "main.tf"), `
resource "aws_ecs_cluster" "main" {
  name = "test"
}

resource "aws_ecs_task_definition" "api" {
  family = "api"
}

resource "aws_ecs_service" "api" {
  name = "api"
}
`, "utf8");
  execFileSync("git", ["add", "."], { cwd: repoRoot });

  prepareFileRegistry(repoRoot, runId);
  runNode(surfaceInitScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const pendingPaths = [...new Set(readJsonl(surfaceRegistryPathFor(repoRoot, runId)).rows.map(row => row.upstreamPaths[0]))];
  for (const filePath of pendingPaths) {
    if (filePath === "web-app/backend/src/routes/multi.ts") {
      markSurface(repoRoot, runId, filePath, [{
        surfaceKind: "api",
        label: "multi route family API",
        exposedObject: "/alpha and /beta",
        operation: "handles alpha and beta route handlers",
        consumerHints: ["client"],
        confidence: "medium",
        evidence: "Full multi.ts read shows fastify.get('/alpha') and fastify.post('/beta') route handlers."
      }]);
    } else if (filePath === "infrastructure/applications/ecs/main.tf") {
      markSurface(repoRoot, runId, filePath, [{
        surfaceKind: "infra-resource",
        label: "ECS application infrastructure",
        exposedObject: "ecs application resources",
        operation: "creates ECS cluster, task definition, and service",
        consumerHints: ["operator"],
        confidence: "medium",
        evidence: "Full Terraform read shows ECS cluster, task definition, and service resources."
      }]);
    } else {
      markSurface(repoRoot, runId, filePath, surfaceSpecsForPath(filePath));
    }
  }
  const surfacePath = surfaceRegistryPathFor(repoRoot, runId);
  const surfaces = readJsonl(surfacePath).rows.map(row => {
    if (row.upstreamPaths.includes("web-app/backend/src/routes/multi.ts")) {
      return {
        ...row,
        evidenceRefs: row.evidenceRefs.map(ref => ref.relationship === "agent-read-full-file"
          ? { ...ref, detail: "Agent read the complete upstream file before marking this surface row." }
          : ref)
      };
    }
    return row;
  });
  writeJsonl(surfacePath, surfaces);

  const results = validateSurfaceRegistry({ repoRoot, runId, phase: "batch" }).results;
  assert.equal(hasWarning(results, "surface-evidence-specificity"), true);
  assert.equal(hasWarning(results, "surface-route-overmerge-heuristic"), true);
  assert.equal(hasWarning(results, "surface-infra-overmerge-heuristic"), true);

  const handoff = validateSurfaceRegistry({ repoRoot, runId, phase: "handoff" }).results;
  assert.equal(hasFailure(handoff, "surface-evidence-specificity"), true);
});

test("eval blocks generic evidence and warns for exposed internal service classification", () => {
  const fileRow = {
    fileId: "file:service",
    path: "web-app/backend/src/services/bedrock.ts",
    kind: "service"
  };
  const row = {
    surfaceId: "surface:service",
    surfaceKind: "api",
    sourceCategory: "exposed",
    label: "Bedrock SQL generation service",
    upstreamFileIds: [fileRow.fileId],
    upstreamPaths: [fileRow.path],
    evidenceRefs: [{
      fileId: fileRow.fileId,
      path: fileRow.path,
      relationship: "agent-read-full-file",
      detail: "Agent read the complete upstream file before marking this surface row.",
      fullFileRead: true
    }],
    exposedObject: "generateSQL and formatResponse",
    operation: "invokes Bedrock to generate SQL and format results",
    supportReason: "",
    reviewFlags: [],
    status: "ready-for-capability",
    confidence: "medium"
  };

  const receipt = scoreSurfaceRow(row, new Map([[fileRow.fileId, fileRow]]));
  assert.equal(receipt.findings.some(finding => finding.severity === "blocking" && finding.category === "evidenceTraceability"), true);
  assert.equal(receipt.findings.some(finding => finding.severity === "warning" && finding.category === "kindAndBoundary"), true);
  assert.equal(receipt.acceptabilityGate.acceptable, false);
});

test("eval writes canonical JSONL receipts and derived HTML summary", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareSurfaceRegistry(repoRoot, runId);
  const output = runNode(surfaceEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
  assert.match(output, /Acceptable: yes/);
  const receipts = readJsonl(surfaceEvalReceiptPathFor(repoRoot, runId));
  assert.equal(receipts.errors.length, 0);
  assert.equal(receipts.rows[0].receiptType, "summary");
  assert.equal(receipts.rows[0].totalScore, 100);
  assert.equal(receipts.rows[0].calibration.status, "calibration-not-gold");
  assert.equal(fs.existsSync(surfaceEvalSummaryPathFor(repoRoot, runId)), true);
});

test("refresh invalidates surfaces when upstream File Registry rows change", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareSurfaceRegistry(repoRoot, runId);
  const fileRegistryPath = path.join(defaultBackfillDir(repoRoot), `file-registry-${runId}.jsonl`);
  const fileRows = readJsonl(fileRegistryPath).rows.map(row => (
    row.path === "web-app/backend/src/routes/dashboard.ts"
      ? { ...row, contentHash: "sha256:changed", sizeBytes: row.sizeBytes + 1 }
      : row
  ));
  writeJsonl(fileRegistryPath, fileRows);
  const output = runNode(surfaceRefreshScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const payload = JSON.parse(output);
  assert.equal(payload.changed.includes("web-app/backend/src/routes/dashboard.ts"), true);
  const surfaces = readJsonl(surfaceRegistryPathFor(repoRoot, runId)).rows;
  assert.equal(surfaces.some(row => row.status === "pending" && row.upstreamPaths.includes("web-app/backend/src/routes/dashboard.ts")), true);
});

test("report command records handoff state and checker can detect report drift", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  const runLog = path.join("docs", "specs", "backfill", `run-log-${runId}.jsonl`);
  prepareSurfaceRegistry(repoRoot, runId, runLog);
  runNode(surfaceCheckScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  runNode(surfaceEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", "--run-log", runLog], repoRoot);
  const reportOutput = runNode(surfaceReportScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  const report = JSON.parse(reportOutput);
  assert.equal(report.state.checkerResult, "pass");
  assert.equal(report.state.evalResult, "pass");
  assert.equal(report.state.nextLayer, "capability matrix");

  const checkOutput = runNode(surfaceCheckScript, ["--repo", repoRoot, "--run-id", runId, "--report", report.reportPath], repoRoot);
  assert.match(checkOutput, /surface-report-state-current/);

  const reportPath = path.join(repoRoot, report.reportPath);
  const drifted = fs.readFileSync(reportPath, "utf8").replace(`"pendingCount": 0`, `"pendingCount": 99`);
  fs.writeFileSync(reportPath, drifted, "utf8");
  const drift = validateSurfaceRegistry({ repoRoot, runId, reportPath }).results;
  assert.equal(hasFailure(drift, "surface-report-state-current"), true);
});

test("report keeps Surface Registry in revision when eval revision targets remain", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareSurfaceRegistry(repoRoot, runId);
  runNode(surfaceCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(surfaceEvalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);

  const receiptPath = surfaceEvalReceiptPathFor(repoRoot, runId);
  const receipts = readJsonl(receiptPath).rows;
  receipts[0] = {
    ...receipts[0],
    findings: [{
      category: "evidenceTraceability",
      severity: "warning",
      message: "Fixture warning requiring revision.",
      subjectRowId: "surface:fixture"
    }],
    revisionTargets: ["surface:fixture"]
  };
  writeJsonl(receiptPath, receipts);

  const report = JSON.parse(runNode(surfaceReportScript, ["--repo", repoRoot, "--run-id", runId], repoRoot));
  assert.equal(report.state.evalResult, "pass-with-revisions");
  assert.equal(report.state.evalRevisionTargetCount, 1);
  assert.equal(report.state.nextLayer, "surface registry revision");
});

test("surface check command writes check artifact", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  prepareSurfaceRegistry(repoRoot, runId);
  runNode(surfaceCheckScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const check = readJson(surfaceCheckPathFor(repoRoot, runId));
  assert.equal(check.schema, "foundation.backfill.surface-registry-check.v1");
  assert.equal(summarizeResults(check.results).fail, 0);
});
