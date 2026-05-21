import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateReport } from "./backfill-queue-check.mjs";

function writeReport(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-backfill-queue-"));
  const file = path.join(dir, "review-report.html");
  fs.writeFileSync(file, body, "utf8");
  return file;
}

function statuses(results) {
  return results.map(result => result.status);
}

test("accepts a structurally valid durable queue", () => {
  const file = writeReport(`<!DOCTYPE html>
<script type="application/json" id="backfill-slice-queue">
{
  "runId": "20260521-01",
  "targetRepo": "example",
  "currentSlice": "identity-login",
  "nextSlice": null,
  "slices": [
    {
      "id": "identity-login",
      "scope": "User login and failed-login recovery",
      "status": "acceptable",
      "ownerSkill": "evaluate-backfill-specs",
      "descriptiveSpec": "example.identity-login.descriptive",
      "technicalSpec": "example.identity-login.technical",
      "score": 98,
      "nextAction": "Continue to the next queued slice",
      "exitCriterion": "Slice scored acceptable",
      "blockingGaps": [],
      "evidence": ["apps/web/login.tsx"]
    }
  ]
}
</script>`);

  assert.equal(statuses(validateReport(file)).includes("fail"), false);
});

test("rejects a report without an embedded durable queue", () => {
  const file = writeReport("<!DOCTYPE html><p>No queue</p>");
  const results = validateReport(file);
  assert.equal(results.some(result => result.id === "queue-script" && result.status === "fail"), true);
});

test("rejects acceptable slices below the strict score threshold", () => {
  const file = writeReport(`<!DOCTYPE html>
<script type="application/json" id="backfill-slice-queue">
{
  "runId": "20260521-01",
  "targetRepo": "example",
  "currentSlice": "identity-login",
  "nextSlice": null,
  "slices": [
    {
      "id": "identity-login",
      "scope": "User login",
      "status": "acceptable",
      "ownerSkill": "evaluate-backfill-specs",
      "score": 95,
      "blockingGaps": [],
      "evidence": []
    }
  ]
}
</script>`);

  const results = validateReport(file);
  assert.equal(results.some(result => result.id === "slice:identity-login:acceptable-score" && result.status === "fail"), true);
});
