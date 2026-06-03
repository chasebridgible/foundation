#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUTHOR_EVAL_SCHEMA,
  aggregateAuthorSpecsEval,
  appendRunLogEvent,
  authorSpecRowFingerprint,
  authorSpecRowOutstandingState,
  authorSpecsArtifactFingerprint,
  authorSpecsCheckPathFor,
  authorSpecsEvalReceiptPathFor,
  authorSpecsPathFor,
  authorSpecsSummaryPathFor,
  defaultBackfillDir,
  ensureDir,
  parseCliArgs,
  parseIds,
  readAuthorSpecsEvalRows,
  readJson,
  scoreAuthorSpecRow,
  selectAuthorSpecsEvalSample,
  summarizeResults,
  validateAuthorSpecs,
  writeJsonl
} from "./author-specs-core.mjs";
import { readProcessActionMapRows } from "./process-action-map-core.mjs";
import { siteNavScriptTags } from "./html-nav-includes.mjs";

const scriptPath = fileURLToPath(import.meta.url);

function usage() {
  return `Usage:
  npm run foundation:author-specs:eval -- --repo /path/to/repo --run-id YYYYMMDD-NN --process-map-id pam:a [--run-log path]
  npm run foundation:author-specs:eval -- --repo /path/to/repo --run-id YYYYMMDD-NN --author-spec-id as:a [--run-log path]
  npm run foundation:author-specs:eval -- --repo /path/to/repo --run-id YYYYMMDD-NN [--sample all|risk] [--run-log path]

Writes canonical JSONL Author Specs eval receipts and a derived HTML summary. Eval requires a current passing Author Specs check artifact for the same Author Specs fingerprint. A row-targeted eval revises exactly one current row receipt; handoff requires every non-pending row to have a current outstanding row receipt.`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function singleTarget(options) {
  const candidates = [
    { type: "process", option: "process-map-id", value: options["process-map-id"] ?? options["process-map-ids"] },
    { type: "author", option: "author-spec-id", value: options["author-spec-id"] ?? options["author-spec-ids"] }
  ].filter(candidate => candidate.value !== undefined && candidate.value !== true);
  if (candidates.length === 0) return null;
  if (candidates.length > 1) {
    throw new Error("Author Specs eval accepts exactly one row target: --process-map-id or --author-spec-id");
  }
  const ids = parseIds(candidates[0].value);
  if (ids.length !== 1) {
    throw new Error(`Author Specs eval ${candidates[0].option} requires exactly one ID`);
  }
  return { type: candidates[0].type, id: ids[0], option: candidates[0].option };
}

function rowMatchesTarget(row, target) {
  if (!target) return true;
  if (target.type === "process") return row.upstreamProcessMapId === target.id;
  return row.authorSpecId === target.id;
}

function describeTarget(target) {
  if (!target) return "handoff";
  if (target.type === "process") return `process row ${target.id}`;
  return `Author Specs row ${target.id}`;
}

function currentExistingRowReceipts({ existingRows, authorRows }) {
  const authorById = new Map(authorRows.map(row => [row.authorSpecId, row]));
  const receiptsById = new Map();
  for (const receipt of Array.isArray(existingRows) ? existingRows : []) {
    if (receipt?.receiptType !== "row" || !receipt.subjectRowId) continue;
    const row = authorById.get(receipt.subjectRowId);
    if (!row) continue;
    if (receipt.authorRowFingerprint !== authorSpecRowFingerprint(row)) continue;
    receiptsById.set(receipt.subjectRowId, receipt);
  }
  return receiptsById;
}

function combineCurrentRowReceipts({ authorRows, existingRows, newReceipts }) {
  const combinedById = currentExistingRowReceipts({ existingRows, authorRows });
  for (const receipt of newReceipts) combinedById.set(receipt.subjectRowId, receipt);
  return authorRows.map(row => combinedById.get(row.authorSpecId)).filter(Boolean);
}

function canonicalRowReceipt({ receipt, runId, sequence, authorSpecsFingerprint, repoRoot, summaryPath }) {
  return {
    ...receipt,
    schema: AUTHOR_EVAL_SCHEMA,
    receiptType: "row",
    runId,
    sequence,
    authorSpecsFingerprint,
    htmlSummaryPath: path.relative(repoRoot, summaryPath)
  };
}

function currentCheckGate({ repoRoot, runId, outDir, authorSpecsFingerprint }) {
  const checkPath = authorSpecsCheckPathFor(repoRoot, runId, outDir);
  if (!fs.existsSync(checkPath)) {
    return { ok: false, checkPath, reason: "check artifact is missing" };
  }
  const check = readJson(checkPath);
  if (check?.authorSpecsFingerprint !== authorSpecsFingerprint) {
    return {
      ok: false,
      checkPath,
      reason: "check artifact is stale for the current Author Specs fingerprint",
      actual: check?.authorSpecsFingerprint || null,
      expected: authorSpecsFingerprint
    };
  }
  if (check?.summary?.fail !== 0) {
    return { ok: false, checkPath, reason: "check artifact has failures", summary: check?.summary || null };
  }
  return { ok: true, checkPath, check };
}

function renderHtmlSummary({
  runId,
  repoRoot,
  authorSpecsPath,
  authorSpecsFingerprint,
  receiptPath,
  summaryPath,
  targetDescription,
  selectedRows,
  canonicalRowReceipts,
  rowOutstandingState,
  aggregate,
  findings
}) {
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
<title>Author Specs Eval ${escapeHtml(runId)}</title>
<link rel="stylesheet" href="../spec-system.css">
</head>
<body>
<main class="main">
  <section id="summary">
    <div class="spec-eyebrow">docs/specs/backfill/${escapeHtml(path.basename(summaryPath))}</div>
    <h1>Author Specs Eval ${escapeHtml(runId)}</h1>
    <p class="lede">Derived human summary for canonical JSONL Author Specs eval receipts.</p>
    <div class="meta-row">
      <div><strong>Run ID:</strong> ${escapeHtml(runId)}</div>
      <div><strong>Target:</strong> ${escapeHtml(targetDescription)}</div>
      <div><strong>Total score:</strong> ${aggregate.totalScore}</div>
      <div><strong>Minimum normalized category:</strong> ${aggregate.normalizedMinimum.toFixed(1)}</div>
      <div><strong>Outstanding:</strong> ${aggregate.outstanding && rowOutstandingState.missing.length === 0 && findings.every(finding => finding.severity === "info") ? "yes" : "no"}</div>
      <div><strong>Rows evaluated this run:</strong> ${selectedRows.length}</div>
      <div><strong>Current row receipts:</strong> ${canonicalRowReceipts.length}</div>
      <div><strong>Missing outstanding rows:</strong> ${rowOutstandingState.missing.length}</div>
    </div>
    <ul>
      <li><strong>Author Specs:</strong> <code>${escapeHtml(path.relative(repoRoot, authorSpecsPath))}</code></li>
      <li><strong>Author Specs fingerprint:</strong> <code>${escapeHtml(authorSpecsFingerprint)}</code></li>
      <li><strong>Canonical receipt:</strong> <code>${escapeHtml(path.relative(repoRoot, receiptPath))}</code></li>
      <li><strong>Gate note:</strong> every non-pending row needs a current outstanding row receipt; warnings and missing row receipts are revision targets.</li>
    </ul>
  </section>
  <article class="doc-body">
    <section id="scores">
      <h2>Scores</h2>
      <table class="status-table"><thead><tr><th>Category</th><th>Score</th></tr></thead><tbody>${scoreRows}</tbody></table>
    </section>
    <section id="findings">
      <h2>Findings</h2>
      <table class="status-table"><thead><tr><th>Author row</th><th>Slice</th><th>Severity</th><th>Category</th><th>Finding</th></tr></thead><tbody>${findingRows}</tbody></table>
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

  const target = singleTarget(options);
  const repoRoot = path.resolve(options.repo);
  const runId = options["run-id"];
  const outDir = options["out-dir"] ? path.resolve(repoRoot, options["out-dir"]) : defaultBackfillDir(repoRoot);
  const phase = target ? "batch" : "handoff";
  const check = validateAuthorSpecs({ repoRoot, runId, outDir, phase, skipEvalFreshness: true });
  const checkSummary = summarizeResults(check.results);
  const processRows = readProcessActionMapRows(repoRoot, runId, outDir).rows;
  const processById = new Map(processRows.map(row => [row.processMapId, row]));
  const selectedRows = target
    ? check.authorRows.filter(row => rowMatchesTarget(row, target))
    : selectAuthorSpecsEvalSample(check.authorRows, options.sample || "risk");
  if (target && selectedRows.length !== 1) {
    throw new Error(`Author Specs eval target did not resolve to exactly one current row: ${describeTarget(target)}`);
  }

  const existingEval = readAuthorSpecsEvalRows(repoRoot, runId, outDir);
  if (existingEval.errors.length > 0) throw new Error(`Author Specs eval JSONL has parse errors: ${JSON.stringify(existingEval.errors)}`);
  const newRowReceipts = selectedRows.map(row => scoreAuthorSpecRow(row, processById, repoRoot));
  const combinedRowReceipts = combineCurrentRowReceipts({
    authorRows: check.authorRows,
    existingRows: existingEval.rows,
    newReceipts: newRowReceipts
  });
  const authorSpecsPath = authorSpecsPathFor(repoRoot, runId, outDir);
  const authorSpecsFingerprint = authorSpecsArtifactFingerprint(repoRoot, runId, outDir);
  const currentCheck = currentCheckGate({ repoRoot, runId, outDir, authorSpecsFingerprint });
  if (!currentCheck.ok) {
    throw new Error(`${target ? "Row-targeted" : "Handoff"} Author Specs eval requires a current passing Author Specs check after the latest fill; ${currentCheck.reason}`);
  }
  const receiptPath = authorSpecsEvalReceiptPathFor(repoRoot, runId, outDir);
  const summaryPath = authorSpecsSummaryPathFor(repoRoot, runId, outDir);
  const canonicalRowReceipts = combinedRowReceipts.map((receipt, index) => canonicalRowReceipt({
    receipt,
    runId,
    sequence: index + 2,
    authorSpecsFingerprint,
    repoRoot,
    summaryPath
  }));
  const rowOutstandingState = authorSpecRowOutstandingState(check.authorRows, canonicalRowReceipts);
  const aggregate = aggregateAuthorSpecsEval(check.results, canonicalRowReceipts);
  const rowFindings = canonicalRowReceipts.flatMap(receipt => (receipt.findings || []).map(finding => ({
    ...finding,
    subjectRowId: receipt.subjectRowId,
    upstreamSliceId: receipt.upstreamSliceId
  })));
  const missingOutstandingFindings = rowOutstandingState.missing.map(authorSpecId => {
    const row = check.authorRows.find(candidate => candidate.authorSpecId === authorSpecId);
    return {
      subjectRowId: authorSpecId,
      upstreamSliceId: row?.upstreamSliceId || null,
      severity: "warning",
      category: "rowOutstandingCoverage",
      message: "Current Author Specs row lacks an outstanding row-level eval receipt."
    };
  });
  const findings = [...rowFindings, ...missingOutstandingFindings];
  const revisionTargets = [...new Set(findings
    .filter(finding => finding.severity !== "info")
    .map(finding => finding.subjectRowId)
    .filter(Boolean))];
  const outstanding = aggregate.outstanding &&
    rowOutstandingState.missing.length === 0 &&
    revisionTargets.length === 0;
  const selectedRowIds = new Set(selectedRows.map(row => row.authorSpecId));
  const selectedOutstanding = selectedRows.length > 0 &&
    checkSummary.fail === 0 &&
    canonicalRowReceipts
      .filter(receipt => selectedRowIds.has(receipt.subjectRowId))
      .every(receipt => receipt.acceptabilityGate?.outstanding === true);
  const summaryReceipt = {
    schema: AUTHOR_EVAL_SCHEMA,
    receiptType: "summary",
    runId,
    sequence: 1,
    generatedAt: new Date().toISOString(),
    subjectRowId: null,
    target: target ? { type: target.type, id: target.id } : null,
    samplePlan: {
      mode: target ? "row" : (options.sample || "risk"),
      selectedRows: selectedRows.length,
      totalRows: check.authorRows.length,
      currentRowReceipts: canonicalRowReceipts.length,
      outstandingRows: rowOutstandingState.outstanding.length,
      missingOutstandingRows: rowOutstandingState.missing.length,
      rule: target
        ? "exactly one row selected by Author Specs ID or upstream Process / Action Map ID"
        : (check.authorRows.length <= 120 ? "all rows because Author Specs has 120 or fewer rows" : "all risk rows plus deterministic status/rendered-UX/upstream strata")
    },
    sampleRows: selectedRows.map(row => row.authorSpecId),
    rowOutstandingMissing: rowOutstandingState.missing,
    authorSpecsPath: path.relative(repoRoot, authorSpecsPath),
    authorSpecsFingerprint,
    authorRowCount: check.authorRows.length,
    categoryScores: aggregate.categoryScores,
    totalScore: aggregate.totalScore,
    normalizedMinimum: aggregate.normalizedMinimum,
    findings,
    revisionTargets,
    acceptabilityGate: {
      acceptable: outstanding,
      outstanding,
      threshold: "Outstanding requires deterministic check pass, current outstanding row receipt for every non-pending row, score 100, no blocking findings, no warnings, and zero revision targets"
    },
    htmlSummaryPath: path.relative(repoRoot, summaryPath)
  };
  const receipts = [summaryReceipt, ...canonicalRowReceipts];
  writeJsonl(receiptPath, receipts);
  ensureDir(path.dirname(summaryPath));
  fs.writeFileSync(summaryPath, renderHtmlSummary({
    runId,
    repoRoot,
    authorSpecsPath,
    authorSpecsFingerprint,
    receiptPath,
    summaryPath,
    targetDescription: describeTarget(target),
    selectedRows,
    canonicalRowReceipts,
    rowOutstandingState,
    aggregate,
    findings
  }), "utf8");

  const commandPassed = target ? selectedOutstanding : outstanding;
  appendRunLogEvent(options["run-log"] ? path.resolve(repoRoot, options["run-log"]) : null, {
    runId,
    slice: target?.type === "process" ? target.id : null,
    phase: "evaluation",
    event: "evaluation",
    summary: target
      ? `Author Specs row eval for ${describeTarget(target)} ${selectedOutstanding ? "passed" : "failed"}.`
      : `Author Specs handoff eval ${outstanding ? "passed" : "failed"} with score ${aggregate.totalScore}.`,
    artifactsRead: [path.relative(repoRoot, authorSpecsPath)],
    artifactsChanged: [path.relative(repoRoot, receiptPath), path.relative(repoRoot, summaryPath)],
    commands: ["foundation:author-specs:eval"],
    checks: [{ name: "author-specs-eval", result: commandPassed ? "passed" : "failed" }],
    result: commandPassed
      ? `Author Specs eval passed for ${describeTarget(target)}.`
      : `Author Specs eval failed for ${describeTarget(target)}.`,
    nextAction: revisionTargets.length > 0
      ? "Revise Author Specs rows named in revisionTargets before selecting another row or recording handoff."
      : (outstanding ? "Record handoff to Slice Evaluation gate." : "Continue row-targeted evals until every current row is outstanding.")
  });

  console.log(`Author Specs eval
Target: ${describeTarget(target)}
Score: ${aggregate.totalScore}
Minimum normalized category: ${aggregate.normalizedMinimum.toFixed(1)}
Outstanding: ${outstanding ? "yes" : "no"}
Selected row outstanding: ${target ? (selectedOutstanding ? "yes" : "no") : "n/a"}
Revision targets: ${revisionTargets.length}
Missing outstanding rows: ${rowOutstandingState.missing.length}
Receipt: ${path.relative(repoRoot, receiptPath)}
Summary: ${path.relative(repoRoot, summaryPath)}`);
  if (!commandPassed) process.exit(1);
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
