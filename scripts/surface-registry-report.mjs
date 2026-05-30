#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  ensureDir,
  parseCliArgs,
  readFileRegistryRows,
  readJson,
  readJsonl,
  surfaceRegistryScopeCounts,
  surfaceCheckPathFor,
  surfaceEvalReceiptPathFor,
  surfaceEvalSummaryPathFor,
  surfaceRegistryPathFor
} from "./surface-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:surface-registry:report -- --repo /path/to/repo --run-id YYYYMMDD-NN [--report docs/specs/backfill/review-report-YYYYMMDD-NN.html] [--run-log path]

Creates or updates a target backfill report with the Surface / Function Map V1 handoff state.`;
}

function latestRunLogSequence(logPath) {
  if (!logPath || !fs.existsSync(logPath)) return null;
  const parsed = readJsonl(logPath);
  const sequences = parsed.rows.map(row => row.sequence).filter(Number.isInteger);
  return sequences.length > 0 ? Math.max(...sequences) : null;
}

function readEvalSummary(receiptPath) {
  if (!fs.existsSync(receiptPath)) return null;
  const parsed = readJsonl(receiptPath);
  return parsed.rows.find(row => row.receiptType === "summary") || null;
}

function buildState({ repoRoot, runId, outDir, runLogPath }) {
  const registryPath = surfaceRegistryPathFor(repoRoot, runId, outDir);
  const registry = readJsonl(registryPath);
  const fileRegistry = readFileRegistryRows(repoRoot, runId, outDir);
  const scope = surfaceRegistryScopeCounts(fileRegistry.rows);
  const checkPath = surfaceCheckPathFor(repoRoot, runId, outDir);
  const check = fs.existsSync(checkPath) ? readJson(checkPath) : null;
  const evalReceiptPath = surfaceEvalReceiptPathFor(repoRoot, runId, outDir);
  const evalSummary = readEvalSummary(evalReceiptPath);
  const pendingCount = registry.rows.filter(row => row.status === "pending").length;
  const needsEvidenceCount = registry.rows.filter(row => row.status === "needs-evidence").length;
  const blockingFlagCount = registry.rows.filter(row => (row.reviewFlags || []).some(flag => flag.severity === "blocking")).length;
  const readyForCapabilityCount = registry.rows.filter(row => row.status === "ready-for-capability").length;
  const supportCount = registry.rows.filter(row => row.surfaceKind === "support-classification").length;
  const checkerPass = check?.summary?.fail === 0;
  const evalPass = Boolean(evalSummary?.acceptabilityGate?.acceptable);
  const evalRevisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  const evalFindings = Array.isArray(evalSummary?.findings) ? evalSummary.findings : [];
  const evalRevisionTargetCount = evalRevisionTargets.length;
  const evalWarningCount = evalFindings.filter(finding => finding?.severity === "warning").length;
  const evalBlockingFindingCount = evalFindings.filter(finding => finding?.severity === "blocking").length;
  const evalHandoffReady = evalPass && evalRevisionTargetCount === 0;

  return {
    schema: "foundation.backfill.surface-registry-report-state.v1",
    runId,
    generatedAt: new Date().toISOString(),
    registryPath: path.relative(repoRoot, registryPath),
    checkerPath: path.relative(repoRoot, checkPath),
    checkerResult: checkerPass ? "pass" : "fail-or-missing",
    evalReceiptPath: path.relative(repoRoot, evalReceiptPath),
    evalSummaryPath: path.relative(repoRoot, surfaceEvalSummaryPathFor(repoRoot, runId, outDir)),
    evalResult: evalHandoffReady ? "pass" : (evalPass ? "pass-with-revisions" : "fail-or-missing"),
    evalScore: evalSummary?.totalScore ?? null,
    evalRevisionTargetCount,
    evalWarningCount,
    evalBlockingFindingCount,
    eligibleFileCount: scope.eligible.length,
    skippedFileCount: scope.skipped.length,
    pendingCount,
    mappedCount: registry.rows.filter(row => row.status === "mapped").length,
    needsEvidenceCount,
    readyForCapabilityCount,
    supportCount,
    blockingFlagCount,
    latestRunLogSequence: latestRunLogSequence(runLogPath),
    nextLayer: pendingCount === 0 && needsEvidenceCount === 0 && blockingFlagCount === 0 && checkerPass && evalHandoffReady
      ? "Capability Map"
      : "Surface / Function Map revision"
  };
}

function renderSection(state) {
  return `<section id="surface-registry-v1-state" data-spec-section="surface-registry-v1-state" data-section-type="handoff">
  <h2>Surface / Function Map V1 State</h2>
  <table class="status-table">
    <tbody>
      <tr><td>Registry</td><td><code>${state.registryPath}</code></td></tr>
      <tr><td>Eligible upstream files</td><td>${state.eligibleFileCount}</td></tr>
      <tr><td>Skipped inert files</td><td>${state.skippedFileCount}</td></tr>
      <tr><td>Pending rows</td><td>${state.pendingCount}</td></tr>
      <tr><td>Mapped support rows</td><td>${state.mappedCount}</td></tr>
      <tr><td>Needs evidence rows</td><td>${state.needsEvidenceCount}</td></tr>
      <tr><td>Ready-for-capability rows</td><td>${state.readyForCapabilityCount}</td></tr>
      <tr><td>Support classifications</td><td>${state.supportCount}</td></tr>
      <tr><td>Blocking flags</td><td>${state.blockingFlagCount}</td></tr>
      <tr><td>Checker result</td><td>${state.checkerResult}</td></tr>
      <tr><td>Eval result</td><td>${state.evalResult}${state.evalScore === null ? "" : `, score ${state.evalScore}`}</td></tr>
      <tr><td>Eval revision targets</td><td>${state.evalRevisionTargetCount}</td></tr>
      <tr><td>Eval warnings</td><td>${state.evalWarningCount}</td></tr>
      <tr><td>Eval blocking findings</td><td>${state.evalBlockingFindingCount}</td></tr>
      <tr><td>Eval receipt</td><td><code>${state.evalReceiptPath}</code></td></tr>
      <tr><td>Eval summary</td><td><code>${state.evalSummaryPath}</code></td></tr>
      <tr><td>Latest run-log sequence</td><td>${state.latestRunLogSequence ?? "not recorded"}</td></tr>
      <tr><td>Next layer</td><td>${state.nextLayer}</td></tr>
    </tbody>
  </table>
  <p>Capability Map may only consume this layer when the next layer is <code>Capability Map</code>; otherwise rows named by check/eval receipts must return to the Surface / Function Map fill loop.</p>
</section>`;
}

function renderReport(state) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Surface / Function Map Report ${state.runId}</title>
<link rel="stylesheet" href="../spec-system.css">
<script type="application/json" id="backfill-surface-registry-state">
${JSON.stringify(state, null, 2)}
</script>
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/review-report-${state.runId}.html</div>
    <h1>Backfill Report ${state.runId}</h1>
    <p class="lede">Minimal report generated by the Foundation Surface / Function Map V1 report integration.</p>
  </section>
  <article class="doc-body">
${renderSection(state)}
  </article>
</main>
</body>
</html>
`;
}

function upsertReportState(html, state) {
  const script = `<script type="application/json" id="backfill-surface-registry-state">\n${JSON.stringify(state, null, 2)}\n</script>`;
  const section = renderSection(state);
  let nextHtml = html;
  if (/<script\b[^>]*id=["']backfill-surface-registry-state["'][^>]*>[\s\S]*?<\/script>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<script\b[^>]*id=["']backfill-surface-registry-state["'][^>]*>[\s\S]*?<\/script>/i, script);
  } else {
    nextHtml = nextHtml.replace("</head>", `${script}\n</head>`);
  }

  if (/<section\b[^>]*id=["']surface-registry-v1-state["'][^>]*>[\s\S]*?<\/section>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<section\b[^>]*id=["']surface-registry-v1-state["'][^>]*>[\s\S]*?<\/section>/i, section);
  } else if (/<article\b[^>]*class=["']doc-body["'][^>]*>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<article\b([^>]*)class=["']doc-body["']([^>]*)>/i, match => `${match}\n${section}`);
  } else {
    nextHtml = nextHtml.replace("</main>", `${section}\n</main>`);
  }
  return nextHtml;
}

function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage());
    return;
  }
  if (!options.repo) throw new Error("Missing --repo");
  if (!options["run-id"]) throw new Error("Missing --run-id");

  const repoRoot = path.resolve(options.repo);
  const runId = options["run-id"];
  const outDir = options["out-dir"] ? path.resolve(repoRoot, options["out-dir"]) : defaultBackfillDir(repoRoot);
  const reportPath = options.report
    ? path.resolve(repoRoot, options.report)
    : path.join(outDir, `review-report-${runId}.html`);
  const runLogPath = options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null;
  let state = buildState({ repoRoot, runId, outDir, runLogPath });

  appendRunLogEvent(runLogPath, {
    runId,
    slice: null,
    phase: "handoff",
    event: "handoff",
    summary: `Surface / Function Map handoff recorded with next layer ${state.nextLayer}.`,
    artifactsRead: [
      state.registryPath,
      state.checkerPath,
      state.evalReceiptPath
    ],
    artifactsChanged: [path.relative(repoRoot, reportPath)],
    commands: ["foundation:surface-registry:report"],
    checks: [{ name: "surface-registry-handoff", result: state.nextLayer === "Capability Map" ? "passed" : "needs-revision" }],
    result: state.nextLayer === "Capability Map"
      ? "Surface / Function Map handoff gate passed."
      : "Surface / Function Map handoff gate did not pass.",
    nextAction: state.nextLayer === "Capability Map"
      ? "Capability Map may consume Surface / Function Map artifacts."
      : "Revise Surface / Function Map rows named by checker or eval receipts."
  });
  state = buildState({ repoRoot, runId, outDir, runLogPath });

  ensureDir(path.dirname(reportPath));
  const nextHtml = fs.existsSync(reportPath)
    ? upsertReportState(fs.readFileSync(reportPath, "utf8"), state)
    : renderReport(state);
  fs.writeFileSync(reportPath, nextHtml, "utf8");

  console.log(JSON.stringify({
    reportPath: path.relative(repoRoot, reportPath),
    state
  }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    console.error("");
    console.error(usage());
    process.exit(2);
  }
}
