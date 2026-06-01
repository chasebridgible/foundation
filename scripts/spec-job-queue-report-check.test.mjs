import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateReport } from "./spec-job-queue-report-check.mjs";

function writeReport(body) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-spec-job-queue-"));
  const file = path.join(dir, "review-report.html");
  fs.writeFileSync(file, body, "utf8");
  return file;
}

function statuses(results) {
  return results.map(result => result.status);
}

function validCapabilityMap(status = "acceptable") {
  return `<script type="application/json" id="backfill-capability-map">
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
      "jobSpec": "example.identity-login.job",
      "jobSections": ["#capability-contract"],
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

test("accepts a structurally valid Spec Job Queue", () => {
  const file = writeReport(`<!DOCTYPE html>
${validCapabilityMap()}
<script type="application/json" id="backfill-spec-job-queue">
{
  "schema": "foundation.backfill.spec-job-queue.v1",
  "runId": "20260521-01",
  "targetRepo": "example",
  "queue": [
    {
      "sliceId": "identity-login",
      "name": "User login",
      "scope": "User login and failed-login recovery",
      "upstreamCapabilityIds": ["identity-login-capability"],
      "status": "acceptable",
      "ownerSkill": "evaluate-backfill-specs",
      "jobSpec": "example.identity-login.job",
      "technicalSpec": "example.identity-login.technical",
      "jobSections": ["#capability-contract"],
      "technicalSections": ["#technical-contract"],
      "verificationTargets": ["successful login", "failed login"],
      "nextAction": "Continue to the next queued slice",
      "exitCriterion": "Slice scored acceptable",
      "blockingQuestions": [],
      "blockingGaps": [],
      "humanDecisions": []
    }
  ]
}
</script>`);

  assert.equal(statuses(validateReport(file)).includes("fail"), false);
});

test("accepts legacy descriptive fields with warnings", () => {
  const legacyCapabilityMap = validCapabilityMap()
    .replace('"jobSpec": "example.identity-login.job"', '"descriptiveSpec": "example.identity-login.descriptive"')
    .replace('"jobSections": ["#capability-contract"]', '"descriptiveSections": ["#capability-contract"]');
  const file = writeReport(`<!DOCTYPE html>
${legacyCapabilityMap}
<script type="application/json" id="backfill-spec-job-queue">
{
  "schema": "foundation.backfill.spec-job-queue.v1",
  "runId": "20260521-01",
  "targetRepo": "example",
  "queue": [
    {
      "sliceId": "identity-login",
      "name": "User login",
      "scope": "User login and failed-login recovery",
      "upstreamCapabilityIds": ["identity-login-capability"],
      "status": "acceptable",
      "ownerSkill": "backfill-descriptive-spec-author",
      "descriptiveSpec": "example.identity-login.descriptive",
      "technicalSpec": "example.identity-login.technical",
      "descriptiveSections": ["#capability-contract"],
      "technicalSections": ["#technical-contract"],
      "verificationTargets": ["successful login", "failed login"],
      "nextAction": "Continue to the next queued slice",
      "exitCriterion": "Slice scored acceptable",
      "blockingQuestions": [],
      "blockingGaps": [],
      "humanDecisions": []
    }
  ]
}
</script>`);

  const results = validateReport(file);
  assert.equal(statuses(results).includes("fail"), false);
  assert.equal(statuses(results).includes("warn"), true);
});

test("rejects a report without an embedded Spec Job Queue", () => {
  const file = writeReport(`<!DOCTYPE html>${validCapabilityMap()}<p>No queue</p>`);
  const results = validateReport(file);
  assert.equal(results.some(result => result.id === "queue-script" && result.status === "fail"), true);
});

test("rejects a report without an embedded Capability Map", () => {
  const file = writeReport(`<!DOCTYPE html>
<script type="application/json" id="backfill-spec-job-queue">
{
  "schema": "foundation.backfill.spec-job-queue.v1",
  "runId": "20260521-01",
  "targetRepo": "example",
  "queue": [
    {
      "sliceId": "identity-login",
      "name": "User login",
      "scope": "User login",
      "upstreamCapabilityIds": ["identity-login-capability"],
      "status": "ready",
      "ownerSkill": "backfill-context-pack",
      "nextAction": "Create context pack",
      "exitCriterion": "Context pack is ready",
      "blockingQuestions": [],
      "blockingGaps": [],
      "humanDecisions": []
    }
  ]
}
</script>`);

  const results = validateReport(file);
  assert.equal(results.some(result => result.id === "capability-script" && result.status === "fail"), true);
});

test("rejects acceptable slices without verification targets", () => {
  const file = writeReport(`<!DOCTYPE html>
${validCapabilityMap()}
<script type="application/json" id="backfill-spec-job-queue">
{
  "schema": "foundation.backfill.spec-job-queue.v1",
  "runId": "20260521-01",
  "targetRepo": "example",
  "queue": [
    {
      "sliceId": "identity-login",
      "name": "User login",
      "scope": "User login",
      "upstreamCapabilityIds": ["identity-login-capability"],
      "status": "acceptable",
      "ownerSkill": "evaluate-backfill-specs",
      "jobSpec": "example.identity-login.job",
      "technicalSpec": "example.identity-login.technical",
      "jobSections": ["#capability-contract"],
      "technicalSections": ["#technical-contract"],
      "verificationTargets": [],
      "blockingQuestions": [],
      "blockingGaps": [],
      "humanDecisions": []
    }
  ]
}
</script>`);

  const results = validateReport(file);
  assert.equal(results.some(result => result.id === "slice:identity-login:acceptable-verification-targets" && result.status === "fail"), true);
});

test("rejects slice capability IDs that are not in the matrix", () => {
  const file = writeReport(`<!DOCTYPE html>
${validCapabilityMap("queued")}
<script type="application/json" id="backfill-spec-job-queue">
{
  "schema": "foundation.backfill.spec-job-queue.v1",
  "runId": "20260521-01",
  "targetRepo": "example",
  "queue": [
    {
      "sliceId": "identity-login",
      "name": "User login",
      "scope": "User login",
      "upstreamCapabilityIds": ["missing-capability"],
      "status": "ready",
      "ownerSkill": "backfill-context-pack",
      "nextAction": "Create context pack",
      "exitCriterion": "Context pack is ready",
      "blockingQuestions": [],
      "blockingGaps": [],
      "humanDecisions": []
    }
  ]
}
</script>`);

  const results = validateReport(file);
  assert.equal(results.some(result => result.id === "slice:identity-login:capability-refs" && result.status === "fail"), true);
});
