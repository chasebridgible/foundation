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

function validCapabilityMatrix(status = "acceptable") {
  return `<script type="application/json" id="backfill-capability-matrix">
{
  "runId": "20260521-01",
  "targetRepo": "example",
  "capabilities": [
    {
      "id": "identity-login-capability",
      "name": "User login",
      "actor": "Workspace user",
      "intendedOutcome": "The user has an authenticated session or a clear recovery path.",
      "domainObject": "Session",
      "actions": ["submit credentials", "recover failed login"],
      "states": ["ready", "submitting", "authenticated", "failed"],
      "permissionsAndRules": ["workspace user can authenticate"],
      "surfaces": ["apps/web/login.tsx"],
      "backingContracts": ["session contract"],
      "failureAndRecovery": ["failed credentials", "network error"],
      "evidence": ["apps/web/login.tsx"],
      "descriptiveSpec": "example.identity-login.descriptive",
      "descriptiveSections": ["#capability-contract"],
      "technicalSpec": "example.identity-login.technical",
      "technicalSections": ["#capability-contract"],
      "verificationTargets": ["successful login", "failed login"],
      "status": "${status}",
      "splitNeeded": false,
      "blockingGaps": [],
      "humanDecisions": []
    }
  ]
}
</script>`;
}

test("accepts a structurally valid durable queue", () => {
  const file = writeReport(`<!DOCTYPE html>
${validCapabilityMatrix()}
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
      "capabilityIds": ["identity-login-capability"],
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
  const file = writeReport(`<!DOCTYPE html>${validCapabilityMatrix()}<p>No queue</p>`);
  const results = validateReport(file);
  assert.equal(results.some(result => result.id === "queue-script" && result.status === "fail"), true);
});

test("rejects a report without an embedded capability matrix", () => {
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
      "capabilityIds": ["identity-login-capability"],
      "status": "queued",
      "ownerSkill": "backfill-repo-inventory",
      "score": null,
      "blockingGaps": [],
      "evidence": []
    }
  ]
}
</script>`);

  const results = validateReport(file);
  assert.equal(results.some(result => result.id === "capability-script" && result.status === "fail"), true);
});

test("rejects acceptable slices below the strict score threshold", () => {
  const file = writeReport(`<!DOCTYPE html>
${validCapabilityMatrix()}
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
      "capabilityIds": ["identity-login-capability"],
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

test("rejects slice capability IDs that are not in the matrix", () => {
  const file = writeReport(`<!DOCTYPE html>
${validCapabilityMatrix("queued")}
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
      "capabilityIds": ["missing-capability"],
      "status": "queued",
      "ownerSkill": "backfill-repo-inventory",
      "score": null,
      "blockingGaps": [],
      "evidence": []
    }
  ]
}
</script>`);

  const results = validateReport(file);
  assert.equal(results.some(result => result.id === "slice:identity-login:capability-refs" && result.status === "fail"), true);
});
