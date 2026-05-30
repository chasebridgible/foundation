#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  aggregateSpecJobQueueEval,
  appendRunLogEvent,
  defaultBackfillDir,
  ensureDir,
  parseCliArgs,
  scoreSpecJobQueueRow,
  selectSpecJobQueueEvalSample,
  siblingRowsByCapabilityId,
  specJobQueueArtifactFingerprint,
  specJobQueueEvalReceiptPathFor,
  specJobQueuePathFor,
  specJobQueueSummaryPathFor,
  validateSpecJobQueue,
  writeJsonl
} from "./spec-job-queue-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:spec-job-queue:eval -- --repo /path/to/repo --run-id YYYYMMDD-NN [--sample all|risk] [--run-log path]

Writes canonical JSONL Define Spec Jobs eval receipts and a derived HTML summary.`;
}

function renderHtmlSummary({ runId, repoRoot, queuePath, queueFingerprint, receiptPath, summaryPath, sampleRows, aggregate, findings }) {
  const scoreRows = Object.entries(aggregate.categoryScores)
    .map(([category, score]) => `<tr><td><code>${category}</code></td><td>${score}</td></tr>`)
    .join("\n");
  const findingRows = findings.length === 0
    ? "<tr><td colspan=\"4\">No eval findings.</td></tr>"
    : findings.map(finding => `<tr><td><code>${finding.subjectRowId}</code></td><td>${finding.severity}</td><td><code>${finding.category}</code></td><td>${finding.message}</td></tr>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Define Spec Jobs Eval ${runId}</title>
<link rel="stylesheet" href="../spec-system.css">
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/${path.basename(summaryPath)}</div>
    <h1>Define Spec Jobs Eval ${runId}</h1>
    <p class="lede">Derived human summary for canonical JSONL Define Spec Jobs eval receipts.</p>
    <div class="meta-row">
      <div><strong>Run ID:</strong> ${runId}</div>
      <div><strong>Total score:</strong> ${aggregate.totalScore}</div>
      <div><strong>Minimum normalized category:</strong> ${aggregate.normalizedMinimum.toFixed(1)}</div>
      <div><strong>Acceptable:</strong> ${aggregate.acceptable ? "yes" : "no"}</div>
      <div><strong>Rows sampled:</strong> ${sampleRows.length}</div>
    </div>
    <ul>
      <li><strong>Queue:</strong> <code>${path.relative(repoRoot, queuePath)}</code></li>
      <li><strong>Queue fingerprint:</strong> <code>${queueFingerprint}</code></li>
      <li><strong>Canonical receipt:</strong> <code>${path.relative(repoRoot, receiptPath)}</code></li>
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
      <table class="status-table"><thead><tr><th>Slice</th><th>Severity</th><th>Category</th><th>Finding</th></tr></thead><tbody>${findingRows}</tbody></table>
    </section>
  </article>
</main>
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
  const check = validateSpecJobQueue({ repoRoot, runId, outDir, phase: "handoff", skipEvalFreshness: true });
  const capabilityById = new Map(check.capabilityRows.map(row => [row.capabilityId, row]));
  const siblings = siblingRowsByCapabilityId(check.queueRows);
  const sampleRows = selectSpecJobQueueEvalSample(check.queueRows, options.sample || "risk");
  const rowReceipts = sampleRows.map(row => scoreSpecJobQueueRow(row, capabilityById, siblings));
  const aggregate = aggregateSpecJobQueueEval(check.results, rowReceipts);
  const findings = rowReceipts.flatMap(receipt => receipt.findings.map(finding => ({
    ...finding,
    subjectRowId: receipt.subjectRowId
  })));
  const revisionTargets = [...new Set(findings.map(finding => finding.subjectRowId))];
  const queuePath = specJobQueuePathFor(repoRoot, runId, outDir);
  const queueFingerprint = specJobQueueArtifactFingerprint(repoRoot, runId, outDir);
  const receiptPath = specJobQueueEvalReceiptPathFor(repoRoot, runId, outDir);
  const summaryPath = specJobQueueSummaryPathFor(repoRoot, runId, outDir);
  const summaryReceipt = {
    schema: "foundation.backfill.spec-job-queue-eval.v1",
    receiptType: "summary",
    runId,
    sequence: 1,
    generatedAt: new Date().toISOString(),
    subjectRowId: null,
    samplePlan: {
      mode: options.sample || "risk",
      selectedRows: sampleRows.length,
      totalRows: check.queueRows.length,
      rule: check.queueRows.length <= 120 ? "all rows because queue has 120 or fewer slices" : "all risk rows plus deterministic owner/status/upstream strata"
    },
    sampleRows: sampleRows.map(row => row.sliceId),
    queuePath: path.relative(repoRoot, queuePath),
    queueFingerprint,
    queueRowCount: check.queueRows.length,
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
      schema: "foundation.backfill.spec-job-queue-eval.v1",
      receiptType: "row",
      runId,
      sequence: index + 2,
      queueFingerprint,
      ...receipt,
      htmlSummaryPath: path.relative(repoRoot, summaryPath)
    }))
  ];
  writeJsonl(receiptPath, receipts);
  ensureDir(path.dirname(summaryPath));
  fs.writeFileSync(summaryPath, renderHtmlSummary({
    runId,
    repoRoot,
    queuePath,
    queueFingerprint,
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
    summary: `Define Spec Jobs eval ${aggregate.acceptable ? "passed" : "failed"} with score ${aggregate.totalScore}.`,
    artifactsRead: [path.relative(repoRoot, specJobQueuePathFor(repoRoot, runId, outDir))],
    artifactsChanged: [path.relative(repoRoot, receiptPath), path.relative(repoRoot, summaryPath)],
    commands: ["foundation:spec-job-queue:eval"],
    checks: [{ name: "spec-job-queue-eval", result: aggregate.acceptable ? "passed" : "failed" }],
    result: aggregate.acceptable ? `Define Spec Jobs eval passed with score ${aggregate.totalScore}.` : `Define Spec Jobs eval failed with score ${aggregate.totalScore}.`,
    nextAction: revisionTargets.length > 0 ? "Revise Define Spec Jobs rows named in revisionTargets before report handoff." : (aggregate.acceptable ? "Record handoff to Context Pack gate." : "Revise Define Spec Jobs rows named in revisionTargets.")
  });

  console.log(`Define Spec Jobs eval
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
