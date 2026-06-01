#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  aggregateContextPackEval,
  appendRunLogEvent,
  defaultBackfillDir,
  ensureDir,
  contextPackArtifactFingerprint,
  contextPackEvalReceiptPathFor,
  contextPackPathFor,
  contextPackSummaryPathFor,
  parseCliArgs,
  scoreContextPackRow,
  selectContextPackEvalSample,
  validateContextPack,
  writeJsonl
} from "./context-pack-core.mjs";
import { siteNavScriptTags } from "./html-nav-includes.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:context-pack:eval -- --repo /path/to/repo --run-id YYYYMMDD-NN [--sample all|risk] [--run-log path]

Writes canonical JSONL Context Pack eval receipts and a derived HTML summary.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtmlSummary({ runId, repoRoot, packPath, packFingerprint, receiptPath, summaryPath, sampleRows, aggregate, findings }) {
  const scoreRows = Object.entries(aggregate.categoryScores)
    .map(([category, score]) => `<tr><td><code>${escapeHtml(category)}</code></td><td>${score}</td></tr>`)
    .join("\n");
  const findingRows = findings.length === 0
    ? "<tr><td colspan=\"5\">No eval findings.</td></tr>"
    : findings.map(finding => `<tr><td><code>${escapeHtml(finding.subjectRowId)}</code></td><td><code>${escapeHtml(finding.upstreamSliceId || "")}</code></td><td>${escapeHtml(finding.severity)}</td><td><code>${escapeHtml(finding.category)}</code></td><td>${escapeHtml(finding.message)}</td></tr>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Context Pack Eval ${escapeHtml(runId)}</title>
<link rel="stylesheet" href="../spec-system.css">
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/${escapeHtml(path.basename(summaryPath))}</div>
    <h1>Context Pack Eval ${escapeHtml(runId)}</h1>
    <p class="lede">Derived human summary for canonical JSONL Context Pack eval receipts.</p>
    <div class="meta-row">
      <div><strong>Run ID:</strong> ${escapeHtml(runId)}</div>
      <div><strong>Total score:</strong> ${aggregate.totalScore}</div>
      <div><strong>Minimum normalized category:</strong> ${aggregate.normalizedMinimum.toFixed(1)}</div>
      <div><strong>Acceptable:</strong> ${aggregate.acceptable ? "yes" : "no"}</div>
      <div><strong>Rows sampled:</strong> ${sampleRows.length}</div>
    </div>
    <ul>
      <li><strong>Context Pack:</strong> <code>${escapeHtml(path.relative(repoRoot, packPath))}</code></li>
      <li><strong>Pack fingerprint:</strong> <code>${escapeHtml(packFingerprint)}</code></li>
      <li><strong>Canonical receipt:</strong> <code>${escapeHtml(path.relative(repoRoot, receiptPath))}</code></li>
      <li><strong>Gate note:</strong> warnings produce revision targets; the report may hand off only after all revision targets are resolved.</li>
    </ul>
  </section>
  <article class="doc-body">
    <section id="scores">
      <h2>Scores</h2>
      <table class="status-table"><thead><tr><th>Category</th><th>Score</th></tr></thead><tbody>${scoreRows}</tbody></table>
    </section>
    <section id="findings">
      <h2>Findings</h2>
      <table class="status-table"><thead><tr><th>Pack</th><th>Slice</th><th>Severity</th><th>Category</th><th>Finding</th></tr></thead><tbody>${findingRows}</tbody></table>
    </section>
  </article>
</main>
${siteNavScriptTags({ repoRoot, htmlPath: summaryPath })}
</body>
</html>
`;
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
  const check = validateContextPack({ repoRoot, runId, outDir, phase: "handoff", skipEvalFreshness: true });
  const queueById = new Map(check.queueRows.map(row => [row.sliceId, row]));
  const sampleRows = selectContextPackEvalSample(check.packRows, options.sample || "risk");
  const rowReceipts = sampleRows.map(row => scoreContextPackRow(row, queueById));
  const aggregate = aggregateContextPackEval(check.results, rowReceipts);
  const findings = rowReceipts.flatMap(receipt => receipt.findings.map(finding => ({
    ...finding,
    subjectRowId: receipt.subjectRowId,
    upstreamSliceId: receipt.upstreamSliceId
  })));
  const revisionTargets = [...new Set(findings
    .filter(finding => finding.severity !== "info")
    .map(finding => finding.subjectRowId))];
  const packPath = contextPackPathFor(repoRoot, runId, outDir);
  const packFingerprint = contextPackArtifactFingerprint(repoRoot, runId, outDir);
  const receiptPath = contextPackEvalReceiptPathFor(repoRoot, runId, outDir);
  const summaryPath = contextPackSummaryPathFor(repoRoot, runId, outDir);
  const summaryReceipt = {
    schema: "foundation.backfill.context-pack-eval.v1",
    receiptType: "summary",
    runId,
    sequence: 1,
    generatedAt: new Date().toISOString(),
    subjectRowId: null,
    samplePlan: {
      mode: options.sample || "risk",
      selectedRows: sampleRows.length,
      totalRows: check.packRows.length,
      rule: check.packRows.length <= 120 ? "all rows because pack has 120 or fewer rows" : "all risk rows plus deterministic status/category strata"
    },
    sampleRows: sampleRows.map(row => row.packId),
    packPath: path.relative(repoRoot, packPath),
    packFingerprint,
    packRowCount: check.packRows.length,
    categoryScores: aggregate.categoryScores,
    totalScore: aggregate.totalScore,
    findings,
    revisionTargets,
    acceptabilityGate: {
      acceptable: aggregate.acceptable,
      threshold: "total >= 96, every normalized category >= 9, deterministic check passes, no blocking row findings, and all eval warnings resolved before report handoff"
    },
    htmlSummaryPath: path.relative(repoRoot, summaryPath)
  };
  const receipts = [
    summaryReceipt,
    ...rowReceipts.map((receipt, index) => ({
      schema: "foundation.backfill.context-pack-eval.v1",
      receiptType: "row",
      runId,
      sequence: index + 2,
      packFingerprint,
      ...receipt,
      htmlSummaryPath: path.relative(repoRoot, summaryPath)
    }))
  ];
  writeJsonl(receiptPath, receipts);
  ensureDir(path.dirname(summaryPath));
  fs.writeFileSync(summaryPath, renderHtmlSummary({
    runId,
    repoRoot,
    packPath,
    packFingerprint,
    receiptPath,
    summaryPath,
    sampleRows,
    aggregate,
    findings
  }), "utf8");

  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: null,
    phase: "evaluation",
    event: "evaluation",
    summary: `Context Pack eval ${aggregate.acceptable ? "passed" : "failed"} with score ${aggregate.totalScore}.`,
    artifactsRead: [path.relative(repoRoot, packPath)],
    artifactsChanged: [path.relative(repoRoot, receiptPath), path.relative(repoRoot, summaryPath)],
    commands: ["foundation:context-pack:eval"],
    checks: [{ name: "context-pack-eval", result: aggregate.acceptable ? "passed" : "failed" }],
    result: aggregate.acceptable ? `Context Pack eval passed with score ${aggregate.totalScore}.` : `Context Pack eval failed with score ${aggregate.totalScore}.`,
    nextAction: revisionTargets.length > 0 ? "Revise Context Pack rows named in revisionTargets before report handoff." : (aggregate.acceptable ? "Record handoff to Process / Action Map gate." : "Revise Context Pack rows named in revisionTargets.")
  });

  console.log(`Context Pack eval
Score: ${aggregate.totalScore}
Minimum normalized category: ${aggregate.normalizedMinimum.toFixed(1)}
Acceptable: ${aggregate.acceptable ? "yes" : "no"}
Revision targets: ${revisionTargets.length}
Receipt: ${path.relative(repoRoot, receiptPath)}
Summary: ${path.relative(repoRoot, summaryPath)}`);
  if (!aggregate.acceptable) process.exit(1);
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
