import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { runDoctor } from "./foundation-doctor.mjs";

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
  for (const skill of ["descriptive-spec-interview", "backfill-specs", "spec-workflow", "install-foundation-substrate"]) {
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
