#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  buildContextPackPayload,
  buildContextPackReportState,
  defaultBackfillDir,
  ensureDir,
  parseCliArgs,
  readContextPackRows,
  readArtifactInventoryRows
} from "./context-pack-core.mjs";
import {
  readCapabilityMapRows,
  readSurfaceFunctionMapRows
} from "./capability-map-core.mjs";
import {
  readJsonl,
  specJobQueuePathFor
} from "./spec-job-queue-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:context-pack:report -- --repo /path/to/repo --run-id YYYYMMDD-NN [--report docs/specs/backfill/review-report-YYYYMMDD-NN.html] [--run-log path]

Creates or updates a target backfill report with Context Pack handoff state and canonical Context Pack JSON.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSection(state) {
  return `<section id="context-pack-v1-state" data-spec-section="context-pack-v1-state" data-section-type="handoff">
  <h2>Context Pack V1 State</h2>
  <table class="status-table">
    <tbody>
      <tr><td>Context Pack</td><td><code>${escapeHtml(state.packPath)}</code></td></tr>
      <tr><td>Pack fingerprint</td><td><code>${escapeHtml(state.packFingerprint || "missing")}</code></td></tr>
      <tr><td>Queue slices</td><td>${state.queueSliceCount}</td></tr>
      <tr><td>Active queue slices</td><td>${state.activeSliceCount}</td></tr>
      <tr><td>Context Packs</td><td>${state.packCount}</td></tr>
      <tr><td>Pending packs</td><td>${state.pendingCount}</td></tr>
      <tr><td>Packed rows</td><td>${state.packedCount}</td></tr>
      <tr><td>Needs-evidence rows</td><td>${state.needsEvidenceCount}</td></tr>
      <tr><td>Blocked needs-evidence rows</td><td>${state.blockedNeedsEvidenceCount}</td></tr>
      <tr><td>Ready for Process / Action Map rows</td><td>${state.readyForProcessMapCount}</td></tr>
      <tr><td>Current pack</td><td>${state.currentPackId ? `<code>${escapeHtml(state.currentPackId)}</code>` : "none"}</td></tr>
      <tr><td>Current slice</td><td>${state.currentSliceId ? `<code>${escapeHtml(state.currentSliceId)}</code>` : "none"}</td></tr>
      <tr><td>Checker result</td><td>${escapeHtml(state.checkerResult)}</td></tr>
      <tr><td>Checker pack freshness</td><td>${state.checkPackFresh ? "current" : "stale or missing"}</td></tr>
      <tr><td>Checker pack fingerprint</td><td><code>${escapeHtml(state.checkPackFingerprint || "missing")}</code></td></tr>
      <tr><td>Eval result</td><td>${escapeHtml(state.evalResult)}${state.evalScore === null ? "" : `, score ${state.evalScore}`}</td></tr>
      <tr><td>Eval pack freshness</td><td>${state.evalPackFresh ? "current" : "stale or missing"}</td></tr>
      <tr><td>Eval pack fingerprint</td><td><code>${escapeHtml(state.evalPackFingerprint || "missing")}</code></td></tr>
      <tr><td>Eval revision targets</td><td>${state.evalRevisionTargetCount}</td></tr>
      <tr><td>Eval warnings</td><td>${state.evalWarningCount}</td></tr>
      <tr><td>Eval blocking findings</td><td>${state.evalBlockingFindingCount}</td></tr>
      <tr><td>Eval receipt</td><td><code>${escapeHtml(state.evalReceiptPath)}</code></td></tr>
      <tr><td>Summary</td><td><code>${escapeHtml(state.summaryPath)}</code></td></tr>
      <tr><td>Latest run-log sequence</td><td>${state.latestRunLogSequence ?? "not recorded"}</td></tr>
      <tr><td>Next layer</td><td>${escapeHtml(state.nextLayer)}</td></tr>
    </tbody>
  </table>
  <p>Process / Action Map may only consume this layer when the next layer is <code>Process / Action Map</code>; otherwise rows named by checker or eval receipts must return to the Context Pack fill loop.</p>
</section>`;
}

function renderPackRows(payload) {
  const rows = payload.packs.length === 0
    ? "<tr><td colspan=\"7\">No Context Pack rows.</td></tr>"
    : payload.packs.map(row => `<tr><td><code>${escapeHtml(row.packId)}</code></td><td><code>${escapeHtml(row.upstreamSliceId)}</code></td><td>${escapeHtml(row.status)}</td><td>${escapeHtml(row.confidence)}</td><td>${row.evidenceRefCount}</td><td>${row.sourceEvidenceCount}</td><td>${row.verificationEvidenceCount}</td></tr>`).join("\n");
  return `<section id="context-pack-v1-table" data-spec-section="context-pack-v1-table" data-section-type="state">
  <h2>Context Pack Rows</h2>
  <table class="status-table">
    <thead><tr><th>ID</th><th>Slice</th><th>Status</th><th>Confidence</th><th>Refs</th><th>Source refs</th><th>Verification refs</th></tr></thead>
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
<title>Context Pack Report ${escapeHtml(state.runId)}</title>
<link rel="stylesheet" href="../spec-system.css">
<script type="application/json" id="backfill-context-pack-state">
${JSON.stringify(state, null, 2)}
</script>
<script type="application/json" id="backfill-context-pack">
${JSON.stringify(payload, null, 2)}
</script>
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/review-report-${escapeHtml(state.runId)}.html</div>
    <h1>Backfill Report ${escapeHtml(state.runId)}</h1>
    <p class="lede">Minimal report generated by the Foundation Context Pack V1 report integration.</p>
  </section>
  <article class="doc-body">
${renderSection(state)}
${renderPackRows(payload)}
  </article>
</main>
</body>
</html>
`;
}

function upsertReportState(html, state, payload) {
  const stateScript = `<script type="application/json" id="backfill-context-pack-state">\n${JSON.stringify(state, null, 2)}\n</script>`;
  const packScript = `<script type="application/json" id="backfill-context-pack">\n${JSON.stringify(payload, null, 2)}\n</script>`;
  const section = `${renderSection(state)}\n${renderPackRows(payload)}`;
  let nextHtml = html;
  for (const [id, script] of [
    ["backfill-context-pack-state", stateScript],
    ["backfill-context-pack", packScript]
  ]) {
    const pattern = new RegExp(`<script\\b[^>]*id=["']${id}["'][^>]*>[\\s\\S]*?<\\/script>`, "i");
    if (pattern.test(nextHtml)) {
      nextHtml = nextHtml.replace(pattern, script);
    } else {
      nextHtml = nextHtml.replace("</head>", `${script}\n</head>`);
    }
  }

  if (/<section\b[^>]*id=["']context-pack-v1-state["'][^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id=["']context-pack-v1-table["'][^>]*>[\s\S]*?<\/section>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<section\b[^>]*id=["']context-pack-v1-state["'][^>]*>[\s\S]*?<\/section>\s*<section\b[^>]*id=["']context-pack-v1-table["'][^>]*>[\s\S]*?<\/section>/i, section);
  } else if (/<section\b[^>]*id=["']context-pack-v1-state["'][^>]*>[\s\S]*?<\/section>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<section\b[^>]*id=["']context-pack-v1-state["'][^>]*>[\s\S]*?<\/section>/i, section);
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
  const queueRows = readJsonl(specJobQueuePathFor(repoRoot, runId, outDir)).rows;
  const capabilityRows = readCapabilityMapRows(repoRoot, runId, outDir).rows;
  const surfaceRows = readSurfaceFunctionMapRows(repoRoot, runId, outDir).rows;
  const fileRows = readArtifactInventoryRows(repoRoot, runId, outDir).rows;
  const packRows = readContextPackRows(repoRoot, runId, outDir).rows;
  let state = buildContextPackReportState({ repoRoot, runId, outDir, queueRows, capabilityRows, surfaceRows, fileRows, packRows, runLogPath });
  let payload = buildContextPackPayload({ runId, repoRoot, packRows });

  appendRunLogEvent(runLogPath, {
    runId,
    slice: state.currentSliceId,
    phase: "handoff",
    event: "handoff",
    summary: `Context Pack handoff recorded with next layer ${state.nextLayer}.`,
    artifactsRead: [
      state.packPath,
      state.checkerPath,
      state.evalReceiptPath
    ],
    artifactsChanged: [path.relative(repoRoot, reportPath)],
    commands: ["foundation:context-pack:report"],
    checks: [{ name: "context-pack-handoff", result: state.nextLayer === "Process / Action Map" ? "passed" : "needs-revision" }],
    result: state.nextLayer === "Process / Action Map"
      ? "Context Pack handoff gate passed."
      : "Context Pack handoff gate did not pass.",
    nextAction: state.nextLayer === "Process / Action Map"
      ? "Process / Action Map may consume Context Pack artifacts."
      : "Revise Context Pack rows named by checker or eval receipts."
  });
  state = buildContextPackReportState({ repoRoot, runId, outDir, queueRows, capabilityRows, surfaceRows, fileRows, packRows, runLogPath });
  payload = buildContextPackPayload({ runId, repoRoot, packRows });

  ensureDir(path.dirname(reportPath));
  const nextHtml = fs.existsSync(reportPath)
    ? upsertReportState(fs.readFileSync(reportPath, "utf8"), state, payload)
    : renderReport(state, payload);
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
