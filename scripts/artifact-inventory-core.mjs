#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const VALID_STATUSES = new Set(["pending", "mapped"]);
const VALID_KINDS = new Set([
  "route",
  "component",
  "service",
  "model",
  "migration",
  "test",
  "doc",
  "config",
  "infra",
  "script",
  "asset",
  "fixture",
  "generated",
  "package",
  "unknown"
]);
const VALID_EVIDENCE_VALUES = new Set([
  "behavior-bearing",
  "support",
  "test-evidence",
  "documentation-evidence",
  "configuration",
  "asset",
  "generated",
  "unknown"
]);
const VALID_CONFIDENCE = new Set(["low", "medium", "high"]);
const VALID_REVIEW_FLAG_SEVERITY = new Set(["info", "warning", "blocking"]);
const VALID_SPEC_LINK_RELATIONSHIPS = new Set([
  "implements",
  "documents",
  "configures",
  "verifies",
  "supports",
  "generated-by"
]);

const TEXT_EXTENSIONS = new Set([
  ".css",
  ".csv",
  ".env",
  ".example",
  ".gitignore",
  ".hcl",
  ".html",
  ".js",
  ".json",
  ".jsonl",
  ".md",
  ".mjs",
  ".py",
  ".rtf",
  ".service",
  ".sh",
  ".sh.tftpl",
  ".sql",
  ".tf",
  ".ts",
  ".tsx",
  ".txt",
  ".yml",
  ".yaml",
  "(none)",
  "Dockerfile"
]);

const WALK_EXCLUDED_DIRS = new Set([
  ".cache",
  ".expo",
  ".git",
  ".gradle",
  ".mypy_cache",
  ".next",
  ".parcel-cache",
  ".pytest_cache",
  ".ruff_cache",
  ".serverless",
  ".terraform",
  ".turbo",
  ".venv",
  "__pycache__",
  "build",
  "cdk.out",
  "coverage",
  "DerivedData",
  "dist",
  "node_modules",
  "Pods",
  "target",
  "venv"
]);
let gitBlobTextReadsDisabled = false;

const ASSET_EXTENSIONS = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".mov",
  ".mp4",
  ".pdf",
  ".png",
  ".svg",
  ".webp"
]);

function normalizeRepoPath(value) {
  return value.split(path.sep).join("/");
}

function repoName(repoRoot) {
  return path.basename(path.resolve(repoRoot));
}

function nowIso() {
  return new Date().toISOString();
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return `sha256:${hash.digest("hex")}`;
}

function stableFileId(filePath) {
  return `file:${sha256Text(filePath).slice(0, 24)}`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function defaultBackfillDir(repoRoot) {
  return path.join(repoRoot, "docs", "specs", "backfill");
}

function currentRunArtifactPaths(runId) {
  return new Set([
    `docs/specs/backfill/file-manifest-${runId}.json`,
    `docs/specs/backfill/artifact-inventory-${runId}.jsonl`,
    `docs/specs/backfill/artifact-inventory-check-${runId}.json`,
    `docs/specs/backfill/artifact-inventory-eval-${runId}.jsonl`,
    `docs/specs/backfill/artifact-inventory-eval-summary-${runId}.html`,
    `docs/specs/backfill/artifact-inventory-refresh-${runId}.json`,
    `docs/specs/backfill/artifact-inventory-handoff-${runId}.html`,
    `docs/specs/backfill/review-report-${runId}.html`,
    `docs/specs/backfill/run-log-${runId}.jsonl`
  ]);
}

function manifestPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `file-manifest-${runId}.json`);
}

function registryPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `artifact-inventory-${runId}.jsonl`);
}

function checkPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `artifact-inventory-check-${runId}.json`);
}

function evalReceiptPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `artifact-inventory-eval-${runId}.jsonl`);
}

function evalSummaryPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `artifact-inventory-eval-summary-${runId}.html`);
}

function refreshPathFor(repoRoot, runId, outDir = defaultBackfillDir(repoRoot)) {
  return path.join(outDir, `artifact-inventory-refresh-${runId}.json`);
}

function gitNullEntries(repoRoot, args, { timeoutMs = 0 } = {}) {
  const output = execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: timeoutMs
  });
  return output.split("\0").map(entry => normalizeRepoPath(entry)).filter(Boolean);
}

function gitIgnoredSet(repoRoot, filePaths) {
  if (filePaths.length === 0) return new Set();
  const result = spawnSync("git", ["-C", repoRoot, "check-ignore", "-z", "--stdin"], {
    input: `${filePaths.join("\0")}\0`,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.error || result.status === 128) return new Set();
  return new Set((result.stdout || "").split("\0").map(entry => normalizeRepoPath(entry)).filter(Boolean));
}

function fallbackUntrackedFiles(repoRoot, trackedPaths, runId) {
  const candidates = [];
  const excluded = currentRunArtifactPaths(runId);

  function walk(relativeDir = "") {
    const absoluteDir = path.join(repoRoot, relativeDir);
    let entries = [];
    try {
      entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const relativePath = normalizeRepoPath(path.join(relativeDir, entry.name));
      if (entry.isDirectory()) {
        if (!WALK_EXCLUDED_DIRS.has(entry.name)) walk(relativePath);
        continue;
      }
      if (!entry.isFile() && !entry.isSymbolicLink()) continue;
      if (trackedPaths.has(relativePath) || excluded.has(relativePath)) continue;
      candidates.push(relativePath);
    }
  }

  walk();
  const ignored = gitIgnoredSet(repoRoot, candidates);
  return candidates.filter(filePath => !ignored.has(filePath)).sort((left, right) => left.localeCompare(right));
}

function gitIndexStatMap(repoRoot) {
  let output = "";
  try {
    output = execFileSync("git", ["-C", repoRoot, "ls-files", "--debug"], {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024
    });
  } catch {
    return new Map();
  }
  const stats = new Map();
  let current = null;
  for (const line of output.split(/\r?\n/)) {
    if (!line) continue;
    if (!line.startsWith(" ")) {
      current = normalizeRepoPath(line);
      stats.set(current, {});
      continue;
    }
    if (!current) continue;
    const mtime = line.match(/^\s+mtime:\s+(\d+):(\d+)/);
    if (mtime) {
      stats.get(current).mtimeSeconds = Number(mtime[1]);
      stats.get(current).mtimeNanoseconds = Number(mtime[2]);
      continue;
    }
    const size = line.match(/^\s+size:\s+(\d+)/);
    if (size) stats.get(current).sizeBytes = Number(size[1]);
  }
  return stats;
}

function gitIndexBlobMap(repoRoot) {
  let output = "";
  try {
    output = execFileSync("git", ["-C", repoRoot, "ls-files", "-s", "-z"], {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024
    });
  } catch {
    return new Map();
  }
  const blobs = new Map();
  for (const entry of output.split("\0").filter(Boolean)) {
    const tabIndex = entry.indexOf("\t");
    if (tabIndex < 0) continue;
    const meta = entry.slice(0, tabIndex).split(/\s+/);
    const filePath = normalizeRepoPath(entry.slice(tabIndex + 1));
    const blobSha = meta[1];
    if (blobSha) blobs.set(filePath, blobSha);
  }
  return blobs;
}

function indexStatMatches(stat, indexStat) {
  if (!indexStat || typeof indexStat.sizeBytes !== "number" || typeof indexStat.mtimeSeconds !== "number") return false;
  const indexMtimeNs = (BigInt(indexStat.mtimeSeconds) * 1000000000n) + BigInt(indexStat.mtimeNanoseconds || 0);
  return stat.size === BigInt(indexStat.sizeBytes) && stat.mtimeNs === indexMtimeNs;
}

function canUseGitBlobIdentity(filePath, stat, indexStat) {
  if (!indexStat || typeof indexStat.sizeBytes !== "number") return false;
  if (stat.size !== BigInt(indexStat.sizeBytes)) return false;
  if (indexStatMatches(stat, indexStat)) return true;
  const extension = detectExtension(filePath);
  return !TEXT_EXTENSIONS.has(extension) || stat.size > 512000n;
}

function fileMetadata(repoRoot, file, indexStatMap = new Map(), blobMap = new Map()) {
  const absolutePath = path.join(repoRoot, file.path);
  const stat = fs.lstatSync(absolutePath, { bigint: true });
  const sizeBytes = Number(stat.size);
  const blobSha = blobMap.get(file.path);
  if (stat.isSymbolicLink()) {
    return {
      sizeBytes,
      contentHash: blobSha ? `gitblob:${blobSha}` : `sha256:${sha256Text(fs.readlinkSync(absolutePath))}`
    };
  }
  if (file.sourceStatus === "tracked" && blobSha && canUseGitBlobIdentity(file.path, stat, indexStatMap.get(file.path))) {
    return {
      sizeBytes,
      contentHash: `gitblob:${blobSha}`
    };
  }
  return {
    sizeBytes,
    contentHash: sha256File(absolutePath)
  };
}

function detectExtension(filePath) {
  const base = path.basename(filePath);
  if (base === "Dockerfile" || base.endsWith(".Dockerfile")) return "Dockerfile";
  if (filePath.endsWith(".sh.tftpl")) return ".sh.tftpl";
  const ext = path.extname(base);
  return ext || "(none)";
}

function detectLanguage(filePath, extension) {
  const base = path.basename(filePath);
  const lower = filePath.toLowerCase();
  if (extension === "Dockerfile") return "Dockerfile";
  if (base === ".gitignore" || extension === ".gitignore") return "Git ignore";
  if (extension === ".example") return "Example config";
  if (extension === ".css") return "CSS";
  if (extension === ".hcl") return "HCL";
  if (extension === ".html") return "HTML";
  if (extension === ".ico") return "Icon";
  if (extension === ".jpg" || extension === ".jpeg") return "JPEG image";
  if (extension === ".json") return "JSON";
  if (extension === ".jsonl") return "JSONL";
  if (extension === ".md") return "Markdown";
  if (extension === ".mjs" || extension === ".js") return "JavaScript";
  if (extension === ".py") return "Python";
  if (extension === ".rtf") return "RTF";
  if (extension === ".service") return "Systemd service";
  if (extension === ".sh") return "Shell";
  if (extension === ".sh.tftpl") return "Shell template";
  if (extension === ".sql") return "SQL";
  if (extension === ".tf") return "Terraform HCL";
  if (extension === ".ts") return "TypeScript";
  if (extension === ".tsx") return "TypeScript JSX";
  if (extension === ".txt") return "Text";
  if (extension === ".webp") return "WebP image";
  if (extension === ".yml" || extension === ".yaml") return "YAML";
  if (lower.includes("readme") || lower.includes("license")) return "Text";
  return "Unknown";
}

function sourceStatusLabel(status) {
  if (status === "tracked") return "tracked";
  if (status === "explicit-include") return "explicit-include";
  return "untracked-non-ignored";
}

function readGitBlobText(repoRoot, contentHash, sizeLimit) {
  const match = contentHash?.match(/^gitblob:([0-9a-f]+)$/);
  if (!match) return null;
  if (gitBlobTextReadsDisabled) return "";
  try {
    const buffer = execFileSync("git", ["-C", repoRoot, "cat-file", "blob", match[1]], {
      encoding: null,
      maxBuffer: sizeLimit + 1024,
      timeout: 250
    });
    if (buffer.length > sizeLimit || buffer.includes(0)) return "";
    return buffer.toString("utf8");
  } catch {
    gitBlobTextReadsDisabled = true;
    return "";
  }
}

function readUtf8IfText(repoRoot, filePath, sizeLimit = 512 * 1024, entry = null) {
  const absolutePath = path.join(repoRoot, filePath);
  const extension = detectExtension(filePath);
  if (!TEXT_EXTENSIONS.has(extension) && !filePath.includes(".")) return "";
  if (fs.lstatSync(absolutePath).isSymbolicLink()) return "";
  if (entry?.contentHash?.startsWith("gitblob:") && entry.sizeBytes <= sizeLimit) {
    const blobText = readGitBlobText(repoRoot, entry.contentHash, sizeLimit);
    if (blobText !== null) return blobText;
  }
  if (entry?.contentHash?.startsWith("gitblob:") && entry.sizeBytes > sizeLimit) return "";
  const stat = fs.statSync(absolutePath);
  if (stat.size > sizeLimit) {
    const buffer = Buffer.alloc(sizeLimit);
    const fd = fs.openSync(absolutePath, "r");
    try {
      fs.readSync(fd, buffer, 0, sizeLimit, 0);
    } finally {
      fs.closeSync(fd);
    }
    return buffer.includes(0) ? "" : buffer.toString("utf8");
  }
  const buffer = fs.readFileSync(absolutePath);
  if (buffer.includes(0)) return "";
  return buffer.toString("utf8");
}

function lineCount(text) {
  if (!text) return 0;
  return text.split(/\r?\n/).length;
}

function isLargeFile(entry, text = "") {
  return entry.sizeBytes >= 12000 || lineCount(text) >= 250;
}

function listRepoFiles(repoRoot, runId, explicitIncludes = []) {
  const statuses = new Map();
  for (const filePath of gitNullEntries(repoRoot, ["ls-files", "-z"])) {
    statuses.set(normalizeRepoPath(filePath), "tracked");
  }
  let untrackedFiles = [];
  try {
    untrackedFiles = gitNullEntries(repoRoot, ["ls-files", "--others", "--exclude-standard", "-z"], { timeoutMs: 3000 });
  } catch {
    untrackedFiles = fallbackUntrackedFiles(repoRoot, new Set(statuses.keys()), runId);
  }
  for (const filePath of untrackedFiles) {
    if (!statuses.has(normalizeRepoPath(filePath))) {
      statuses.set(normalizeRepoPath(filePath), "untracked-non-ignored");
    }
  }
  for (const includePath of explicitIncludes) {
    const normalized = normalizeRepoPath(includePath);
    const absolutePath = path.join(repoRoot, normalized);
    if (fs.existsSync(absolutePath)) {
      const stat = fs.lstatSync(absolutePath);
      if (!stat.isFile() && !stat.isSymbolicLink()) continue;
      statuses.set(normalized, "explicit-include");
    }
  }

  const excluded = currentRunArtifactPaths(runId);
  return [...statuses.entries()]
    .filter(([filePath]) => !filePath.startsWith(".git/"))
    .filter(([filePath]) => !excluded.has(filePath))
    .filter(([filePath]) => fs.existsSync(path.join(repoRoot, filePath)))
    .filter(([filePath]) => {
      const stat = fs.lstatSync(path.join(repoRoot, filePath));
      return stat.isFile() || stat.isSymbolicLink();
    })
    .map(([filePath, status]) => ({ path: filePath, sourceStatus: sourceStatusLabel(status) }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function createManifest({ repoRoot, runId, mode = "backfill", explicitIncludes = [] }) {
  const indexStatMap = gitIndexStatMap(repoRoot);
  const blobMap = gitIndexBlobMap(repoRoot);
  const files = listRepoFiles(repoRoot, runId, explicitIncludes).map(file => {
    const extension = detectExtension(file.path);
    const metadata = fileMetadata(repoRoot, file, indexStatMap, blobMap);
    return {
      runId,
      path: file.path,
      fileId: stableFileId(file.path),
      sizeBytes: metadata.sizeBytes,
      contentHash: metadata.contentHash,
      extension,
      detectedLanguage: detectLanguage(file.path, extension),
      sourceStatus: file.sourceStatus
    };
  });

  return {
    schema: "foundation.backfill.file-manifest.v1",
    runId,
    targetRepo: repoName(repoRoot),
    repoRoot: path.resolve(repoRoot),
    generatedAt: nowIso(),
    mode,
    manifestRules: {
      includedSources: ["git ls-files", "git ls-files --others --exclude-standard"],
      explicitIncludes,
      excludedByGit: [
        "ignored files such as dependency directories, build outputs, caches, local environment files, and .git internals"
      ],
      runStartSnapshotExcludes: [...currentRunArtifactPaths(runId)],
      selfReferencePolicy: "Current-run generated manifest, registry, check, refresh, and eval artifacts are excluded from their own input snapshot."
    },
    counts: {
      totalFiles: files.length,
      tracked: files.filter(file => file.sourceStatus === "tracked").length,
      untrackedNonIgnored: files.filter(file => file.sourceStatus === "untracked-non-ignored").length,
      explicitInclude: files.filter(file => file.sourceStatus === "explicit-include").length,
      byExtension: countBy(files, file => file.extension),
      byDetectedLanguage: countBy(files, file => file.detectedLanguage)
    },
    files
  };
}

function createSkeletonRow(entry) {
  return {
    schema: "foundation.backfill.artifact-inventory-row.v1",
    runId: entry.runId,
    fileId: entry.fileId,
    path: entry.path,
    contentHash: entry.contentHash,
    sizeBytes: entry.sizeBytes,
    extension: entry.extension,
    detectedLanguage: entry.detectedLanguage,
    sourceStatus: entry.sourceStatus,
    kind: "unknown",
    domain: "unknown",
    evidenceValue: "unknown",
    role: "",
    responsibilities: [],
    importantSymbols: [],
    entryPoints: [],
    exports: [],
    imports: [],
    dataObjects: [],
    externalSystems: [],
    relatedFiles: [],
    specLinks: [],
    capabilityIds: [],
    verificationTargets: [],
    testGaps: [],
    reviewFlags: [],
    status: "pending",
    confidence: "low",
    mappedAt: null,
    graphLinkedAt: null
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJsonl(filePath) {
  const rows = [];
  const errors = [];
  if (!fs.existsSync(filePath)) return { rows, errors: [{ line: 0, error: "File does not exist" }] };
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
        errors.push({ line: index + 1, error: "Line must parse to a JSON object" });
      } else {
        rows.push(parsed);
      }
    } catch (error) {
      errors.push({ line: index + 1, error: error.message });
    }
  }
  return { rows, errors };
}

function writeJsonl(filePath, rows) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${rows.map(row => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function result(id, status, message, details = null) {
  return { id, status, message, ...(details ? { details } : {}) };
}

function pass(id, message, details) {
  return result(id, "pass", message, details);
}

function warn(id, message, details) {
  return result(id, "warn", message, details);
}

function fail(id, message, details) {
  return result(id, "fail", message, details);
}

function summarizeResults(results) {
  return {
    pass: results.filter(item => item.status === "pass").length,
    warn: results.filter(item => item.status === "warn").length,
    fail: results.filter(item => item.status === "fail").length
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function isObjectArray(value) {
  return Array.isArray(value) && value.every(item => item && typeof item === "object" && !Array.isArray(item));
}

function validateUnique(entries, field, label) {
  const seen = new Set();
  const duplicates = [];
  for (const entry of entries) {
    if (!isNonEmptyString(entry?.[field])) continue;
    if (seen.has(entry[field])) duplicates.push(entry[field]);
    seen.add(entry[field]);
  }
  return duplicates.length === 0
    ? pass(`${label}-${field}-unique`, `${label} ${field} values are unique`)
    : fail(`${label}-${field}-unique`, `${label} ${field} values must be unique`, { duplicates });
}

function validateManifest(manifest, expectedRunId = null) {
  const results = [];
  if (manifest?.schema !== "foundation.backfill.file-manifest.v1") {
    results.push(fail("manifest-schema", "Manifest schema must be foundation.backfill.file-manifest.v1", { schema: manifest?.schema }));
  } else {
    results.push(pass("manifest-schema", "Manifest schema is valid"));
  }

  if (!isNonEmptyString(manifest?.runId)) {
    results.push(fail("manifest-run-id", "Manifest must include runId"));
  } else if (expectedRunId && manifest.runId !== expectedRunId) {
    results.push(fail("manifest-run-id", "Manifest runId must match requested runId", { expectedRunId, runId: manifest.runId }));
  } else {
    results.push(pass("manifest-run-id", `Manifest runId is ${manifest.runId}`));
  }

  if (!Array.isArray(manifest?.files)) {
    results.push(fail("manifest-files", "Manifest files must be an array"));
    return results;
  }

  results.push(manifest.files.length > 0
    ? pass("manifest-files", `Manifest has ${manifest.files.length} file(s)`)
    : fail("manifest-files", "Manifest must include at least one file"));
  results.push(validateUnique(manifest.files, "path", "manifest"));
  results.push(validateUnique(manifest.files, "fileId", "manifest"));

  const currentRunArtifacts = currentRunArtifactPaths(manifest.runId || expectedRunId || "");
  for (const [index, file] of manifest.files.entries()) {
    const prefix = `manifest:${file?.path || index + 1}`;
    if (!isNonEmptyString(file?.path)) results.push(fail(`${prefix}:path`, "Manifest entry must include path"));
    if (!isNonEmptyString(file?.fileId)) results.push(fail(`${prefix}:file-id`, "Manifest entry must include fileId"));
    if (!isNonEmptyString(file?.contentHash) || !/^(sha256|gitblob):/.test(file.contentHash)) {
      results.push(fail(`${prefix}:content-hash`, "Manifest entry must include an algorithm-prefixed contentHash"));
    }
    if (!Number.isInteger(file?.sizeBytes) || file.sizeBytes < 0) {
      results.push(fail(`${prefix}:size`, "Manifest entry must include non-negative integer sizeBytes"));
    }
    if (!isNonEmptyString(file?.extension)) results.push(fail(`${prefix}:extension`, "Manifest entry must include extension"));
    if (!isNonEmptyString(file?.detectedLanguage)) results.push(fail(`${prefix}:detected-language`, "Manifest entry must include detectedLanguage"));
    if (!["tracked", "untracked-non-ignored", "explicit-include"].includes(file?.sourceStatus)) {
      results.push(fail(`${prefix}:source-status`, "Manifest sourceStatus is invalid", { sourceStatus: file?.sourceStatus }));
    }
    if (currentRunArtifacts.has(file?.path)) {
      results.push(fail(`${prefix}:self-reference`, "Current-run generated artifact must not appear in manifest", { path: file.path }));
    }
  }
  return results;
}

function rowReviewFlags(row) {
  return Array.isArray(row?.reviewFlags) ? row.reviewFlags : [];
}

function rowHasBlockingFlag(row) {
  return rowReviewFlags(row).some(flag => flag?.severity === "blocking");
}

function isBehaviorBearingRow(row) {
  if (row?.evidenceValue === "behavior-bearing") return true;
  return ["route", "service", "model", "migration", "script"].includes(row?.kind);
}

function validateMappedRowShape(row, prefix, results) {
  if (!VALID_KINDS.has(row.kind)) {
    results.push(fail(`${prefix}:kind`, "Row kind is outside enum", { kind: row.kind }));
  }
  if (!VALID_EVIDENCE_VALUES.has(row.evidenceValue)) {
    results.push(fail(`${prefix}:evidence-value`, "Row evidenceValue is outside enum", { evidenceValue: row.evidenceValue }));
  }
  if (!VALID_CONFIDENCE.has(row.confidence)) {
    results.push(fail(`${prefix}:confidence`, "Row confidence is outside enum", { confidence: row.confidence }));
  }
  if (row.kind === "unknown") results.push(fail(`${prefix}:kind-known`, "Mapped rows cannot use unknown kind"));
  if (row.evidenceValue === "unknown") results.push(fail(`${prefix}:evidence-known`, "Mapped rows cannot use unknown evidenceValue"));
  if (!isNonEmptyString(row.domain) || row.domain === "unknown") results.push(fail(`${prefix}:domain`, "Mapped rows must include a known domain"));
  if (!isNonEmptyString(row.role) || row.role.trim().length < 16) results.push(fail(`${prefix}:role`, "Mapped rows must include a specific role"));
  if (!isObjectArray(row.responsibilities) || row.responsibilities.length === 0) {
    results.push(fail(`${prefix}:responsibilities`, "Mapped rows must include responsibility objects"));
  } else {
    for (const [index, responsibility] of row.responsibilities.entries()) {
      const label = `${prefix}:responsibilities:${index + 1}`;
      if (!isNonEmptyString(responsibility.label)) results.push(fail(`${label}:label`, "Responsibility must include label"));
      if (!isNonEmptyString(responsibility.description) || responsibility.description.length < 20) {
        results.push(fail(`${label}:description`, "Responsibility must include a useful description"));
      }
      if (responsibility.symbols !== undefined && !isStringArray(responsibility.symbols)) {
        results.push(fail(`${label}:symbols`, "Responsibility symbols must be non-empty strings when present"));
      }
    }
  }

  for (const field of [
    "importantSymbols",
    "entryPoints",
    "exports",
    "imports",
    "dataObjects",
    "externalSystems",
    "relatedFiles",
    "capabilityIds"
  ]) {
    if (!Array.isArray(row[field])) results.push(fail(`${prefix}:${field}`, `${field} must be an array`));
  }

  if (!Array.isArray(row.specLinks)) {
    results.push(fail(`${prefix}:spec-links`, "specLinks must be an array"));
  } else {
    for (const [index, link] of row.specLinks.entries()) {
      const label = `${prefix}:spec-links:${index + 1}`;
      if (!isNonEmptyString(link?.specId)) results.push(fail(`${label}:spec-id`, "Spec link requires specId"));
      if (!isNonEmptyString(link?.sectionId)) results.push(fail(`${label}:section-id`, "Spec link requires sectionId"));
      if (!VALID_SPEC_LINK_RELATIONSHIPS.has(link?.relationship)) {
        results.push(fail(`${label}:relationship`, "Spec link relationship is invalid", { relationship: link?.relationship }));
      }
    }
  }

  if (!Array.isArray(row.verificationTargets)) {
    results.push(fail(`${prefix}:verification-targets`, "verificationTargets must be an array"));
  }
  if (!Array.isArray(row.testGaps)) {
    results.push(fail(`${prefix}:test-gaps`, "testGaps must be an array"));
  }

  if (!Array.isArray(row.reviewFlags)) {
    results.push(fail(`${prefix}:review-flags`, "reviewFlags must be an array"));
  } else {
    for (const [index, flag] of row.reviewFlags.entries()) {
      const label = `${prefix}:review-flags:${index + 1}`;
      if (!VALID_REVIEW_FLAG_SEVERITY.has(flag?.severity)) results.push(fail(`${label}:severity`, "Review flag severity is invalid"));
      if (!isNonEmptyString(flag?.reason)) results.push(fail(`${label}:reason`, "Review flag requires reason"));
      if (!isNonEmptyString(flag?.nextAction)) results.push(fail(`${label}:next-action`, "Review flag requires nextAction"));
    }
  }

  if (row.confidence === "low" && row.reviewFlags.length === 0) {
    results.push(fail(`${prefix}:low-confidence-flag`, "Low-confidence mapped rows require a review flag"));
  }
}

function validateRegistryRows({ repoRoot, manifest, rows, phase = "handoff", mode = "bootstrap" }) {
  const results = [];
  const manifestByPath = new Map((manifest.files || []).map(file => [file.path, file]));
  const indexStatMap = gitIndexStatMap(repoRoot);
  const blobMap = gitIndexBlobMap(repoRoot);
  const rowsByPath = new Map();
  const duplicatePaths = [];
  const duplicateFileIds = [];
  const fileIds = new Set();

  for (const row of rows) {
    if (rowsByPath.has(row.path)) duplicatePaths.push(row.path);
    rowsByPath.set(row.path, row);
    if (fileIds.has(row.fileId)) duplicateFileIds.push(row.fileId);
    fileIds.add(row.fileId);
  }

  results.push(duplicatePaths.length === 0
    ? pass("registry-path-unique", "Artifact Inventory paths are unique")
    : fail("registry-path-unique", "Registry paths must be unique", { duplicates: duplicatePaths }));
  results.push(duplicateFileIds.length === 0
    ? pass("registry-file-id-unique", "Artifact Inventory fileIds are unique")
    : fail("registry-file-id-unique", "Registry fileIds must be unique", { duplicates: duplicateFileIds }));

  const missing = [...manifestByPath.keys()].filter(filePath => !rowsByPath.has(filePath));
  const extra = [...rowsByPath.keys()].filter(filePath => !manifestByPath.has(filePath));
  results.push(missing.length === 0
    ? pass("registry-covers-manifest", "Every manifest file has a inventory row")
    : fail("registry-covers-manifest", "Every manifest file must have a inventory row", { missing }));
  results.push(extra.length === 0
    ? pass("registry-no-extra-paths", "Artifact Inventory has no paths outside manifest")
    : fail("registry-no-extra-paths", "Artifact Inventory rows must not exist outside manifest", { extra }));

  const pending = [];
  const blockingFlags = [];
  const stale = [];
  const largeWithoutStructure = [];

  for (const [index, row] of rows.entries()) {
    const prefix = `registry:${row?.path || index + 1}`;
    const manifestEntry = manifestByPath.get(row?.path);

    if (row?.schema !== "foundation.backfill.artifact-inventory-row.v1") {
      results.push(fail(`${prefix}:schema`, "Registry row schema is invalid", { schema: row?.schema }));
    }
    if (row?.runId !== manifest.runId) {
      results.push(fail(`${prefix}:run-id`, "Registry row runId must match manifest", { expected: manifest.runId, actual: row?.runId }));
    }
    if (!VALID_STATUSES.has(row?.status)) {
      results.push(fail(`${prefix}:status`, "Registry row status must be pending or mapped", { status: row?.status }));
      continue;
    }
    if (row.status === "pending") pending.push(row.path);
    if (rowHasBlockingFlag(row)) blockingFlags.push(row.path);

    if (manifestEntry) {
      if (row.fileId !== manifestEntry.fileId) results.push(fail(`${prefix}:file-id`, "Registry fileId must match manifest"));
      if (row.contentHash !== manifestEntry.contentHash || row.sizeBytes !== manifestEntry.sizeBytes) {
        stale.push(row.path);
      }
      const absolutePath = path.join(repoRoot, row.path);
      if (fs.existsSync(absolutePath)) {
        const current = fileMetadata(repoRoot, manifestEntry, indexStatMap, blobMap);
        if (row.contentHash !== current.contentHash || row.sizeBytes !== current.sizeBytes) {
          stale.push(row.path);
        }
        if (row.status === "mapped") {
          const text = readUtf8IfText(repoRoot, row.path, 512 * 1024, manifestEntry);
          if (isLargeFile(manifestEntry, text) && isBehaviorBearingRow(row) && (!Array.isArray(row.responsibilities) || row.responsibilities.length < 2)) {
            largeWithoutStructure.push(row.path);
          }
        }
      }
    }

    if (row.status === "mapped") validateMappedRowShape(row, prefix, results);
  }

  const uniqueStale = [...new Set(stale)];
  results.push(uniqueStale.length === 0
    ? pass("registry-fresh", "Artifact Inventory hashes and sizes match manifest/current files")
    : fail("registry-fresh", "Artifact Inventory hashes and sizes must be current", { stale: uniqueStale }));

  if (phase === "handoff") {
    results.push(pending.length === 0
      ? pass("handoff-no-pending", "No pending rows remain for handoff")
      : fail("handoff-no-pending", "Handoff requires zero pending rows", { pending }));
    results.push(blockingFlags.length === 0
      ? pass("handoff-no-blocking-flags", "No blocking review flags remain")
      : fail("handoff-no-blocking-flags", "Handoff requires no blocking review flags", { blockingFlags }));
  } else {
    results.push(warn("batch-pending-allowed", `${pending.length} pending row(s) remain in batch phase`, { pendingCount: pending.length }));
  }

  results.push(largeWithoutStructure.length === 0
    ? pass("large-file-structure", "Large behavior-bearing files have responsibility structure")
    : fail("large-file-structure", "Large behavior-bearing files need multiple responsibilities", { paths: largeWithoutStructure }));

  if (mode === "strict") {
    const graphFindings = validateGraphLinks({ repoRoot, rows, strict: true });
    results.push(...graphFindings);
  }

  return results;
}

function validateRegistry({ repoRoot, runId, outDir = defaultBackfillDir(repoRoot), phase = "handoff", mode = "bootstrap" }) {
  const manifestPath = manifestPathFor(repoRoot, runId, outDir);
  const registryPath = registryPathFor(repoRoot, runId, outDir);
  const results = [];

  if (!fs.existsSync(manifestPath)) {
    return {
      manifestPath,
      registryPath,
      results: [fail("manifest-exists", `Manifest does not exist: ${manifestPath}`)]
    };
  }
  if (!fs.existsSync(registryPath)) {
    return {
      manifestPath,
      registryPath,
      results: [pass("manifest-exists", "Manifest exists"), fail("registry-exists", `Artifact Inventory does not exist: ${registryPath}`)]
    };
  }

  const manifest = readJson(manifestPath);
  const parsed = readJsonl(registryPath);
  results.push(pass("manifest-exists", "Manifest exists"));
  results.push(pass("registry-exists", "Artifact Inventory exists"));
  results.push(...validateManifest(manifest, runId));
  if (parsed.errors.length > 0) {
    results.push(...parsed.errors.map(error => fail(`registry-jsonl:${error.line}`, "Artifact Inventory JSONL line must parse", error)));
    return { manifestPath, registryPath, manifest, rows: parsed.rows, results };
  }
  results.push(pass("registry-jsonl", "Every Artifact Inventory line parses as JSON"));
  results.push(...validateRegistryRows({ repoRoot, manifest, rows: parsed.rows, phase, mode }));

  return { manifestPath, registryPath, manifest, rows: parsed.rows, results };
}

function parseJsonScript(html, scriptId) {
  const scriptIds = Array.isArray(scriptId) ? scriptId : [scriptId];
  for (const id of scriptIds) {
    const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = pattern.exec(html))) {
      const attrs = match[1];
      const body = match[2].trim();
      if (new RegExp(`\\bid=["']${id}["']`, "i").test(attrs) && /\btype=["']application\/json["']/i.test(attrs)) {
        try {
          return JSON.parse(body);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function loadSpecRegistry(repoRoot) {
  const indexPath = path.join(repoRoot, "docs", "specs", "index.html");
  if (!fs.existsSync(indexPath)) return null;
  const html = fs.readFileSync(indexPath, "utf8");
  return parseJsonScript(html, "spec-registry");
}

function specSectionSet(specRegistry) {
  const sections = new Set();
  for (const spec of specRegistry?.specs || []) {
    if (spec.canonicalSection) sections.add(`${spec.id}#${spec.canonicalSection}`);
    for (const related of spec.relatedSpecs || []) {
      for (const section of related.sections || []) sections.add(`${related.id}#${section}`);
    }
    for (const coverage of spec.coverage || []) {
      for (const mapped of coverage.mapsTo || []) sections.add(mapped);
    }
  }
  return sections;
}

function loadCapabilityMap(repoRoot) {
  const backfillDir = defaultBackfillDir(repoRoot);
  if (!fs.existsSync(backfillDir)) return null;
  const reports = fs.readdirSync(backfillDir)
    .filter(file => /^review-report-\d{8}-\d{2}\.html$/.test(file))
    .sort()
    .reverse();
  for (const report of reports) {
    const html = fs.readFileSync(path.join(backfillDir, report), "utf8");
    const matrix = parseJsonScript(html, "backfill-capability-map");
    if (matrix?.capabilities) return matrix;
  }
  return null;
}

function validateGraphLinks({ repoRoot, rows, strict = false }) {
  const results = [];
  const specRegistry = loadSpecRegistry(repoRoot);
  const capabilityMap = loadCapabilityMap(repoRoot);
  const specIds = new Set((specRegistry?.specs || []).map(spec => spec.id));
  const sectionRefs = specSectionSet(specRegistry);
  const capabilityIds = new Set((capabilityMap?.capabilities || []).map(capability => capability.id));
  const brokenSpecLinks = [];
  const brokenCapabilities = [];
  const missingBehaviorGraph = [];

  for (const row of rows.filter(item => item.status === "mapped")) {
    for (const link of row.specLinks || []) {
      if (!specIds.has(link.specId)) {
        brokenSpecLinks.push({ path: row.path, specId: link.specId, reason: "unknown spec" });
      } else if (!sectionRefs.has(`${link.specId}#${link.sectionId}`)) {
        brokenSpecLinks.push({ path: row.path, specId: link.specId, sectionId: link.sectionId, reason: "unknown section" });
      }
    }
    for (const capabilityId of row.capabilityIds || []) {
      if (capabilityIds.size > 0 && !capabilityIds.has(capabilityId)) {
        brokenCapabilities.push({ path: row.path, capabilityId });
      }
    }
    if (strict && isBehaviorBearingRow(row)) {
      const hasSpec = Array.isArray(row.specLinks) && row.specLinks.length > 0;
      const hasCapability = Array.isArray(row.capabilityIds) && row.capabilityIds.length > 0;
      const hasVerification = Array.isArray(row.verificationTargets) && row.verificationTargets.length > 0;
      const hasGap = Array.isArray(row.testGaps) && row.testGaps.length > 0;
      if (!hasSpec || !hasCapability || (!hasVerification && !hasGap)) {
        missingBehaviorGraph.push({
          path: row.path,
          hasSpec,
          hasCapability,
          hasVerificationOrGap: hasVerification || hasGap
        });
      }
    }
  }

  results.push(specRegistry
    ? pass("graph-spec-registry", "Spec registry is available")
    : warn("graph-spec-registry", "Spec registry is not available; spec links cannot be resolved"));
  results.push(capabilityMap
    ? pass("graph-capability-map", "Capability Map is available")
    : warn("graph-capability-map", "Capability Map is not available; capability links cannot be resolved"));
  results.push(brokenSpecLinks.length === 0
    ? pass("graph-spec-links-resolve", "Spec links resolve")
    : fail("graph-spec-links-resolve", "Spec links must resolve", { brokenSpecLinks }));
  results.push(brokenCapabilities.length === 0
    ? pass("graph-capability-links-resolve", "Capability links resolve")
    : fail("graph-capability-links-resolve", "Capability links must resolve", { brokenCapabilities }));
  if (strict) {
    results.push(missingBehaviorGraph.length === 0
      ? pass("graph-behavior-links-complete", "Behavior-bearing rows have graph links and verification evidence or explicit gaps")
      : fail("graph-behavior-links-complete", "Behavior-bearing rows require spec, capability, and verification/gap links in strict mode", { missingBehaviorGraph }));
  }
  return results;
}

function inferKind(filePath, extension) {
  const lower = filePath.toLowerCase();
  const base = path.basename(lower);
  if (lower.includes("docs/specs/backfill/artifact-inventory") || lower.includes("docs/specs/backfill/file-manifest")) return "generated";
  if (base === "package.json" || base === "package-lock.json" || base === "pnpm-lock.yaml" || base === "yarn.lock") return "package";
  if (ASSET_EXTENSIONS.has(extension)) return "asset";
  if (lower.includes("fixture") || lower.includes("fixtures") || lower.includes("mock") || lower.includes("sample")) return "fixture";
  if (/\b(test|spec)\b/.test(lower) || lower.includes("__tests__") || lower.endsWith(".test.ts") || lower.endsWith(".test.tsx") || lower.endsWith(".test.mjs")) return "test";
  if (lower.includes("migration") || extension === ".sql") return "migration";
  if (lower.includes(".github/workflows/") || extension === ".tf" || extension === ".hcl" || extension === "Dockerfile" || extension === ".service") return "infra";
  if ([".md", ".html", ".rtf", ".txt"].includes(extension) || lower.includes("docs/")) return "doc";
  if (base.includes("config") || base.startsWith(".") || [".json", ".yml", ".yaml", ".example", ".gitignore"].includes(extension)) return "config";
  if (lower.includes("/routes/") || lower.includes("/app/") && (base === "page.tsx" || base === "layout.tsx" || base === "route.ts")) return "route";
  if (lower.includes("/components/") || extension === ".tsx") return "component";
  if (lower.includes("/models/") || lower.includes("/schema")) return "model";
  if (lower.includes("/scripts/") || [".sh", ".mjs", ".py"].includes(extension)) return "script";
  if ([".ts", ".js", ".mjs", ".py"].includes(extension)) return "service";
  return "support";
}

function normalizeKind(kind) {
  return VALID_KINDS.has(kind) ? kind : "config";
}

function inferDomain(filePath) {
  const lower = filePath.toLowerCase();
  if (lower.includes("gasbuddy") || lower.includes("speedway") || lower.includes("fuel")) return "fuel-price-ingestion";
  if (lower.includes("openclaw")) return "openclaw";
  if (lower.includes("web-app/backend")) return "backend-api";
  if (lower.includes("web-app")) return "web-app";
  if (lower.includes("database") || lower.includes("sscs") || lower.includes("loader")) return "data-loaders";
  if (lower.includes("terraform") || lower.includes("infrastructure") || lower.includes(".github/workflows")) return "infrastructure-operations";
  if (lower.includes("docs/specs/backfill")) return "backfill-process";
  if (lower.includes("docs/specs")) return "spec-system";
  if (lower.includes("scraping")) return "fuel-price-ingestion";
  if (lower.includes("package") || lower.includes("readme") || lower.startsWith(".")) return "repo-foundation";
  return "repo-support";
}

function inferEvidenceValue(kind) {
  if (["route", "service", "model", "migration", "script"].includes(kind)) return "behavior-bearing";
  if (kind === "test") return "test-evidence";
  if (kind === "doc") return "documentation-evidence";
  if (kind === "config" || kind === "infra" || kind === "package") return "configuration";
  if (kind === "asset") return "asset";
  if (kind === "generated") return "generated";
  return "support";
}

function extractMatches(text, patterns, limit = 24) {
  const symbols = [];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) && symbols.length < limit) {
      const symbol = match[1] || match[2] || match[3];
      if (symbol && !symbols.includes(symbol)) symbols.push(symbol);
    }
  }
  return symbols;
}

function importantSymbolsFor(entry, text) {
  const extension = entry.extension;
  const lower = entry.path.toLowerCase();
  if (!text) return [];
  if ([".ts", ".tsx", ".js", ".mjs"].includes(extension)) {
    return extractMatches(text, [
      /\bexport\s+(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([A-Za-z0-9_$]+)/g,
      /\b(?:function|class|interface|type)\s+([A-Za-z0-9_$]+)\b/g,
      /\b(?:const|let|var)\s+([A-Z][A-Za-z0-9_$]+)\s*=/g,
      /\b(?:get|post|put|patch|delete)\(["'`]([^"'`]+)["'`]/g
    ]);
  }
  if (extension === ".py") {
    return extractMatches(text, [/^\s*(?:def|class)\s+([A-Za-z0-9_]+)/gm]);
  }
  if (extension === ".tf") {
    return extractMatches(text, [/^\s*(?:resource|module|variable|output)\s+"([^"]+)"/gm, /^\s*(?:resource|module)\s+"[^"]+"\s+"([^"]+)"/gm]);
  }
  if (extension === ".sql") {
    return extractMatches(text, [/\b(?:create|alter)\s+table\s+(?:if\s+not\s+exists\s+)?([A-Za-z0-9_."-]+)/gi]);
  }
  if (extension === ".md" || extension === ".html" || lower.includes("docs/")) {
    return extractMatches(text, [/^#{1,4}\s+(.+)$/gm, /<h[1-4][^>]*>(.*?)<\/h[1-4]>/gi], 12)
      .map(symbol => symbol.replace(/<[^>]*>/g, "").trim())
      .filter(Boolean);
  }
  if (extension === ".json") {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return Object.keys(parsed).slice(0, 16);
      }
    } catch {
      return [];
    }
  }
  return [];
}

function importListFor(entry, text) {
  if (!text) return [];
  if ([".ts", ".tsx", ".js", ".mjs"].includes(entry.extension)) {
    return extractMatches(text, [/\bimport\b[\s\S]*?\bfrom\s+["']([^"']+)["']/g, /\brequire\(["']([^"']+)["']\)/g], 30);
  }
  if (entry.extension === ".py") {
    return extractMatches(text, [/^\s*import\s+([A-Za-z0-9_.]+)/gm, /^\s*from\s+([A-Za-z0-9_.]+)\s+import/gm], 30);
  }
  return [];
}

function exportListFor(entry, text) {
  if (!text) return [];
  if ([".ts", ".tsx", ".js", ".mjs"].includes(entry.extension)) {
    return extractMatches(text, [/\bexport\s+(?:default\s+)?(?:async\s+)?(?:function|class|const|let|var|interface|type)\s+([A-Za-z0-9_$]+)/g], 30);
  }
  if (entry.extension === ".py") {
    return extractMatches(text, [/^\s*__all__\s*=\s*\[([^\]]+)/gm], 10);
  }
  return [];
}

function dataObjectsFor(entry, text) {
  if (!text) return [];
  const objects = extractMatches(text, [
    /\b(?:table|collection|model|schema|interface|type)\s+([A-Za-z0-9_.$-]+)/gi,
    /\b(?:from|into|update)\s+([A-Za-z0-9_."-]+)/gi,
    /\b(?:CREATE|ALTER)\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z0-9_."-]+)/gi
  ], 20);
  return [...new Set(objects.map(item => item.replace(/["'`]/g, "")))];
}

function externalSystemsFor(filePath, text) {
  const haystack = `${filePath}\n${text}`.toLowerCase();
  const systems = [];
  const checks = [
    ["AWS", ["aws", "cognito", "ecs", "s3", "lambda", "rds", "bedrock", "secretsmanager"]],
    ["GitHub Actions", [".github/workflows", "github actions"]],
    ["Docker", ["docker", "dockerfile", "container"]],
    ["Terraform", ["terraform", ".tf"]],
    ["PostgreSQL", ["postgres", "postgresql", "pg_", "sql"]],
    ["OpenClaw", ["openclaw"]],
    ["GasBuddy", ["gasbuddy"]],
    ["Speedway", ["speedway"]],
    ["Appium", ["appium"]],
    ["Playwright", ["playwright"]],
    ["Next.js", ["next/", "nextjs", "next.js"]],
    ["Fastify", ["fastify"]]
  ];
  for (const [label, needles] of checks) {
    if (needles.some(needle => haystack.includes(needle))) systems.push(label);
  }
  return systems;
}

function findLineHints(text, symbols, limit = 8) {
  if (!text || symbols.length === 0) return [];
  const lines = text.split(/\r?\n/);
  const hints = [];
  for (const symbol of symbols) {
    const index = lines.findIndex(line => line.includes(symbol));
    if (index >= 0) hints.push(`L${index + 1}: ${symbol}`);
    if (hints.length >= limit) break;
  }
  return hints;
}

function nearestAncestorFiles(filePath, manifestPaths, names) {
  const related = [];
  const parts = filePath.split("/");
  for (let depth = parts.length - 1; depth >= 0; depth -= 1) {
    const dir = parts.slice(0, depth).join("/");
    for (const name of names) {
      const candidate = dir ? `${dir}/${name}` : name;
      if (candidate !== filePath && manifestPaths.has(candidate) && !related.includes(candidate)) related.push(candidate);
    }
  }
  return related;
}

function relatedFilesFor(entry, manifestPaths) {
  const related = [];
  const parsed = path.posix.parse(entry.path);
  const baseWithoutExt = parsed.name.replace(/\.(test|spec)$/, "");
  const siblingPatterns = [
    `${parsed.dir}/${baseWithoutExt}.test${entry.extension}`,
    `${parsed.dir}/${baseWithoutExt}.spec${entry.extension}`,
    `${parsed.dir}/${baseWithoutExt}${entry.extension}`,
    `${parsed.dir}/${baseWithoutExt}.tsx`,
    `${parsed.dir}/${baseWithoutExt}.ts`,
    `${parsed.dir}/${baseWithoutExt}.md`
  ].map(item => item.replace(/^\//, ""));
  for (const candidate of siblingPatterns) {
    if (candidate !== entry.path && manifestPaths.has(candidate) && !related.includes(candidate)) related.push(candidate);
  }
  related.push(...nearestAncestorFiles(entry.path, manifestPaths, ["README.md", "package.json", "Dockerfile"]));
  return [...new Set(related)].slice(0, 12);
}

function roleFor(entry, kind, domain, symbols) {
  const base = path.basename(entry.path);
  const symbolText = symbols.length > 0 ? ` Key evidence includes ${symbols.slice(0, 4).join(", ")}.` : "";
  const templates = {
    route: `Defines a route or screen entry point for ${domain} behavior in ${base}.${symbolText}`,
    component: `Renders or composes ${domain} UI behavior in ${base}.${symbolText}`,
    service: `Implements ${domain} service logic, integration behavior, or application workflow in ${base}.${symbolText}`,
    model: `Defines ${domain} data structure, schema, or persistence model behavior in ${base}.${symbolText}`,
    migration: `Changes persistent ${domain} data shape or seed behavior in ${base}.${symbolText}`,
    test: `Verifies ${domain} behavior or substrate contracts in ${base}.${symbolText}`,
    doc: `Documents ${domain} intent, operation, or evidence in ${base}.${symbolText}`,
    config: `Configures ${domain} tooling, runtime, or repo behavior in ${base}.${symbolText}`,
    infra: `Defines ${domain} deployment, cloud, workflow, or runtime infrastructure in ${base}.${symbolText}`,
    script: `Runs ${domain} automation, data movement, maintenance, or developer workflow in ${base}.${symbolText}`,
    asset: `Provides a ${domain} static asset used by product, documentation, or operations in ${base}.`,
    fixture: `Provides ${domain} sample, fixture, or mock evidence consumed by tests or docs in ${base}.`,
    generated: `Records generated ${domain} evidence or previous backfill output in ${base}.`,
    package: `Declares ${domain} package scripts, dependencies, or workspace metadata in ${base}.`
  };
  return templates[kind] || `Supports ${domain} repository behavior in ${base}.${symbolText}`;
}

function responsibilitiesFor(entry, kind, evidenceValue, text, symbols) {
  const responsibilities = [{
    label: "Primary file role",
    description: roleFor(entry, kind, inferDomain(entry.path), symbols),
    symbols: symbols.slice(0, 8),
    lineHints: findLineHints(text, symbols, 6),
    relatedFiles: [],
    evidenceValue
  }];

  if (symbols.length > 0) {
    responsibilities.push({
      label: "Important symbols",
      description: "Names the exported, declared, routed, schema, heading, or infrastructure symbols that later agents can use as navigation anchors.",
      symbols: symbols.slice(0, 12),
      lineHints: findLineHints(text, symbols, 8),
      relatedFiles: [],
      evidenceValue
    });
  }

  if (isLargeFile(entry, text)) {
    responsibilities.push({
      label: "Large-file navigation",
      description: "This file is large enough that downstream agents should use the listed symbols, headings, or line hints before rereading the whole file.",
      symbols: symbols.slice(0, 16),
      lineHints: findLineHints(text, symbols, 12),
      relatedFiles: [],
      evidenceValue
    });
  }

  if (kind === "package" && text) {
    try {
      const parsed = JSON.parse(text);
      responsibilities.push({
        label: "Package contract",
        description: "Captures package scripts, dependencies, or workspace metadata that affect local development, validation, build, or deployment behavior.",
        symbols: Object.keys(parsed.scripts || {}).slice(0, 12),
        lineHints: [],
        relatedFiles: [],
        evidenceValue
      });
    } catch {
      // Keep the primary responsibility; malformed package JSON is caught elsewhere.
    }
  }

  return responsibilities;
}

function entryPointsFor(entry, text, kind) {
  const points = [];
  if (kind === "route") points.push(entry.path);
  if (entry.path.includes(".github/workflows/")) points.push("GitHub Actions workflow");
  if (entry.extension === "Dockerfile") points.push("Docker image build");
  if (entry.extension === ".service") points.push("systemd service");
  if (kind === "package" && text) {
    try {
      const parsed = JSON.parse(text);
      for (const script of Object.keys(parsed.scripts || {})) points.push(`npm script: ${script}`);
    } catch {
      // ignore
    }
  }
  return points.slice(0, 20);
}

function inferSpecLinks(repoRoot, row) {
  const specRegistry = loadSpecRegistry(repoRoot);
  const specIds = new Set((specRegistry?.specs || []).map(spec => spec.id));
  const sectionRefs = specSectionSet(specRegistry);
  const candidatesByDomain = {
    "web-app": [
      ["sandia.web-app.descriptive", "flow-map", "implements"],
      ["sandia.web-app.technical", "route-contracts", "implements"]
    ],
    "backend-api": [["sandia.backend.api.technical", "route-contracts", "implements"]],
    "fuel-price-ingestion": [["sandia.fuel-price-ingestion.technical", "source-systems", "implements"]],
    "openclaw": [["sandia.openclaw.technical", "run-sql-tool-contract", "implements"]],
    "data-loaders": [["sandia.data-loaders.sscs.technical", "source-report-inventory", "implements"]],
    "infrastructure-operations": [["sandia.infrastructure.operations.technical", "layer-state-contract", "configures"]],
    "spec-system": [["sandia.spec-system", "overview", "documents"]],
    "backfill-process": [["sandia.backfill.20260521-01.report", "artifact-inventory-checkpoint", "documents"]],
    "repo-foundation": [["sandia.system.technical", "required-depth", "supports"]],
    "repo-support": [["sandia.system.descriptive", "product-intent", "supports"]]
  };

  const candidates = candidatesByDomain[row.domain] || candidatesByDomain["repo-support"];
  return candidates
    .filter(([specId, sectionId]) => specIds.has(specId) && sectionRefs.has(`${specId}#${sectionId}`))
    .map(([specId, sectionId, relationship]) => ({
      specId,
      sectionId,
      relationship,
      evidence: `Inferred from artifact-inventory domain ${row.domain} and path ${row.path}.`
    }));
}

function inferCapabilityIds(repoRoot, row) {
  const matrix = loadCapabilityMap(repoRoot);
  const existing = new Set((matrix?.capabilities || []).map(capability => capability.id));
  const byDomain = {
    "web-app": "cap-web-app-process-actions",
    "backend-api": "cap-backend-api-data-contracts",
    "fuel-price-ingestion": "cap-fuel-price-ingestion",
    "openclaw": "cap-openclaw-talk-to-data",
    "data-loaders": "cap-sscs-data-loaders",
    "infrastructure-operations": "cap-infrastructure-operations",
    "spec-system": "cap-system-parent-map",
    "backfill-process": "cap-system-parent-map",
    "repo-foundation": "cap-system-parent-map",
    "repo-support": "cap-system-parent-map"
  };
  const id = byDomain[row.domain] || "cap-system-parent-map";
  return existing.has(id) ? [id] : [];
}

function verificationTargetsFor(row) {
  if (row.kind === "test") {
    return [{
      id: `test:${row.fileId}`,
      path: row.path,
      command: null,
      mapsTo: (row.specLinks || []).map(link => `${link.specId}#${link.sectionId}`),
      status: "automated-or-manual-test-file"
    }];
  }
  if (row.kind === "doc" || row.domain === "spec-system" || row.domain === "backfill-process") {
    return [{
      id: `spec-check:${row.fileId}`,
      path: row.path,
      command: "npm run spec:check",
      mapsTo: (row.specLinks || []).map(link => `${link.specId}#${link.sectionId}`),
      status: "automated"
    }];
  }
  return [];
}

function testGapsFor(row) {
  if (!isBehaviorBearingRow(row)) return [];
  if (verificationTargetsFor(row).length > 0) return [];
  return [{
    id: `gap:${row.fileId}`,
    path: row.path,
    reason: "No file-specific automated verification target was identified by the V1 registry mapper.",
    nextAction: "Confirm or add a verification target when the capability/spec layer consumes this row.",
    mapsTo: (row.specLinks || []).map(link => `${link.specId}#${link.sectionId}`)
  }];
}

function mapRegistryRow({ repoRoot, entry, manifestPaths }) {
  const text = readUtf8IfText(repoRoot, entry.path, 512 * 1024, entry);
  const kind = normalizeKind(inferKind(entry.path, entry.extension));
  const domain = inferDomain(entry.path);
  const evidenceValue = inferEvidenceValue(kind);
  const symbols = importantSymbolsFor(entry, text);
  const row = {
    ...createSkeletonRow(entry),
    kind,
    domain,
    evidenceValue,
    role: roleFor(entry, kind, domain, symbols),
    responsibilities: responsibilitiesFor(entry, kind, evidenceValue, text, symbols),
    importantSymbols: symbols,
    entryPoints: entryPointsFor(entry, text, kind),
    exports: exportListFor(entry, text),
    imports: importListFor(entry, text),
    dataObjects: dataObjectsFor(entry, text),
    externalSystems: externalSystemsFor(entry.path, text),
    relatedFiles: relatedFilesFor(entry, manifestPaths),
    reviewFlags: [],
    status: "mapped",
    confidence: symbols.length > 0 || ["asset", "config", "package", "infra", "doc"].includes(kind) ? "high" : "medium",
    mappedAt: nowIso()
  };
  row.specLinks = inferSpecLinks(repoRoot, row);
  row.capabilityIds = inferCapabilityIds(repoRoot, row);
  row.verificationTargets = verificationTargetsFor(row);
  row.testGaps = testGapsFor(row);
  row.graphLinkedAt = row.specLinks.length > 0 || row.capabilityIds.length > 0 ? nowIso() : null;
  return row;
}

function mergeRowsForRefresh({ repoRoot, manifest, existingRows, fillChanged = false }) {
  const existingByPath = new Map(existingRows.map(row => [row.path, row]));
  const manifestPaths = new Set(manifest.files.map(file => file.path));
  const changed = [];
  const removed = existingRows.filter(row => !manifestPaths.has(row.path)).map(row => row.path);
  const rows = manifest.files.map(entry => {
    const existing = existingByPath.get(entry.path);
    if (existing && existing.contentHash === entry.contentHash && existing.sizeBytes === entry.sizeBytes) {
      return { ...existing, ...entry };
    }
    changed.push(entry.path);
    if (fillChanged) return mapRegistryRow({ repoRoot, entry, manifestPaths });
    return {
      ...createSkeletonRow(entry),
      previousContentHash: existing?.contentHash || null,
      previousSizeBytes: existing?.sizeBytes ?? null,
      refreshStatus: existing ? "changed" : "new"
    };
  });
  return { rows, changed, removed };
}

function appendRunLogEvent(logPath, event) {
  if (!logPath) return null;
  ensureDir(path.dirname(logPath));
  let nextSequence = 1;
  if (fs.existsSync(logPath)) {
    const parsed = readJsonl(logPath);
    const sequences = parsed.rows.map(row => row.sequence).filter(Number.isInteger);
    if (sequences.length > 0) nextSequence = Math.max(...sequences) + 1;
  }
  const record = {
    ts: nowIso(),
    sequence: nextSequence,
    ...event
  };
  fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

function renderResultsText(title, results) {
  const summary = summarizeResults(results);
  const lines = [title];
  for (const item of results) lines.push(`${item.status.toUpperCase()} [${item.id}] ${item.message}`);
  lines.push(`Summary: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`);
  return lines.join("\n");
}

function parseCliArgs(argv, { positional = [] } = {}) {
  const options = {};
  const rest = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      rest.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
    } else {
      options[key] = next;
      index += 1;
    }
  }
  for (const [index, name] of positional.entries()) {
    if (rest[index] !== undefined) options[name] = rest[index];
  }
  if (rest.length > positional.length) options._ = rest.slice(positional.length);
  return options;
}

export {
  VALID_CONFIDENCE,
  VALID_EVIDENCE_VALUES,
  VALID_KINDS,
  VALID_REVIEW_FLAG_SEVERITY,
  VALID_SPEC_LINK_RELATIONSHIPS,
  VALID_STATUSES,
  appendRunLogEvent,
  checkPathFor,
  createManifest,
  createSkeletonRow,
  defaultBackfillDir,
  ensureDir,
  evalReceiptPathFor,
  evalSummaryPathFor,
  fail,
  isBehaviorBearingRow,
  loadCapabilityMap,
  loadSpecRegistry,
  manifestPathFor,
  mapRegistryRow,
  mergeRowsForRefresh,
  nowIso,
  parseCliArgs,
  pass,
  readJson,
  readJsonl,
  refreshPathFor,
  registryPathFor,
  renderResultsText,
  repoName,
  result,
  sha256File,
  summarizeResults,
  validateGraphLinks,
  validateManifest,
  validateRegistry,
  warn,
  writeJson,
  writeJsonl
};
