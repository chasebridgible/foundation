#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  buildProcessActionMapPayload,
  buildProcessActionMapReportState,
  defaultBackfillDir,
  ensureDir,
  parseCliArgs,
  processActionMapArtifactFingerprint,
  processActionMapCheckPathFor,
  readContextPackRows,
  readProcessActionMapRows,
  summarizeResults,
  validateProcessActionMap,
  writeJson
} from "./process-action-map-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:process-action-map:report -- --repo /path/to/repo --run-id YYYYMMDD-NN [--report docs/specs/backfill/review-report-YYYYMMDD-NN.html] [--run-log path]

Creates or updates a target backfill report with Process / Action Map handoff state and canonical Process / Action Map JSON.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSection(state) {
  return `<section id="process-action-map-v1-state" data-spec-section="process-action-map-v1-state" data-section-type="handoff">
  <h2>Process / Action Map V1 State</h2>
  <table class="status-table">
    <tbody>
      <tr><td>Process / Action Map</td><td><code>${escapeHtml(state.processMapPath)}</code></td></tr>
      <tr><td>Process map fingerprint</td><td><code>${escapeHtml(state.processMapFingerprint || "missing")}</code></td></tr>
      <tr><td>Context Packs</td><td>${state.packCount}</td></tr>
      <tr><td>Active Context Packs</td><td>${state.activePackCount}</td></tr>
      <tr><td>Process rows</td><td>${state.processRowCount}</td></tr>
      <tr><td>Pending rows</td><td>${state.pendingCount}</td></tr>
      <tr><td>Extracted rows</td><td>${state.extractedCount}</td></tr>
      <tr><td>Needs-evidence rows</td><td>${state.needsEvidenceCount}</td></tr>
      <tr><td>Blocked needs-evidence rows</td><td>${state.blockedNeedsEvidenceCount}</td></tr>
      <tr><td>Ready for Author Specs rows</td><td>${state.readyForSpecsCount}</td></tr>
      <tr><td>Current process row</td><td>${state.currentProcessMapId ? `<code>${escapeHtml(state.currentProcessMapId)}</code>` : "none"}</td></tr>
      <tr><td>Current pack</td><td>${state.currentPackId ? `<code>${escapeHtml(state.currentPackId)}</code>` : "none"}</td></tr>
      <tr><td>Current slice</td><td>${state.currentSliceId ? `<code>${escapeHtml(state.currentSliceId)}</code>` : "none"}</td></tr>
      <tr><td>Checker result</td><td>${escapeHtml(state.checkerResult)}</td></tr>
      <tr><td>Checker freshness</td><td>${state.checkProcessMapFresh ? "current" : "stale or missing"}</td></tr>
      <tr><td>Checker process map fingerprint</td><td><code>${escapeHtml(state.checkProcessMapFingerprint || "missing")}</code></td></tr>
      <tr><td>Eval result</td><td>${escapeHtml(state.evalResult)}${state.evalScore === null ? "" : `, score ${state.evalScore}`}</td></tr>
      <tr><td>Eval freshness</td><td>${state.evalProcessMapFresh ? "current" : "stale or missing"}</td></tr>
      <tr><td>Eval process map fingerprint</td><td><code>${escapeHtml(state.evalProcessMapFingerprint || "missing")}</code></td></tr>
      <tr><td>Eval revision targets</td><td>${state.evalRevisionTargetCount}</td></tr>
      <tr><td>Eval warnings</td><td>${state.evalWarningCount}</td></tr>
      <tr><td>Eval blocking findings</td><td>${state.evalBlockingFindingCount}</td></tr>
      <tr><td>Outstanding row receipts</td><td>${state.rowOutstandingCount}</td></tr>
      <tr><td>Rows missing outstanding receipts</td><td>${state.rowOutstandingMissingCount}</td></tr>
      <tr><td>Eval receipt</td><td><code>${escapeHtml(state.evalReceiptPath)}</code></td></tr>
      <tr><td>Summary</td><td><code>${escapeHtml(state.summaryPath)}</code></td></tr>
      <tr><td>Latest run-log sequence</td><td>${state.latestRunLogSequence ?? "not recorded"}</td></tr>
      <tr><td>Next layer</td><td>${escapeHtml(state.nextLayer)}</td></tr>
    </tbody>
  </table>
  <p>Author Specs may only consume this layer when the next layer is <code>Author Specs</code> and every non-pending row has a current outstanding row-level eval receipt; otherwise rows named by checker or eval receipts must return to the Process / Action Map fill loop.</p>
</section>`;
}

function renderProcessRows(payload) {
  const rows = payload.processes.length === 0
    ? "<tr><td colspan=\"8\">No Process / Action Map rows.</td></tr>"
    : payload.processes.map(row => `<tr><td><code>${escapeHtml(row.processMapId)}</code></td><td><code>${escapeHtml(row.upstreamPackId)}</code></td><td><code>${escapeHtml(row.upstreamSliceId)}</code></td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.confidence)}</td><td>${escapeHtml(row.actor || "")}</td><td>${row.actionCount}</td><td>${row.stateCount}</td></tr>`).join("\n");
  return `<section id="process-action-map-v1-table" data-spec-section="process-action-map-v1-table" data-section-type="state">
  <h2>Process / Action Map Rows</h2>
  <table class="status-table">
    <thead><tr><th>ID</th><th>Pack</th><th>Slice</th><th>Status</th><th>Confidence</th><th>Actor</th><th>Actions</th><th>States</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function renderReport(state, payload) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Process / Action Map Report ${escapeHtml(state.runId)}</title>
<link rel="stylesheet" href="../spec-system.css">
<script type="application/json" id="backfill-process-action-map-state">
${JSON.stringify(state, null, 2)}
</script>
<script type="application/json" id="backfill-process-action-map">
${JSON.stringify(payload, null, 2)}
</script>
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/review-report-${escapeHtml(state.runId)}.html</div>
    <h1>Backfill Report ${escapeHtml(state.runId)}</h1>
    <p class="lede">Minimal report generated by the Foundation Process / Action Map V1 report integration.</p>
  </section>
  <article class="doc-body">
${renderSection(state)}
${renderProcessRows(payload)}
  </article>
</main>
</body>
</html>
`;
}

function upsertReportState(html, state, payload) {
  const stateScript = `<script type="application/json" id="backfill-process-action-map-state">\n${JSON.stringify(state, null, 2)}\n</script>`;
  const payloadScript = `<script type="application/json" id="backfill-process-action-map">\n${JSON.stringify(payload, null, 2)}\n</script>`;
  const section = `${renderSection(state)}\n${renderProcessRows(payload)}`;
  let nextHtml = html;
  for (const [id, script] of [
    ["backfill-process-action-map-state", stateScript],
    ["backfill-process-action-map", payloadScript]
  ]) {
    const pattern = new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`, "i");
    if (pattern.test(nextHtml)) {
      nextHtml = nextHtml.replace(pattern, script);
    } else {
      nextHtml = nextHtml.replace("</head>", `${script}\n</head>`);
    }
  }
  if (/<section\b[^>]*id=["']process-action-map-v1-state["'][^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id=["']process-action-map-v1-table["'][^>]*>[\s\S]*?<\/section>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<section\b[^>]*id=["']process-action-map-v1-state["'][^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id=["']process-action-map-v1-table["'][^>]*>[\s\S]*?<\/section>/i, section);
  } else if (/<section\b[^>]*id=["']process-action-map-v1-state["'][^>]*>[\s\S]*?<\/section>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<section\b[^>]*id=["']process-action-map-v1-state["'][^>]*>[\s\S]*?<\/section>/i, section);
  } else if (/<article\b[^>]*class=["']doc-body["'][^>]*>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<article\b([^>]*)class=["']doc-body["']([^>]*)>/i, match => `${match}\n${section}`);
  } else {
    nextHtml = nextHtml.replace("</main>", `${section}\n</main>`);
  }
  return nextHtml;
}

function writeReportFile({ reportPath, state, payload }) {
  ensureDir(path.dirname(reportPath));
  const nextHtml = fs.existsSync(reportPath)
    ? upsertReportState(fs.readFileSync(reportPath, "utf8"), state, payload)
    : renderReport(state, payload);
  fs.writeFileSync(reportPath, nextHtml, "utf8");
}

function writeCurrentCheckArtifact({ repoRoot, runId, outDir, reportPath }) {
  const check = validateProcessActionMap({ repoRoot, runId, outDir, phase: "handoff", reportPath });
  const summary = summarizeResults(check.results);
  const checkPath = processActionMapCheckPathFor(repoRoot, runId, outDir);
  writeJson(checkPath, {
    schema: "foundation.backfill.process-action-map-check.v1",
    runId,
    phase: "handoff",
    generatedAt: new Date().toISOString(),
    packPath: path.relative(repoRoot, check.packPath || ""),
    processMapPath: path.relative(repoRoot, check.processMapPath),
    processMapFingerprint: processActionMapArtifactFingerprint(repoRoot, runId, outDir),
    reportPath: path.relative(repoRoot, reportPath),
    summary,
    results: check.results
  });
  return { checkPath, summary };
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
  const packRows = readContextPackRows(repoRoot, runId, outDir).rows;
  const processRows = readProcessActionMapRows(repoRoot, runId, outDir).rows;
  let state = buildProcessActionMapReportState({ repoRoot, runId, outDir, packRows, processRows, runLogPath });
  let payload = buildProcessActionMapPayload({ runId, repoRoot, processRows });

  appendRunLogEvent(runLogPath, {
    runId,
    slice: state.currentSliceId,
    phase: "handoff",
    event: "handoff",
    summary: `Process / Action Map handoff recorded with next layer ${state.nextLayer}.`,
    artifactsRead: [
      state.processMapPath,
      state.checkerPath,
      state.evalReceiptPath
    ],
    artifactsChanged: [path.relative(repoRoot, reportPath)],
    commands: ["foundation:process-action-map:report"],
    checks: [{ name: "process-action-map-handoff", result: state.nextLayer === "Author Specs" ? "passed" : "needs-revision" }],
    result: state.nextLayer === "Author Specs"
      ? "Process / Action Map handoff gate passed."
      : "Process / Action Map handoff gate did not pass.",
    nextAction: state.nextLayer === "Author Specs"
      ? "Author Specs may consume Process / Action Map artifacts."
      : "Revise Process / Action Map rows named by checker or eval receipts."
  });
  state = buildProcessActionMapReportState({ repoRoot, runId, outDir, packRows, processRows, runLogPath });
  payload = buildProcessActionMapPayload({ runId, repoRoot, processRows });

  writeReportFile({ reportPath, state, payload });
  writeCurrentCheckArtifact({ repoRoot, runId, outDir, reportPath });
  state = buildProcessActionMapReportState({ repoRoot, runId, outDir, packRows, processRows, runLogPath });
  payload = buildProcessActionMapPayload({ runId, repoRoot, processRows });
  writeReportFile({ reportPath, state, payload });
  writeCurrentCheckArtifact({ repoRoot, runId, outDir, reportPath });

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
