import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import test from "node:test";
import {
  createManifest,
  createSkeletonRow,
  defaultBackfillDir,
  evalReceiptPathFor,
  evalSummaryPathFor,
  manifestPathFor,
  mapRegistryRow,
  mergeRowsForRefresh,
  readJson,
  readJsonl,
  registryPathFor,
  summarizeResults,
  validateGraphLinks,
  validateRegistry,
  writeJson,
  writeJsonl
} from "./file-registry-core.mjs";

const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
const initScript = path.join(scriptsDir, "file-registry-init.mjs");
const fillScript = path.join(scriptsDir, "file-registry-fill.mjs");
const checkScript = path.join(scriptsDir, "file-registry-check.mjs");
const evalScript = path.join(scriptsDir, "file-registry-eval.mjs");
const refreshScript = path.join(scriptsDir, "file-registry-refresh.mjs");
const reportScript = path.join(scriptsDir, "file-registry-report.mjs");

function makeRepo() {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-file-registry-"));
  execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
  fs.mkdirSync(path.join(repoRoot, "src", "routes"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "src", "services"), { recursive: true });
  fs.mkdirSync(path.join(repoRoot, "docs", "specs", "backfill"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "package.json"), JSON.stringify({
    scripts: { test: "node --test", "spec:check": "node docs/specs/check-specs.mjs" },
    dependencies: { fastify: "^5.0.0" }
  }, null, 2), "utf8");
  fs.writeFileSync(path.join(repoRoot, "src", "routes", "dashboard.ts"), `
import { fetchDashboard } from "../services/dashboard";
export async function dashboardRoute(fastify) {
  fastify.get("/dashboard", async () => fetchDashboard());
}
`, "utf8");
  fs.writeFileSync(path.join(repoRoot, "src", "services", "dashboard.ts"), `
export async function fetchDashboard() {
  return { stores: [], sales: [] };
}
`, "utf8");
  fs.writeFileSync(path.join(repoRoot, "README.md"), "# Test repo\n\nDocuments the dashboard route.\n", "utf8");
  fs.writeFileSync(path.join(repoRoot, ".gitignore"), "node_modules\n.env\n", "utf8");
  execFileSync("git", ["add", "package.json", "src/routes/dashboard.ts", "src/services/dashboard.ts", "README.md", ".gitignore"], { cwd: repoRoot });
  fs.writeFileSync(path.join(repoRoot, "notes.md"), "# Untracked note\n", "utf8");
  return repoRoot;
}

function runNode(script, args, cwd) {
  return execFileSync(process.execPath, [script, ...args], { cwd, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function hasFailure(results, id) {
  return results.some(result => result.id === id && result.status === "fail");
}

test("init creates deterministic manifest and pending registry skeleton", () => {
  const repoRoot = makeRepo();
  runNode(initScript, ["--repo", repoRoot, "--run-id", "20260527-01"], repoRoot);
  const manifest = readJson(manifestPathFor(repoRoot, "20260527-01"));
  const registry = readJsonl(registryPathFor(repoRoot, "20260527-01"));

  assert.equal(manifest.schema, "foundation.backfill.file-manifest.v1");
  assert.equal(manifest.files.some(file => file.path === "notes.md" && file.sourceStatus === "untracked-non-ignored"), true);
  assert.equal(manifest.files.some(file => file.path === "docs/specs/backfill/file-manifest-20260527-01.json"), false);
  assert.equal(registry.rows.length, manifest.files.length);
  assert.equal(registry.rows.every(row => row.status === "pending"), true);
});

test("checker rejects pending rows at handoff and allows them in batch phase", () => {
  const repoRoot = makeRepo();
  runNode(initScript, ["--repo", repoRoot, "--run-id", "20260527-01"], repoRoot);

  const handoff = validateRegistry({ repoRoot, runId: "20260527-01", phase: "handoff" });
  assert.equal(hasFailure(handoff.results, "handoff-no-pending"), true);

  const batch = validateRegistry({ repoRoot, runId: "20260527-01", phase: "batch" });
  assert.equal(hasFailure(batch.results, "handoff-no-pending"), false);
  assert.equal(batch.results.some(result => result.id === "batch-pending-allowed" && result.status === "warn"), true);
});

test("fill maps pending rows and checker passes the deterministic handoff gate", () => {
  const repoRoot = makeRepo();
  runNode(initScript, ["--repo", repoRoot, "--run-id", "20260527-01"], repoRoot);
  runNode(fillScript, ["--repo", repoRoot, "--run-id", "20260527-01", "--all"], repoRoot);
  const output = runNode(checkScript, ["--repo", repoRoot, "--run-id", "20260527-01"], repoRoot);
  assert.match(output, /Summary: .* 0 fail/);
});

test("checker rejects duplicate rows, stale hashes, and invalid statuses", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  const manifest = createManifest({ repoRoot, runId });
  const manifestPaths = new Set(manifest.files.map(file => file.path));
  const rows = manifest.files.map(entry => mapRegistryRow({ repoRoot, entry, manifestPaths }));
  const duplicate = { ...rows[0] };
  rows.push(duplicate);
  rows[1] = { ...rows[1], status: "skipped" };
  rows[2] = { ...rows[2], contentHash: "sha256:stale" };
  writeJson(manifestPathFor(repoRoot, runId), manifest);
  writeJsonl(registryPathFor(repoRoot, runId), rows);

  const results = validateRegistry({ repoRoot, runId }).results;
  assert.equal(hasFailure(results, "registry-path-unique"), true);
  assert.equal(results.some(result => result.id.endsWith(":status") && result.status === "fail"), true);
  assert.equal(hasFailure(results, "registry-fresh"), true);
});

test("refresh preserves unchanged mapped rows and invalidates changed files", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  const manifest = createManifest({ repoRoot, runId });
  const manifestPaths = new Set(manifest.files.map(file => file.path));
  const rows = manifest.files.map(entry => mapRegistryRow({ repoRoot, entry, manifestPaths }));
  writeJson(manifestPathFor(repoRoot, runId), manifest);
  writeJsonl(registryPathFor(repoRoot, runId), rows);

  fs.appendFileSync(path.join(repoRoot, "src", "services", "dashboard.ts"), "\nexport const refreshed = true;\n", "utf8");
  const refreshedManifest = createManifest({ repoRoot, runId, mode: "steady-state" });
  const merged = mergeRowsForRefresh({ repoRoot, manifest: refreshedManifest, existingRows: rows });

  const changedRow = merged.rows.find(row => row.path === "src/services/dashboard.ts");
  const unchangedRow = merged.rows.find(row => row.path === "src/routes/dashboard.ts");
  assert.equal(changedRow.status, "pending");
  assert.equal(changedRow.refreshStatus, "changed");
  assert.equal(unchangedRow.status, "mapped");
});

test("refresh command writes changed-file receipt", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  runNode(initScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(fillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot);
  fs.appendFileSync(path.join(repoRoot, "src", "routes", "dashboard.ts"), "\nexport const changed = true;\n", "utf8");
  const output = runNode(refreshScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  const payload = JSON.parse(output);
  assert.equal(payload.changed.includes("src/routes/dashboard.ts"), true);
  assert.equal(payload.pendingCount >= 1, true);
});

test("eval writes canonical JSONL and derived HTML summary", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  runNode(initScript, ["--repo", repoRoot, "--run-id", runId], repoRoot);
  runNode(fillScript, ["--repo", repoRoot, "--run-id", runId, "--all"], repoRoot);
  const output = runNode(evalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all"], repoRoot);
  assert.match(output, /Acceptable: yes/);
  const receipts = readJsonl(evalReceiptPathFor(repoRoot, runId));
  assert.equal(receipts.errors.length, 0);
  assert.equal(receipts.rows[0].receiptType, "summary");
  assert.equal(receipts.rows[0].totalScore, 100);
  assert.equal(fs.existsSync(evalSummaryPathFor(repoRoot, runId)), true);
});

test("report command records registry handoff state", () => {
  const repoRoot = makeRepo();
  const runId = "20260527-01";
  const runLog = path.join("docs", "specs", "backfill", `run-log-${runId}.jsonl`);
  runNode(initScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  runNode(fillScript, ["--repo", repoRoot, "--run-id", runId, "--all", "--run-log", runLog], repoRoot);
  runNode(checkScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  runNode(evalScript, ["--repo", repoRoot, "--run-id", runId, "--sample", "all", "--run-log", runLog], repoRoot);
  const reportOutput = runNode(reportScript, ["--repo", repoRoot, "--run-id", runId, "--run-log", runLog], repoRoot);
  const report = JSON.parse(reportOutput);
  assert.equal(report.state.pendingCount, 0);
  assert.equal(report.state.checkerResult, "pass");
  assert.equal(report.state.evalResult, "pass");
  assert.equal(report.state.nextLayer, "Surface / Function Map");
  assert.equal(fs.existsSync(path.join(repoRoot, report.reportPath)), true);
});

test("strict graph check validates spec, capability, and verification-or-gap links", () => {
  const repoRoot = makeRepo();
  fs.mkdirSync(path.join(repoRoot, "docs", "specs", "backfill"), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, "docs", "specs", "index.html"), `
<script type="application/json" id="spec-registry">
{
  "specs": [
    {
      "id": "test.spec",
      "canonicalSection": "intent",
      "relatedSpecs": [],
      "coverage": []
    }
  ]
}
</script>
`, "utf8");
  fs.writeFileSync(path.join(repoRoot, "docs", "specs", "backfill", "review-report-20260527-01.html"), `
<script type="application/json" id="backfill-capability-matrix">
{ "capabilities": [{ "id": "cap-one" }] }
</script>
`, "utf8");
  const row = {
    schema: "foundation.backfill.file-registry-row.v1",
    runId: "20260527-01",
    fileId: "file:one",
    path: "src/routes/dashboard.ts",
    contentHash: "sha256:test",
    sizeBytes: 1,
    extension: ".ts",
    detectedLanguage: "TypeScript",
    sourceStatus: "tracked",
    kind: "route",
    domain: "dashboard",
    evidenceValue: "behavior-bearing",
    role: "Defines dashboard route behavior.",
    responsibilities: [{ label: "Route", description: "Defines dashboard route behavior for users.", symbols: [] }],
    importantSymbols: [],
    entryPoints: ["src/routes/dashboard.ts"],
    exports: [],
    imports: [],
    dataObjects: [],
    externalSystems: [],
    relatedFiles: [],
    specLinks: [{ specId: "test.spec", sectionId: "intent", relationship: "implements" }],
    capabilityIds: ["cap-one"],
    verificationTargets: [],
    testGaps: [{ id: "gap-one", reason: "No file-specific test yet." }],
    reviewFlags: [],
    status: "mapped",
    confidence: "high"
  };
  const results = validateGraphLinks({ repoRoot, rows: [row], strict: true });
  assert.equal(summarizeResults(results).fail, 0);
});
