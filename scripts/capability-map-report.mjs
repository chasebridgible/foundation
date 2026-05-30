#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  buildCapabilityMapPayload,
  capabilityCheckPathFor,
  capabilityEvalReceiptPathFor,
  capabilityMapPathFor,
  capabilitySummaryPathFor,
  defaultBackfillDir,
  ensureDir,
  parseCliArgs,
  readJson,
  readJsonl,
  readSurfaceFunctionMapRows,
  readySurfaceRows
} from "./capability-map-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:capability-map:report -- --repo /path/to/repo --run-id YYYYMMDD-NN [--report docs/specs/backfill/review-report-YYYYMMDD-NN.html] [--run-log path]

Creates or updates a target backfill report with Capability Map V1 handoff state and embedded backfill-capability-map JSON.`;
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
  const registryPath = capabilityMapPathFor(repoRoot, runId, outDir);
  const matrix = readJsonl(registryPath);
  const surfaceFunctionMap = readSurfaceFunctionMapRows(repoRoot, runId, outDir);
  const checkPath = capabilityCheckPathFor(repoRoot, runId, outDir);
  const check = fs.existsSync(checkPath) ? readJson(checkPath) : null;
  const evalReceiptPath = capabilityEvalReceiptPathFor(repoRoot, runId, outDir);
  const evalSummary = readEvalSummary(evalReceiptPath);
  const pendingCount = matrix.rows.filter(row => row.status === "pending").length;
  const mappedCount = matrix.rows.filter(row => row.status === "mapped").length;
  const readyForQueueCount = matrix.rows.filter(row => row.status === "ready-for-queue").length;
  const needsSplitCount = matrix.rows.filter(row => row.status === "needs-split").length;
  const blockingFlagCount = matrix.rows.filter(row => (row.reviewFlags || []).some(flag => flag.severity === "blocking")).length;
  const checkerPass = check?.summary?.fail === 0;
  const evalPass = Boolean(evalSummary?.acceptabilityGate?.acceptable);
  const evalRevisionTargets = Array.isArray(evalSummary?.revisionTargets) ? evalSummary.revisionTargets : [];
  const evalFindings = Array.isArray(evalSummary?.findings) ? evalSummary.findings : [];
  const evalRevisionTargetCount = evalRevisionTargets.length;
  const evalWarningCount = evalFindings.filter(finding => finding?.severity === "warning").length;
  const evalBlockingFindingCount = evalFindings.filter(finding => finding?.severity === "blocking").length;
  const evalHandoffReady = evalPass && evalRevisionTargetCount === 0;

  return {
    schema: "foundation.backfill.capability-map-report-state.v1",
    runId,
    generatedAt: new Date().toISOString(),
    registryPath: path.relative(repoRoot, registryPath),
    checkerPath: path.relative(repoRoot, checkPath),
    checkerResult: checkerPass ? "pass" : "fail-or-missing",
    evalReceiptPath: path.relative(repoRoot, evalReceiptPath),
    summaryPath: path.relative(repoRoot, capabilitySummaryPathFor(repoRoot, runId, outDir)),
    evalResult: evalHandoffReady ? "pass" : (evalPass ? "pass-with-revisions" : "fail-or-missing"),
    evalScore: evalSummary?.totalScore ?? null,
    evalRevisionTargetCount,
    evalWarningCount,
    evalBlockingFindingCount,
    readySurfaceCount: readySurfaceRows(surfaceFunctionMap.rows).length,
    pendingCount,
    mappedCount,
    readyForQueueCount,
    needsSplitCount,
    blockingFlagCount,
    capabilityCount: matrix.rows.length,
    latestRunLogSequence: latestRunLogSequence(runLogPath),
    nextLayer: pendingCount === 0 && mappedCount === 0 && blockingFlagCount === 0 && checkerPass && evalHandoffReady
      ? "Define Spec Jobs"
      : "Capability Map revision"
  };
}

function renderSection(state) {
  return `<section id="capability-map-v1-state" data-spec-section="capability-map-v1-state" data-section-type="handoff">
  <h2>Capability Map V1 State</h2>
  <table class="status-table">
    <tbody>
      <tr><td>Matrix</td><td><code>${state.registryPath}</code></td></tr>
      <tr><td>Ready upstream surfaces</td><td>${state.readySurfaceCount}</td></tr>
      <tr><td>Capability rows</td><td>${state.capabilityCount}</td></tr>
      <tr><td>Pending rows</td><td>${state.pendingCount}</td></tr>
      <tr><td>Mapped intermediate rows</td><td>${state.mappedCount}</td></tr>
      <tr><td>Ready-for-queue rows</td><td>${state.readyForQueueCount}</td></tr>
      <tr><td>Needs-split rows</td><td>${state.needsSplitCount}</td></tr>
      <tr><td>Blocking flags</td><td>${state.blockingFlagCount}</td></tr>
      <tr><td>Checker result</td><td>${state.checkerResult}</td></tr>
      <tr><td>Eval result</td><td>${state.evalResult}${state.evalScore === null ? "" : `, score ${state.evalScore}`}</td></tr>
      <tr><td>Eval revision targets</td><td>${state.evalRevisionTargetCount}</td></tr>
      <tr><td>Eval warnings</td><td>${state.evalWarningCount}</td></tr>
      <tr><td>Eval blocking findings</td><td>${state.evalBlockingFindingCount}</td></tr>
      <tr><td>Eval receipt</td><td><code>${state.evalReceiptPath}</code></td></tr>
      <tr><td>Summary</td><td><code>${state.summaryPath}</code></td></tr>
      <tr><td>Latest run-log sequence</td><td>${state.latestRunLogSequence ?? "not recorded"}</td></tr>
      <tr><td>Next layer</td><td>${state.nextLayer}</td></tr>
    </tbody>
  </table>
  <p>Define Spec Jobs may only consume this layer when the next layer is <code>Define Spec Jobs</code>; otherwise rows named by check/eval receipts must return to the Capability Map fill loop.</p>
</section>`;
}

function renderCapabilityRows(matrixPayload) {
  const rows = matrixPayload.capabilities.length === 0
    ? "<tr><td colspan=\"5\">No capability rows.</td></tr>"
    : matrixPayload.capabilities.map(row => `<tr><td><code>${row.id}</code></td><td>${row.name}</td><td>${row.actor}</td><td>${row.status}</td><td>${row.upstreamSurfaceIds.length}</td></tr>`).join("\n");
  return `<section id="capability-map-v1-table" data-spec-section="capability-map-v1-table" data-section-type="state">
  <h2>Capability Map Rows</h2>
  <table class="status-table">
    <thead><tr><th>ID</th><th>Name</th><th>Actor</th><th>Status</th><th>Surfaces</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function renderReport(state, matrixPayload) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Capability Map Report ${state.runId}</title>
<link rel="stylesheet" href="../spec-system.css">
<script type="application/json" id="backfill-capability-map-state">
${JSON.stringify(state, null, 2)}
</script>
<script type="application/json" id="backfill-capability-map">
${JSON.stringify(matrixPayload, null, 2)}
</script>
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/review-report-${state.runId}.html</div>
    <h1>Backfill Report ${state.runId}</h1>
    <p class="lede">Minimal report generated by the Foundation Capability Map V1 report integration.</p>
  </section>
  <article class="doc-body">
${renderSection(state)}
${renderCapabilityRows(matrixPayload)}
  </article>
</main>
</body>
</html>
`;
}

function upsertReportState(html, state, matrixPayload) {
  const stateScript = `<script type="application/json" id="backfill-capability-map-state">\n${JSON.stringify(state, null, 2)}\n</script>`;
  const matrixScript = `<script type="application/json" id="backfill-capability-map">\n${JSON.stringify(matrixPayload, null, 2)}\n</script>`;
  const section = `${renderSection(state)}\n${renderCapabilityRows(matrixPayload)}`;
  let nextHtml = html;
  if (/<script\b[^>]*id=["']backfill-capability-map-state["'][^>]*>[\s\S]*?<\/script>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<script\b[^>]*id=["']backfill-capability-map-state["'][^>]*>[\s\S]*?<\/script>/i, stateScript);
  } else {
    nextHtml = nextHtml.replace("</head>", `${stateScript}\n</head>`);
  }

  if (/<script\b[^>]*id=["']backfill-capability-map["'][^>]*>[\s\S]*?<\/script>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<script\b[^>]*id=["']backfill-capability-map["'][^>]*>[\s\S]*?<\/script>/i, matrixScript);
  } else {
    nextHtml = nextHtml.replace("</head>", `${matrixScript}\n</head>`);
  }

  if (/<section\b[^>]*id=["']capability-map-v1-state["'][^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id=["']capability-map-v1-table["'][^>]*>[\s\S]*?<\/section>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<section\b[^>]*id=["']capability-map-v1-state["'][^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id=["']capability-map-v1-table["'][^>]*>[\s\S]*?<\/section>/i, section);
  } else if (/<section\b[^>]*id=["']capability-map-v1-state["'][^>]*>[\s\S]*?<\/section>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<section\b[^>]*id=["']capability-map-v1-state["'][^>]*>[\s\S]*?<\/section>/i, section);
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
  let matrixRows = readJsonl(capabilityMapPathFor(repoRoot, runId, outDir)).rows;
  let matrixPayload = buildCapabilityMapPayload({ runId, repoRoot, capabilityRows: matrixRows });

  appendRunLogEvent(runLogPath, {
    runId,
    slice: null,
    phase: "handoff",
    event: "handoff",
    summary: `Capability Map handoff recorded with next layer ${state.nextLayer}.`,
    artifactsRead: [
      state.registryPath,
      state.checkerPath,
      state.evalReceiptPath
    ],
    artifactsChanged: [path.relative(repoRoot, reportPath)],
    commands: ["foundation:capability-map:report"],
    checks: [{ name: "capability-map-handoff", result: state.nextLayer === "Define Spec Jobs" ? "passed" : "needs-revision" }],
    result: state.nextLayer === "Define Spec Jobs"
      ? "Capability Map handoff gate passed."
      : "Capability Map handoff gate did not pass.",
    nextAction: state.nextLayer === "Define Spec Jobs"
      ? "Define Spec Jobs may consume Capability Map artifacts."
      : "Revise Capability Map rows named by checker or eval receipts."
  });
  state = buildState({ repoRoot, runId, outDir, runLogPath });
  matrixRows = readJsonl(capabilityMapPathFor(repoRoot, runId, outDir)).rows;
  matrixPayload = buildCapabilityMapPayload({ runId, repoRoot, capabilityRows: matrixRows });

  ensureDir(path.dirname(reportPath));
  const nextHtml = fs.existsSync(reportPath)
    ? upsertReportState(fs.readFileSync(reportPath, "utf8"), state, matrixPayload)
    : renderReport(state, matrixPayload);
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
