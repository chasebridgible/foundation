import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { runDoctor } from "./foundation-doctor.mjs";
import { targetPackageScriptManifest } from "./foundation-command-manifest.mjs";
import { syncPackageScripts } from "./foundation-sync-target-package-scripts.mjs";

const repoRoot = path.dirname(path.dirname(new URL(import.meta.url).pathname));

function makeDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "foundation-doctor-"));
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function makeFoundation(root) {
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  write(path.join(root, "AGENTS.md"), "# AGENTS.md\n");
  for (const skill of [
    "job-spec-interview",
    "agentic-workflow-design",
    "backfill-repo",
    "backfill-record-repo-files",
    "backfill-map-repo-surfaces",
    "backfill-map-system-capabilities",
    "backfill-artifact-inventory",
    "backfill-map-actions",
    "backfill-write-specs",
    "backfill-job-spec-author",
    "backfill-rendered-ux-spec",
    "backfill-technical-spec-author",
    "backfill-spec-adequacy-review",
    "backfill-evaluate-specs",
    "spec-workflow",
    "install-foundation-substrate",
    "business-intake-fill-loop"
  ]) {
    write(path.join(root, "skills", skill, "SKILL.md"), `---\nname: ${skill}\ndescription: test\n---\n`);
  }
}

function makeRepo(root, foundationPath, agentsBody = null) {
  fs.mkdirSync(path.join(root, ".git"), { recursive: true });
  write(path.join(root, "AGENTS.md"), agentsBody || `# Target\n\n- This repo uses Foundation at \`${foundationPath}\`.\n`);
}

function statusById(report, id) {
  return report.results.find(item => item.id === id)?.status;
}

function listHtmlFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(full);
    return entry.isFile() && entry.name.endsWith(".html") ? [full] : [];
  });
}

function collapseCapableSiteNavFixture() {
  return `document.querySelector("[data-site-nav-toggle]");
button.dataset.siteNavToggleBound = "true";
document.body.classList.toggle("substrate-site-nav-collapsed", false);
document.dispatchEvent(new CustomEvent("substrate:site-nav-toggle"));
button.setAttribute("aria-pressed", "false");\n`;
}

function writeCurrentFoundationPackageScripts(repo, foundation) {
  write(path.join(repo, "package.json"), JSON.stringify({
    scripts: {
      "site-map": "node docs/generate-site-map.mjs",
      ...targetPackageScriptManifest({ repoPath: repo, foundationPath: foundation })
    }
  }));
}

test("Foundation and example HTML docs load versioned shared navigation scripts", () => {
  const htmlFiles = [
    ...listHtmlFiles(path.join(repoRoot, "docs")),
    ...listHtmlFiles(path.join(repoRoot, "examples", "visible-business-client", "docs"))
  ];
  assert.equal(htmlFiles.length > 0, true);

  for (const file of htmlFiles) {
    const relativeFile = path.relative(repoRoot, file);
    const html = fs.readFileSync(file, "utf8");
    assert.match(html, /<script\b[^>]*\bsrc="[^"]*site-map\.js\?v=20260602-nav-collapse"[^>]*><\/script>/, `${relativeFile} should load the versioned site map`);
    assert.match(html, /<script\b[^>]*\bsrc="[^"]*site-nav\.js\?v=20260602-nav-collapse"[^>]*><\/script>/, `${relativeFile} should load the versioned site nav`);
  }
});

test("machine setup passes when global pointer and required skills exist", () => {
  const foundation = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: null,
    skipSpecCheck: true
  });

  assert.equal(report.summary.fail, 0);
  assert.equal(statusById(report, "global-agents"), "pass");
});

test("target repo adapter passes when it points to Foundation", () => {
  const foundation = makeDir();
  const repo = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  makeRepo(repo, foundation);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: repo,
    skipSpecCheck: true
  });

  assert.equal(statusById(report, "repo-agents"), "pass");
  assert.equal(statusById(report, "repo-agents-adapter"), "pass");
});

test("foundation repo self-check allows canonical rules and foundation spec IDs", () => {
  const foundation = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  write(path.join(foundation, "AGENTS.md"), `# AGENTS.md

- Specs are HTML-native durable contracts.
- Use the Spec workflow skill.
- If spec metadata changes, run the registry.
`);
  write(path.join(foundation, "docs", "specs", "foundation.html"), `<script type="application/json" id="spec-metadata">
{ "id": "foundation.self-check.job" }
</script>`);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: foundation,
    skipSpecCheck: true
  });

  assert.equal(statusById(report, "repo-agents"), "pass");
  assert.equal(statusById(report, "repo-agents-adapter"), "pass");
  assert.equal(statusById(report, "repo-spec-ids"), "pass");
});

test("target repo AGENTS fails when it duplicates Foundation-owned rules", () => {
  const foundation = makeDir();
  const repo = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  makeRepo(repo, foundation, `# Target\n\n- Foundation: ${foundation}\n- Specs are HTML-native durable contracts.\n- Use the Spec workflow skill.\n`);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: repo,
    skipSpecCheck: true
  });

  assert.equal(statusById(report, "repo-agents-adapter"), "fail");
});

test("target repo specs fail when product specs use foundation namespace", () => {
  const foundation = makeDir();
  const repo = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  makeRepo(repo, foundation);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);
  write(path.join(repo, "docs", "specs", "bad.html"), `<script type="application/json" id="spec-metadata">
{ "id": "foundation.bad.descriptive" }
</script>`);

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: repo,
    skipSpecCheck: true
  });

  assert.equal(statusById(report, "repo-spec-ids"), "fail");
});

test("target repo HTML docs navigation warns when docs are missing assets or scripts", () => {
  const foundation = makeDir();
  const repo = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  makeRepo(repo, foundation);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);
  write(path.join(repo, "docs", "guide.html"), "<!doctype html><title>Guide</title><main><h1>Guide</h1></main>");

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: repo,
    skipSpecCheck: true
  });

  assert.equal(statusById(report, "repo-html-docs-nav"), "warn");
});

test("target repo HTML docs navigation warns when local site-nav asset is stale", () => {
  const foundation = makeDir();
  const repo = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  makeRepo(repo, foundation);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);
  write(path.join(repo, "docs", "generate-site-map.mjs"), "console.log('site map');\n");
  write(path.join(repo, "docs", "site-map.js"), "window.SubstrateSiteMap = { items: [] };\n");
  write(path.join(repo, "docs", "site-nav.js"), "console.log('site nav');\n");
  write(path.join(repo, "package.json"), JSON.stringify({
    scripts: {
      "site-map": "node docs/generate-site-map.mjs"
    }
  }));
  write(path.join(repo, "docs", "guide.html"), `<!doctype html>
<title>Guide</title>
<main><h1>Guide</h1></main>
<script src="./site-map.js"></script>
<script src="./site-nav.js"></script>`);

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: repo,
    skipSpecCheck: true
  });

  assert.equal(statusById(report, "repo-html-docs-nav"), "warn");
});

test("target repo HTML docs navigation passes when local assets, command, collapse control, and scripts exist", () => {
  const foundation = makeDir();
  const repo = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  makeRepo(repo, foundation);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);
  write(path.join(repo, "docs", "generate-site-map.mjs"), "console.log('site map');\n");
  write(path.join(repo, "docs", "site-map.js"), "window.SubstrateSiteMap = { items: [] };\n");
  write(path.join(repo, "docs", "site-nav.js"), collapseCapableSiteNavFixture());
  write(path.join(repo, "package.json"), JSON.stringify({
    scripts: {
      "site-map": "node docs/generate-site-map.mjs"
    }
  }));
  write(path.join(repo, "docs", "guide.html"), `<!doctype html>
<title>Guide</title>
<main><h1>Guide</h1></main>
<script src="./site-map.js?v=20260602-nav-collapse"></script>
<script src="./site-nav.js?v=20260602-nav-collapse"></script>`);

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: repo,
    skipSpecCheck: true
  });

  assert.equal(statusById(report, "repo-html-docs-nav"), "pass");
  assert.equal(statusById(report, "repo-html-docs-nav-command"), "pass");
});

test("target repo Foundation package scripts fail when a connected package is missing aliases", () => {
  const foundation = makeDir();
  const repo = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  makeRepo(repo, foundation);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);
  write(path.join(repo, "package.json"), JSON.stringify({
    scripts: {
      "foundation:doctor": `node ${path.relative(repo, foundation)}/scripts/foundation-doctor.mjs --repo . --foundation ${path.relative(repo, foundation)}`,
      "foundation:context-pack:report": `node ${path.relative(repo, foundation)}/scripts/context-pack-report.mjs`
    }
  }));

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: repo,
    skipSpecCheck: true
  });

  const result = report.results.find(item => item.id === "repo-foundation-package-scripts");
  assert.equal(result.status, "fail");
  assert.equal(result.details.missing.some(item => item.name === "foundation:process-action-map:init"), true);
});

test("target repo Foundation package scripts pass when aliases match the manifest", () => {
  const foundation = makeDir();
  const repo = makeDir();
  const globalAgents = path.join(makeDir(), "AGENTS.md");
  makeFoundation(foundation);
  makeRepo(repo, foundation);
  write(globalAgents, `# Global\n\n- Use Foundation at ${foundation}.\n- Read Foundation AGENTS.md before work.\n`);
  writeCurrentFoundationPackageScripts(repo, foundation);

  const report = runDoctor({
    foundationPath: foundation,
    globalAgentsPath: globalAgents,
    repoPath: repo,
    skipSpecCheck: true
  });

  assert.equal(statusById(report, "repo-foundation-package-scripts"), "pass");
});

test("target package script sync adds missing Foundation aliases idempotently", () => {
  const foundation = makeDir();
  const repo = makeDir();
  makeFoundation(foundation);
  makeRepo(repo, foundation);
  write(path.join(repo, "package.json"), JSON.stringify({
    name: "target",
    scripts: {
      test: "node --test"
    }
  }));

  const first = syncPackageScripts({ repoPath: repo, foundationPath: foundation });
  assert.equal(first.changed, true);
  assert.equal(first.added.includes("foundation:process-action-map:init"), true);
  const scripts = JSON.parse(fs.readFileSync(path.join(repo, "package.json"), "utf8")).scripts;
  assert.match(scripts["foundation:process-action-map:init"], /scripts\/process-action-map-init\.mjs/);

  const second = syncPackageScripts({ repoPath: repo, foundationPath: foundation });
  assert.equal(second.changed, false);
});
