#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  authorSpecsArtifactFingerprint,
  authorSpecsCheckPathFor,
  buildAuthorSpecsPayload,
  buildAuthorSpecsReportState,
  defaultBackfillDir,
  ensureDir,
  parseCliArgs,
  readAuthorSpecsRows,
  summarizeResults,
  validateAuthorSpecs,
  writeJson
} from "./author-specs-core.mjs";
import { readProcessActionMapRows } from "./process-action-map-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:author-specs:report -- --repo /path/to/repo --run-id YYYYMMDD-NN [--report docs/specs/backfill/review-report-YYYYMMDD-NN.html] [--run-log path]

Creates or updates a target backfill report with Author Specs handoff state and canonical Author Specs JSON.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSection(state) {
  return `<section id="author-specs-v1-state" data-spec-section="author-specs-v1-state" data-section-type="handoff">
  <h2>Author Specs V1 State</h2>
  <table class="status-table">
    <tbody>
      <tr><td>Author Specs</td><td><code>${escapeHtml(state.authorSpecsPath)}</code></td></tr>
      <tr><td>Author Specs fingerprint</td><td><code>${escapeHtml(state.authorSpecsFingerprint || "missing")}</code></td></tr>
      <tr><td>Process rows</td><td>${state.processRowCount}</td></tr>
      <tr><td>Active process rows</td><td>${state.activeProcessCount}</td></tr>
      <tr><td>Author rows</td><td>${state.authorRowCount}</td></tr>
      <tr><td>Pending rows</td><td>${state.pendingCount}</td></tr>
      <tr><td>Authored rows</td><td>${state.authoredCount}</td></tr>
      <tr><td>Needs-revision rows</td><td>${state.needsRevisionCount}</td></tr>
      <tr><td>Ready for Slice Evaluation rows</td><td>${state.readyForSliceEvalCount}</td></tr>
      <tr><td>Blocked rows</td><td>${state.blockedCount}</td></tr>
      <tr><td>Current author row</td><td>${state.currentAuthorSpecId ? `<code>${escapeHtml(state.currentAuthorSpecId)}</code>` : "none"}</td></tr>
      <tr><td>Current process row</td><td>${state.currentProcessMapId ? `<code>${escapeHtml(state.currentProcessMapId)}</code>` : "none"}</td></tr>
      <tr><td>Current slice</td><td>${state.currentSliceId ? `<code>${escapeHtml(state.currentSliceId)}</code>` : "none"}</td></tr>
      <tr><td>Checker result</td><td>${escapeHtml(state.checkerResult)}</td></tr>
      <tr><td>Checker freshness</td><td>${state.checkAuthorSpecsFresh ? "current" : "stale or missing"}</td></tr>
      <tr><td>Checker Author Specs fingerprint</td><td><code>${escapeHtml(state.checkAuthorSpecsFingerprint || "missing")}</code></td></tr>
      <tr><td>Eval result</td><td>${escapeHtml(state.evalResult)}${state.evalScore === null ? "" : `, score ${state.evalScore}`}</td></tr>
      <tr><td>Eval freshness</td><td>${state.evalAuthorSpecsFresh ? "current" : "stale or missing"}</td></tr>
      <tr><td>Eval Author Specs fingerprint</td><td><code>${escapeHtml(state.evalAuthorSpecsFingerprint || "missing")}</code></td></tr>
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
  <p>Slice Evaluation may only consume this layer when the next layer is <code>Evaluate Job Slices</code> and every non-pending Author Specs row has a current outstanding row-level eval receipt; otherwise rows named by checker or eval receipts must return to the Author Specs fill loop.</p>
</section>`;
}

function renderAuthorRows(payload) {
  const rows = payload.authorSpecs.length === 0
    ? "<tr><td colspan=\"8\">No Author Specs rows.</td></tr>"
    : payload.authorSpecs.map(row => `<tr><td><code>${escapeHtml(row.authorSpecId)}</code></td><td><code>${escapeHtml(row.upstreamProcessMapId)}</code></td><td><code>${escapeHtml(row.upstreamSliceId)}</code></td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.confidence)}</td><td><code>${escapeHtml(row.jobSpecId || "")}</code></td><td><code>${escapeHtml(row.technicalSpecId || "")}</code></td><td>${row.renderedUxRequired ? "yes" : "no"}</td></tr>`).join("\n");
  return `<section id="author-specs-v1-table" data-spec-section="author-specs-v1-table" data-section-type="state">
  <h2>Author Specs Rows</h2>
  <table class="status-table">
    <thead><tr><th>ID</th><th>Process row</th><th>Slice</th><th>Status</th><th>Confidence</th><th>Job spec</th><th>Technical spec</th><th>Rendered UX</th></tr></thead>
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
<title>Author Specs Report ${escapeHtml(state.runId)}</title>
<link rel="stylesheet" href="../spec-system.css">
<script type="application/json" id="backfill-author-specs-state">
${JSON.stringify(state, null, 2)}
</script>
<script type="application/json" id="backfill-author-specs">
${JSON.stringify(payload, null, 2)}
</script>
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/review-report-${escapeHtml(state.runId)}.html</div>
    <h1>Backfill Report ${escapeHtml(state.runId)}</h1>
    <p class="lede">Minimal report generated by the Foundation Author Specs V1 report integration.</p>
  </section>
  <article class="doc-body">
${renderSection(state)}
${renderAuthorRows(payload)}
  </article>
</main>
</body>
</html>
`;
}

function upsertReportState(html, state, payload) {
  const stateScript = `<script type="application/json" id="backfill-author-specs-state">\n${JSON.stringify(state, null, 2)}\n</script>`;
  const payloadScript = `<script type="application/json" id="backfill-author-specs">\n${JSON.stringify(payload, null, 2)}\n</script>`;
  const section = `${renderSection(state)}\n${renderAuthorRows(payload)}`;
  let nextHtml = html;
  for (const [id, script] of [
    ["backfill-author-specs-state", stateScript],
    ["backfill-author-specs", payloadScript]
  ]) {
    const pattern = new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`, "i");
    if (pattern.test(nextHtml)) {
      nextHtml = nextHtml.replace(pattern, script);
    } else {
      nextHtml = nextHtml.replace("</head>", `${script}\n</head>`);
    }
  }
  if (/<section\b[^>]*id=["']author-specs-v1-state["'][^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id=["']author-specs-v1-table["'][^>]*>[\s\S]*?<\/section>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<section\b[^>]*id=["']author-specs-v1-state["'][^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id=["']author-specs-v1-table["'][^>]*>[\s\S]*?<\/section>/i, section);
  } else if (/<section\b[^>]*id=["']author-specs-v1-state["'][^>]*>[\s\S]*?<\/section>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<section\b[^>]*id=["']author-specs-v1-state["'][^>]*>[\s\S]*?<\/section>/i, section);
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
  const check = validateAuthorSpecs({ repoRoot, runId, outDir, phase: "handoff", reportPath });
  const summary = summarizeResults(check.results);
  const checkPath = authorSpecsCheckPathFor(repoRoot, runId, outDir);
  writeJson(checkPath, {
    schema: "foundation.backfill.author-specs-check.v1",
    runId,
    phase: "handoff",
    generatedAt: new Date().toISOString(),
    processMapPath: path.relative(repoRoot, check.processMapPath || ""),
    authorSpecsPath: path.relative(repoRoot, check.authorSpecsPath),
    authorSpecsFingerprint: authorSpecsArtifactFingerprint(repoRoot, runId, outDir),
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
  const processRows = readProcessActionMapRows(repoRoot, runId, outDir).rows;
  const authorRows = readAuthorSpecsRows(repoRoot, runId, outDir).rows;
  let state = buildAuthorSpecsReportState({ repoRoot, runId, outDir, processRows, authorRows, runLogPath });
  let payload = buildAuthorSpecsPayload({ runId, repoRoot, authorRows });

  appendRunLogEvent(runLogPath, {
    runId,
    slice: state.currentSliceId,
    phase: "handoff",
    event: "handoff",
    summary: `Author Specs handoff recorded with next layer ${state.nextLayer}.`,
    artifactsRead: [
      state.authorSpecsPath,
      state.checkerPath,
      state.evalReceiptPath
    ],
    artifactsChanged: [path.relative(repoRoot, reportPath)],
    commands: ["foundation:author-specs:report"],
    checks: [{ name: "author-specs-handoff", result: state.nextLayer === "Evaluate Job Slices" ? "passed" : "needs-revision" }],
    result: state.nextLayer === "Evaluate Job Slices"
      ? "Author Specs handoff gate passed."
      : "Author Specs handoff gate did not pass.",
    nextAction: state.nextLayer === "Evaluate Job Slices"
      ? "Slice Evaluation may consume Author Specs artifacts."
      : "Revise Author Specs rows named by checker or eval receipts."
  });
  state = buildAuthorSpecsReportState({ repoRoot, runId, outDir, processRows, authorRows, runLogPath });
  payload = buildAuthorSpecsPayload({ runId, repoRoot, authorRows });

  writeReportFile({ reportPath, state, payload });
  writeCurrentCheckArtifact({ repoRoot, runId, outDir, reportPath });
  state = buildAuthorSpecsReportState({ repoRoot, runId, outDir, processRows, authorRows, runLogPath });
  payload = buildAuthorSpecsPayload({ runId, repoRoot, authorRows });
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
