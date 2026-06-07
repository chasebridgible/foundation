import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { validateCapabilityLanguage } from "./capability-language-check.mjs";

function specHtml({ id, title, parent = "foundation.parent.capability", tags = ["capability"], children = [], outcome = "Users can do the intended thing reliably.", coverage = [] }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta name="spec:id" content="${id}">
<meta name="spec:type" content="capability">
<script type="application/json" id="spec-metadata">
{
  "id": "${id}",
  "title": "${title}",
  "type": "capability",
  "status": "draft",
  "lastUpdated": "2026-06-06",
  "parent": ${parent ? JSON.stringify(parent) : "null"},
  "children": ${JSON.stringify(children)},
  "relatedSpecs": [],
  "ownedPaths": [],
  "coverage": ${JSON.stringify(coverage)},
  "tags": ${JSON.stringify(tags)}
}
</script>
<script type="application/json" id="graph-metadata">
{
  "schema": "foundation.visible-business-graph.v1",
  "ownerSpecId": "${id}",
  "nodes": [{ "id": "spec:${id}", "type": "capability", "label": "${title}", "source": { "specId": "${id}", "sectionId": "capability-intent" } }],
  "edges": []
}
</script>
</head>
<body>
<main>
<section id="capability-intent" data-spec-canonical="true"></section>
<section id="outcome-contract"><table><tbody><tr><td>Reliable outcome</td><td>${outcome}</td><td>fixture</td></tr></tbody></table></section>
</main>
</body>
</html>`;
}

function writeSpec(root, file, html) {
  const fullPath = path.join(root, "docs", "specs", "capabilities", file);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, html);
}

test("capability language check accepts outcome-shaped child capabilities", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "capability-language-good-"));
  writeSpec(root, "parent.html", specHtml({
    id: "foundation.parent.capability",
    title: "Useful Work Is Possible",
    parent: "foundation.operating-system.system",
    tags: ["capability", "parent-capability"],
    children: ["foundation.child.capability"],
    outcome: "Useful work can be done reliably."
  }));
  writeSpec(root, "child.html", specHtml({
    id: "foundation.child.capability",
    title: "Context Is Ready",
    outcome: "Context is ready for the next job."
  }));

  const failures = validateCapabilityLanguage(root).filter(result => result.status === "fail");
  assert.deepEqual(failures, []);
});

test("capability language check rejects job-shaped child titles and artifact-only titles", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "capability-language-bad-"));
  writeSpec(root, "job-shaped.html", specHtml({
    id: "foundation.job-shaped.capability",
    title: "Map Surfaces",
    outcome: "Surfaces are known."
  }));
  writeSpec(root, "artifact.html", specHtml({
    id: "foundation.artifact.capability",
    title: "Context Pack",
    outcome: "Context is ready."
  }));

  const failures = validateCapabilityLanguage(root).filter(result => result.status === "fail");
  assert.equal(failures.some(result => result.id === "foundation.job-shaped.capability:child-title-outcome-shaped"), true);
  assert.equal(failures.some(result => result.id === "foundation.artifact.capability:artifact-title"), true);
});

test("capability language check rejects missing durable outcome language", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "capability-language-outcome-"));
  writeSpec(root, "bad-outcome.html", specHtml({
    id: "foundation.bad-outcome.capability",
    title: "Evidence Is Ready",
    outcome: "Review every row"
  }));

  const failures = validateCapabilityLanguage(root).filter(result => result.status === "fail");
  assert.equal(failures.some(result => result.id === "foundation.bad-outcome.capability:reliable-outcome-job-shaped"), true);
});
