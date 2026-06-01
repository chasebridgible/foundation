#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  aggregateSurfaceEval,
  appendRunLogEvent,
  defaultBackfillDir,
  ensureDir,
  parseCliArgs,
  scoreSurfaceRow,
  selectSurfaceEvalSample,
  surfaceEvalReceiptPathFor,
  surfaceEvalSummaryPathFor,
  surfaceFunctionMapPathFor,
  validateSurfaceFunctionMap,
  writeJsonl
} from "./surface-function-map-core.mjs";
import { siteNavScriptTags } from "./html-nav-includes.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:surface-function-map:eval -- --repo /path/to/repo --run-id YYYYMMDD-NN [--sample all|risk] [--run-log path]

Writes canonical JSONL Surface / Function Map eval receipts and a derived HTML summary.`;
}

function renderHtmlSummary({ runId, repoRoot, registryPath, receiptPath, summaryPath, sampleRows, aggregate, findings }) {
  const scoreRows = Object.entries(aggregate.categoryScores)
    .map(([category, score]) => `<tr><td><code>${category}</code></td><td>${score}</td></tr>`)
    .join("\n");
  const findingRows = findings.length === 0
    ? "<tr><td colspan=\"4\">No eval findings.</td></tr>"
    : findings.map(finding => `<tr><td><code>${finding.subjectRowId}</code></td><td><code>${finding.path}</code></td><td>${finding.severity}</td><td>${finding.message}</td></tr>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Surface / Function Map Eval ${runId}</title>
<link rel="stylesheet" href="../spec-system.css">
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/${path.basename(summaryPath)}</div>
    <h1>Surface / Function Map Eval ${runId}</h1>
    <p class="lede">Derived human summary for canonical JSONL Surface / Function Map eval receipts.</p>
    <div class="meta-row">
      <div><strong>Run ID:</strong> ${runId}</div>
      <div><strong>Total score:</strong> ${aggregate.totalScore}</div>
      <div><strong>Minimum normalized category:</strong> ${aggregate.normalizedMinimum.toFixed(1)}</div>
      <div><strong>Acceptable:</strong> ${aggregate.acceptable ? "yes" : "no"}</div>
      <div><strong>Rows sampled:</strong> ${sampleRows.length}</div>
    </div>
    <ul>
      <li><strong>Artifact Inventory:</strong> <code>${path.relative(repoRoot, registryPath)}</code></li>
      <li><strong>Canonical receipt:</strong> <code>${path.relative(repoRoot, receiptPath)}</code></li>
      <li><strong>Calibration note:</strong> Sandia Oil is calibration evidence, not a gold benchmark unless human-authored expected surface rows are added.</li>
    </ul>
  </section>
  <article class="doc-body">
    <section id="scores">
      <h2>Scores</h2>
      <table class="status-table"><thead><tr><th>Category</th><th>Score</th></tr></thead><tbody>${scoreRows}</tbody></table>
    </section>
    <section id="findings">
      <h2>Findings</h2>
      <table class="status-table"><thead><tr><th>Surface</th><th>Path</th><th>Severity</th><th>Finding</th></tr></thead><tbody>${findingRows}</tbody></table>
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
  const check = validateSurfaceFunctionMap({ repoRoot, runId, outDir, phase: "handoff" });
  const fileById = new Map(check.fileRows.map(row => [row.fileId, row]));
  const sampleRows = selectSurfaceEvalSample(check.surfaceRows, options.sample || "risk");
  const rowReceipts = sampleRows.map(row => scoreSurfaceRow(row, fileById));
  const aggregate = aggregateSurfaceEval(check.results, rowReceipts);
  const findings = rowReceipts.flatMap(receipt => receipt.findings.map(finding => ({
    ...finding,
    subjectRowId: receipt.subjectRowId,
    path: receipt.upstreamPaths?.[0] || ""
  })));
  const revisionTargets = [...new Set(findings.map(finding => finding.subjectRowId))];
  const receiptPath = surfaceEvalReceiptPathFor(repoRoot, runId, outDir);
  const summaryPath = surfaceEvalSummaryPathFor(repoRoot, runId, outDir);
  const summaryReceipt = {
    schema: "foundation.backfill.surface-function-map-eval.v1",
    receiptType: "summary",
    runId,
    sequence: 1,
    generatedAt: new Date().toISOString(),
    subjectRowId: null,
    samplePlan: {
      mode: options.sample || "risk",
      selectedRows: sampleRows.length,
      totalRows: check.surfaceRows.length,
      rule: check.surfaceRows.length <= 120 ? "all rows because registry has 120 or fewer surface rows" : "all non-support/risk rows plus deterministic surface kind strata"
    },
    sampleRows: sampleRows.map(row => row.surfaceId),
    categoryScores: aggregate.categoryScores,
    totalScore: aggregate.totalScore,
    findings,
    revisionTargets,
    acceptabilityGate: {
      acceptable: aggregate.acceptable,
      threshold: "total >= 96, every normalized category >= 9, deterministic check passes, no blocking row findings"
    },
    calibration: {
      target: "Sandia Oil",
      status: "calibration-not-gold",
      note: "This run catches tractable real-repo misses before larger repos; it becomes a hard fixture only after expected surface rows are human-authored."
    },
    htmlSummaryPath: path.relative(repoRoot, summaryPath)
  };
  const receipts = [
    summaryReceipt,
    ...rowReceipts.map((receipt, index) => ({
      schema: "foundation.backfill.surface-function-map-eval.v1",
      receiptType: "row",
      runId,
      sequence: index + 2,
      ...receipt,
      htmlSummaryPath: path.relative(repoRoot, summaryPath)
    }))
  ];
  writeJsonl(receiptPath, receipts);
  ensureDir(path.dirname(summaryPath));
  fs.writeFileSync(summaryPath, renderHtmlSummary({
    runId,
    repoRoot,
    registryPath: surfaceFunctionMapPathFor(repoRoot, runId, outDir),
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
    summary: `Surface / Function Map eval ${aggregate.acceptable ? "passed" : "failed"} with score ${aggregate.totalScore}.`,
    artifactsRead: [path.relative(repoRoot, surfaceFunctionMapPathFor(repoRoot, runId, outDir))],
    artifactsChanged: [path.relative(repoRoot, receiptPath), path.relative(repoRoot, summaryPath)],
    commands: ["foundation:surface-function-map:eval"],
    checks: [{ name: "surface-function-map-eval", result: aggregate.acceptable ? "passed" : "failed" }],
    result: aggregate.acceptable ? `Surface / Function Map eval passed with score ${aggregate.totalScore}.` : `Surface / Function Map eval failed with score ${aggregate.totalScore}.`,
    nextAction: revisionTargets.length > 0 ? "Revise Surface / Function Map rows named in revisionTargets before report handoff." : (aggregate.acceptable ? "Record handoff to Capability Map gate." : "Revise Surface / Function Map rows named in revisionTargets.")
  });

  console.log(`Surface / Function Map eval\nScore: ${aggregate.totalScore}\nMinimum normalized category: ${aggregate.normalizedMinimum.toFixed(1)}\nAcceptable: ${aggregate.acceptable ? "yes" : "no"}\nRevision targets: ${revisionTargets.length}\nReceipt: ${path.relative(repoRoot, receiptPath)}\nSummary: ${path.relative(repoRoot, summaryPath)}`);
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
