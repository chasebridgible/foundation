#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.dirname(path.dirname(scriptPath));
const requiredSkills = [
  "descriptive-spec-interview",
  "backfill-specs",
  "file-registry-fill-loop",
  "surface-registry-fill-loop",
  "backfill-repo-inventory",
  "backfill-user-flow-extraction",
  "backfill-descriptive-spec-author",
  "backfill-rendered-ux-spec",
  "backfill-technical-spec-author",
  "backfill-spec-adequacy-review",
  "evaluate-backfill-specs",
  "spec-workflow",
  "install-foundation-substrate"
];

function usage() {
  return `Usage:
  npm run foundation:doctor
  npm run foundation:doctor -- --repo ../tribal-innovations

Options:
  --repo <path>          Target repo to validate against Foundation
  --foundation <path>    Canonical Foundation path (default: this repo)
  --global-agents <path> Global Codex AGENTS.md path (default: ~/.codex/AGENTS.md)
  --skip-spec-check      Skip Foundation spec registry check
  --json                Print JSON output
  --help                Show this help`;
}

function parseArgs(argv) {
  const options = {
    foundationPath: repoRoot,
    repoPath: null,
    globalAgentsPath: path.join(process.env.HOME || "", ".codex", "AGENTS.md"),
    skipSpecCheck: false,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { ...options, help: true };
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--skip-spec-check") {
      options.skipSpecCheck = true;
      continue;
    }
    if (token === "--repo" || token === "--foundation" || token === "--global-agents") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
      index += 1;
      if (token === "--repo") options.repoPath = path.resolve(value);
      if (token === "--foundation") options.foundationPath = path.resolve(value);
      if (token === "--global-agents") options.globalAgentsPath = path.resolve(value);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  options.foundationPath = path.resolve(options.foundationPath);
  return options;
}

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function result(scope, id, status, message, details = null) {
  return { scope, id, status, message, ...(details ? { details } : {}) };
}

function pass(scope, id, message, details) {
  return result(scope, id, "pass", message, details);
}

function warn(scope, id, message, details) {
  return result(scope, id, "warn", message, details);
}

function fail(scope, id, message, details) {
  return result(scope, id, "fail", message, details);
}

function listHtmlFiles(dir) {
  if (!exists(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

function extractSpecMetadata(html) {
  const match = html.match(/<script type="application\/json" id="spec-metadata">([\s\S]*?)<\/script>/);
  if (!match) return null;
  return JSON.parse(match[1]);
}

function runSpecCheck(foundationPath) {
  const registry = spawnSync(process.execPath, ["docs/specs/generate-registry.mjs", "--check"], {
    cwd: foundationPath,
    encoding: "utf8"
  });
  if (registry.status !== 0) return registry;
  return spawnSync(process.execPath, ["docs/specs/check-specs.mjs"], {
    cwd: foundationPath,
    encoding: "utf8"
  });
}

function checkMachine(options) {
  const out = [];
  const foundationPath = options.foundationPath;
  const globalAgentsPath = options.globalAgentsPath;

  out.push(exists(foundationPath)
    ? pass("machine", "foundation-path", `Foundation path exists: ${foundationPath}`)
    : fail("machine", "foundation-path", `Foundation path does not exist: ${foundationPath}`));

  out.push(exists(path.join(foundationPath, ".git"))
    ? pass("machine", "foundation-git", "Foundation path is a Git repo")
    : fail("machine", "foundation-git", "Foundation path is not a Git repo"));

  out.push(exists(path.join(foundationPath, "AGENTS.md"))
    ? pass("machine", "foundation-agents", "Foundation AGENTS.md exists")
    : fail("machine", "foundation-agents", "Foundation AGENTS.md is missing"));

  for (const skill of requiredSkills) {
    const skillPath = path.join(foundationPath, "skills", skill, "SKILL.md");
    out.push(exists(skillPath)
      ? pass("machine", `skill-${skill}`, `Required Foundation skill exists: ${skill}`)
      : fail("machine", `skill-${skill}`, `Required Foundation skill is missing: ${skillPath}`));
  }

  if (!exists(globalAgentsPath)) {
    out.push(fail("machine", "global-agents", `Global Codex AGENTS.md is missing: ${globalAgentsPath}`));
  } else {
    const content = read(globalAgentsPath);
    const hasPath = content.includes(foundationPath);
    const mentionsFoundationAgents = content.includes("Foundation `AGENTS.md`") || content.includes("Foundation AGENTS.md");
    if (hasPath && mentionsFoundationAgents) {
      out.push(pass("machine", "global-agents", "Global Codex AGENTS.md points to Foundation"));
    } else {
      out.push(fail("machine", "global-agents", "Global Codex AGENTS.md does not clearly point to Foundation", {
        expectedPath: foundationPath,
        globalAgentsPath
      }));
    }
  }

  if (options.skipSpecCheck) {
    out.push(warn("machine", "foundation-spec-check", "Foundation spec check skipped"));
  } else {
    const specCheck = runSpecCheck(foundationPath);
    const output = `${specCheck.stdout || ""}${specCheck.stderr || ""}`.trim();
    out.push(specCheck.status === 0
      ? pass("machine", "foundation-spec-check", "Foundation spec registry/check passes")
      : fail("machine", "foundation-spec-check", "Foundation spec registry/check failed", { output }));
  }

  return out;
}

function checkTargetRepo(options) {
  const out = [];
  const repoPath = options.repoPath;
  const foundationPath = options.foundationPath;
  if (!repoPath) return out;

  out.push(exists(repoPath)
    ? pass("repo", "repo-path", `Target repo path exists: ${repoPath}`)
    : fail("repo", "repo-path", `Target repo path does not exist: ${repoPath}`));

  out.push(exists(path.join(repoPath, ".git"))
    ? pass("repo", "repo-git", "Target repo is a Git repo")
    : fail("repo", "repo-git", "Target repo is not a Git repo"));

  const agentsPath = path.join(repoPath, "AGENTS.md");
  if (!exists(agentsPath)) {
    out.push(fail("repo", "repo-agents", "Target repo AGENTS.md is missing"));
  } else {
    const content = read(agentsPath);
    out.push(content.includes(foundationPath) || /foundation/i.test(content)
      ? pass("repo", "repo-agents", "Target repo AGENTS.md points to Foundation")
      : fail("repo", "repo-agents", "Target repo AGENTS.md does not point to Foundation"));

    const duplicatedRules = [
      "Specs are HTML-native durable contracts",
      "Use the Spec workflow skill",
      "If spec metadata changes"
    ].filter(text => content.includes(text));
    out.push(duplicatedRules.length === 0
      ? pass("repo", "repo-agents-adapter", "Target repo AGENTS.md looks like an adapter")
      : fail("repo", "repo-agents-adapter", "Target repo AGENTS.md duplicates Foundation-owned rules", { duplicatedRules }));
  }

  const specsDir = path.join(repoPath, "docs", "specs");
  if (!exists(specsDir)) {
    out.push(warn("repo", "repo-specs-dir", "Target repo has no docs/specs directory yet"));
  } else {
    out.push(pass("repo", "repo-specs-dir", "Target repo docs/specs directory exists"));
    const badIds = [];
    for (const file of listHtmlFiles(specsDir)) {
      try {
        const metadata = extractSpecMetadata(read(file));
        if (metadata?.id?.startsWith("foundation.")) {
          badIds.push({ file: path.relative(repoPath, file), id: metadata.id });
        }
      } catch (error) {
        out.push(fail("repo", "repo-spec-parse", `Could not parse spec metadata in ${path.relative(repoPath, file)}`, {
          error: error.message
        }));
      }
    }
    out.push(badIds.length === 0
      ? pass("repo", "repo-spec-ids", "Target repo specs do not use foundation.* IDs")
      : fail("repo", "repo-spec-ids", "Target repo contains product specs under foundation.* IDs", { badIds }));
  }

  const workflowsDir = path.join(repoPath, ".github", "workflows");
  if (!exists(workflowsDir)) {
    out.push(warn("repo", "repo-ci", "Target repo has no GitHub workflow directory"));
  } else {
    const workflows = fs.readdirSync(workflowsDir).filter(file => /\.(ya?ml)$/.test(file));
    const contents = workflows.map(file => read(path.join(workflowsDir, file))).join("\n");
    if (!/foundation/i.test(contents)) {
      out.push(warn("repo", "repo-ci-foundation", "Target repo CI does not mention Foundation yet"));
    } else if (!/(ref:\s*[a-f0-9]{40}\b|@[a-f0-9]{40}\b)/i.test(contents)) {
      out.push(warn("repo", "repo-ci-foundation-pin", "Target repo CI mentions Foundation but does not show a pinned commit SHA"));
    } else {
      out.push(pass("repo", "repo-ci-foundation-pin", "Target repo CI references a pinned Foundation revision"));
    }
  }

  return out;
}

function summarize(results) {
  return {
    pass: results.filter(item => item.status === "pass").length,
    warn: results.filter(item => item.status === "warn").length,
    fail: results.filter(item => item.status === "fail").length
  };
}

function renderText(results) {
  const summary = summarize(results);
  const lines = ["Foundation doctor"];
  for (const item of results) {
    lines.push(`${item.status.toUpperCase()} [${item.scope}:${item.id}] ${item.message}`);
  }
  lines.push(`Summary: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`);
  return lines.join("\n");
}

function runDoctor(options) {
  const results = [
    ...checkMachine(options),
    ...checkTargetRepo(options)
  ];
  return { results, summary: summarize(results) };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error("");
    console.error(usage());
    process.exit(2);
  }

  if (options.help) {
    console.log(usage());
    return;
  }

  const report = runDoctor(options);
  if (options.json) console.log(JSON.stringify(report, null, 2));
  else console.log(renderText(report.results));
  process.exit(report.summary.fail > 0 ? 1 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}

export { parseArgs, runDoctor, renderText };
