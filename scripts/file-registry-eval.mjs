#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendRunLogEvent,
  defaultBackfillDir,
  ensureDir,
  evalReceiptPathFor,
  evalSummaryPathFor,
  isBehaviorBearingRow,
  parseCliArgs,
  readJsonl,
  registryPathFor,
  summarizeResults,
  validateRegistry,
  writeJsonl
} from "./file-registry-core.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:file-registry:eval -- --repo /path/to/repo --run-id YYYYMMDD-NN [--sample all] [--mode bootstrap|strict] [--run-log path]

Writes canonical JSONL eval receipts and a derived HTML summary.`;
}

function clampScore(value, max) {
  return Math.max(0, Math.min(max, value));
}

function scoreRow(row) {
  const findings = [];
  const categoryScores = {
    classification: 15,
    roleAndResponsibilities: 20,
    behaviorBearingDetection: 15,
    relatedFileUsefulness: 10,
    largeFileHandling: 10,
    resumeAndReviewState: 10
  };

  if (row.status !== "mapped") {
    findings.push({ category: "resumeAndReviewState", severity: "blocking", message: "Row is not mapped." });
    categoryScores.resumeAndReviewState = 0;
  }
  if (row.kind === "unknown" || row.evidenceValue === "unknown" || row.domain === "unknown") {
    findings.push({ category: "classification", severity: "blocking", message: "Mapped row uses unknown classification." });
    categoryScores.classification = 0;
  }
  if (!row.role || row.role.length < 24) {
    findings.push({ category: "roleAndResponsibilities", severity: "warning", message: "Role is too short to guide downstream agents." });
    categoryScores.roleAndResponsibilities = clampScore(categoryScores.roleAndResponsibilities - 8, 20);
  }
  if (!Array.isArray(row.responsibilities) || row.responsibilities.length === 0) {
    findings.push({ category: "roleAndResponsibilities", severity: "blocking", message: "No responsibilities are recorded." });
    categoryScores.roleAndResponsibilities = 0;
  }
  if (isBehaviorBearingRow(row) && row.evidenceValue !== "behavior-bearing") {
    findings.push({ category: "behaviorBearingDetection", severity: "blocking", message: "Behavior-bearing kind is not marked behavior-bearing." });
    categoryScores.behaviorBearingDetection = 0;
  }
  if (["route", "service", "script", "component"].includes(row.kind) && (!Array.isArray(row.relatedFiles) || row.relatedFiles.length === 0) && (!Array.isArray(row.entryPoints) || row.entryPoints.length === 0)) {
    findings.push({ category: "relatedFileUsefulness", severity: "warning", message: "Navigational row has no related files or entry points." });
    categoryScores.relatedFileUsefulness = 7;
  }
  if (row.sizeBytes >= 12000 && isBehaviorBearingRow(row) && (!Array.isArray(row.responsibilities) || row.responsibilities.length < 2)) {
    findings.push({ category: "largeFileHandling", severity: "blocking", message: "Large behavior-bearing file lacks multiple responsibilities." });
    categoryScores.largeFileHandling = 0;
  }
  if (Array.isArray(row.reviewFlags) && row.reviewFlags.some(flag => flag.severity === "blocking")) {
    findings.push({ category: "resumeAndReviewState", severity: "blocking", message: "Blocking review flag remains." });
    categoryScores.resumeAndReviewState = 0;
  }

  const score = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  return {
    subjectRowId: row.fileId,
    path: row.path,
    categoryScores,
    score,
    findings,
    acceptabilityGate: {
      acceptable: findings.every(finding => finding.severity !== "blocking") && score >= 60,
      threshold: "No blocking findings for row-level receipt"
    }
  };
}

function selectSample(rows, sampleMode) {
  if (sampleMode === "all" || rows.length <= 100) return rows;
  const selected = new Map();
  for (const row of rows) {
    if (row.reviewFlags?.some(flag => flag.severity === "blocking")) selected.set(row.path, row);
    if (row.sizeBytes >= 12000) selected.set(row.path, row);
    if (row.entryPoints?.length > 0) selected.set(row.path, row);
    if (isBehaviorBearingRow(row)) selected.set(row.path, row);
  }
  for (const row of rows) {
    const key = `${row.kind}:${row.domain}:${row.evidenceValue}:${row.sourceStatus}`;
    if (![...selected.values()].some(existing => `${existing.kind}:${existing.domain}:${existing.evidenceValue}:${existing.sourceStatus}` === key)) {
      selected.set(row.path, row);
    }
  }
  return [...selected.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function aggregateScores(checkResults, rowReceipts) {
  const checkSummary = summarizeResults(checkResults);
  const allAcceptable = rowReceipts.every(receipt => receipt.acceptabilityGate.acceptable);
  const categoryScores = {
    completenessAndFreshness: checkSummary.fail === 0 ? 20 : 0,
    kindDomainEvidenceClassification: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.classification), 15),
    roleAndResponsibilities: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.roleAndResponsibilities), 20),
    behaviorBearingDetection: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.behaviorBearingDetection), 15),
    relatedFileUsefulness: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.relatedFileUsefulness), 10),
    largeFileHandling: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.largeFileHandling), 10),
    resumeAndReviewState: Math.min(...rowReceipts.map(receipt => receipt.categoryScores.resumeAndReviewState), 10)
  };
  const totalScore = Object.values(categoryScores).reduce((sum, value) => sum + value, 0);
  const normalizedMinimum = Math.min(
    categoryScores.completenessAndFreshness / 2,
    categoryScores.kindDomainEvidenceClassification / 1.5,
    categoryScores.roleAndResponsibilities / 2,
    categoryScores.behaviorBearingDetection / 1.5,
    categoryScores.relatedFileUsefulness,
    categoryScores.largeFileHandling,
    categoryScores.resumeAndReviewState
  );
  return {
    categoryScores,
    totalScore,
    normalizedMinimum,
    acceptable: checkSummary.fail === 0 && allAcceptable && totalScore >= 96 && normalizedMinimum >= 9
  };
}

function renderHtmlSummary({ runId, repoRoot, registryPath, receiptPath, summaryPath, sampleRows, aggregate, findings }) {
  const rows = Object.entries(aggregate.categoryScores)
    .map(([category, score]) => `<tr><td><code>${category}</code></td><td>${score}</td></tr>`)
    .join("\n");
  const findingRows = findings.length === 0
    ? "<tr><td colspan=\"3\">No eval findings.</td></tr>"
    : findings.map(finding => `<tr><td><code>${finding.path}</code></td><td>${finding.severity}</td><td>${finding.message}</td></tr>`).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Artifact Inventory Eval ${runId}</title>
<link rel="stylesheet" href="../spec-system.css">
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/${path.basename(summaryPath)}</div>
    <h1>Artifact Inventory Eval ${runId}</h1>
    <p class="lede">Derived human summary for canonical JSONL Artifact Inventory eval receipts.</p>
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
    </ul>
  </section>
  <article class="doc-body">
    <section id="scores">
      <h2>Scores</h2>
      <table class="status-table"><thead><tr><th>Category</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>
    </section>
    <section id="findings">
      <h2>Findings</h2>
      <table class="status-table"><thead><tr><th>Path</th><th>Severity</th><th>Finding</th></tr></thead><tbody>${findingRows}</tbody></table>
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
  const mode = options.mode || "bootstrap";
  const check = validateRegistry({ repoRoot, runId, outDir, phase: "handoff", mode });
  const parsed = readJsonl(registryPathFor(repoRoot, runId, outDir));
  if (parsed.errors.length > 0) throw new Error(`Registry JSONL has parse errors: ${JSON.stringify(parsed.errors)}`);

  const sampleRows = selectSample(parsed.rows, options.sample || "risk");
  const rowReceipts = sampleRows.map(scoreRow);
  const aggregate = aggregateScores(check.results, rowReceipts);
  const findings = rowReceipts.flatMap(receipt => receipt.findings.map(finding => ({ ...finding, path: receipt.path })));
  const receiptPath = evalReceiptPathFor(repoRoot, runId, outDir);
  const summaryPath = evalSummaryPathFor(repoRoot, runId, outDir);
  const summaryReceipt = {
    schema: "foundation.backfill.file-registry-eval.v1",
    receiptType: "summary",
    runId,
    sequence: 1,
    generatedAt: new Date().toISOString(),
    subjectRowId: null,
    samplePlan: {
      mode: options.sample || "risk",
      selectedRows: sampleRows.length,
      totalRows: parsed.rows.length,
      rule: parsed.rows.length <= 100 ? "all rows because repo has 100 or fewer files" : "risk-based plus deterministic strata"
    },
    sampleRows: sampleRows.map(row => row.path),
    categoryScores: aggregate.categoryScores,
    totalScore: aggregate.totalScore,
    findings,
    revisionTargets: [...new Set(findings.map(finding => finding.path))],
    acceptabilityGate: {
      acceptable: aggregate.acceptable,
      threshold: "total >= 96, every normalized category >= 9, deterministic check passes, no blocking row findings"
    },
    htmlSummaryPath: path.relative(repoRoot, summaryPath)
  };
  const receipts = [
    summaryReceipt,
    ...rowReceipts.map((receipt, index) => ({
      schema: "foundation.backfill.file-registry-eval.v1",
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
    registryPath: registryPathFor(repoRoot, runId, outDir),
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
    summary: `Artifact Inventory eval ${aggregate.acceptable ? "passed" : "failed"} with score ${aggregate.totalScore}.`,
    artifactsRead: [path.relative(repoRoot, registryPathFor(repoRoot, runId, outDir))],
    artifactsChanged: [path.relative(repoRoot, receiptPath), path.relative(repoRoot, summaryPath)],
    commands: ["foundation:file-registry:eval"],
    checks: [{ name: "file-registry-eval", result: aggregate.acceptable ? "passed" : "failed" }],
    result: aggregate.acceptable ? `Artifact Inventory eval passed with score ${aggregate.totalScore}.` : `Artifact Inventory eval failed with score ${aggregate.totalScore}.`,
    nextAction: aggregate.acceptable ? "Record handoff to Surface / Function Map." : "Revise inventory rows named in revisionTargets."
  });

  console.log(`Artifact Inventory eval\nScore: ${aggregate.totalScore}\nMinimum normalized category: ${aggregate.normalizedMinimum.toFixed(1)}\nAcceptable: ${aggregate.acceptable ? "yes" : "no"}\nReceipt: ${path.relative(repoRoot, receiptPath)}\nSummary: ${path.relative(repoRoot, summaryPath)}`);
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
