import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateRunLog } from "./backfill-run-log-check.mjs";

function writeRunLog(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-backfill-run-log-"));
  const file = path.join(dir, "run-log.jsonl");
  fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
  return file;
}

function hasFailure(results, id) {
  return results.some(result => result.id === id && result.status === "fail");
}

test("accepts a structurally valid run log", () => {
  const file = writeRunLog([
    JSON.stringify({
      ts: "2026-05-21T14:00:00.000Z",
      runId: "20260521-01",
      sequence: 1,
      slice: null,
      phase: "artifact-inventory",
      event: "start",
      summary: "Started artifact inventory.",
      artifactsRead: ["AGENTS.md"],
      artifactsChanged: [],
      commands: [],
      checks: [],
      nextAction: "Map routes and package boundaries."
    }),
    JSON.stringify({
      ts: "2026-05-21T14:05:00.000Z",
      runId: "20260521-01",
      sequence: 2,
      slice: null,
      phase: "artifact-inventory",
      event: "complete",
      summary: "Completed initial artifact inventory.",
      artifactsRead: ["AGENTS.md", "package.json"],
      artifactsChanged: ["docs/specs/backfill/review-report-20260521-01.html"],
      commands: [{ command: "rg --files", result: "passed" }],
      checks: [],
      durationSeconds: 300,
      result: "Inventory ledger created.",
      nextAction: "Create Define Spec Jobs queue."
    })
  ]);

  assert.equal(validateRunLog(file).some(result => result.status === "fail"), false);
});

test("accepts surface function map phase events", () => {
  const file = writeRunLog([
    JSON.stringify({
      ts: "2026-05-28T04:00:00.000Z",
      runId: "20260527-01",
      sequence: 1,
      slice: null,
      phase: "surface-function-map",
      event: "checkpoint",
      summary: "Filled Surface / Function Map rows.",
      artifactsRead: ["docs/specs/backfill/artifact-inventory-20260527-01.jsonl"],
      artifactsChanged: ["docs/specs/backfill/surface-function-map-20260527-01.jsonl"],
      commands: ["foundation:surface-function-map:fill"],
      checks: [],
      nextAction: "Run Surface / Function Map checker."
    })
  ]);

  assert.equal(validateRunLog(file).some(result => result.status === "fail"), false);
});

test("accepts capability map phase events", () => {
  const file = writeRunLog([
    JSON.stringify({
      ts: "2026-05-29T15:00:00.000Z",
      runId: "20260529-01",
      sequence: 1,
      slice: null,
      phase: "capability-map",
      event: "checkpoint",
      summary: "Marked Capability Map rows.",
      artifactsRead: ["docs/specs/backfill/surface-function-map-20260529-01.jsonl"],
      artifactsChanged: ["docs/specs/backfill/capability-map-20260529-01.jsonl"],
      commands: ["foundation:capability-map:fill"],
      checks: [],
      result: "2 capability row(s) written.",
      nextAction: "Run Capability Map checker."
    })
  ]);

  assert.equal(validateRunLog(file).some(result => result.status === "fail"), false);
});

test("accepts current command phases for process map, validation, evaluation, and handoff", () => {
  const file = writeRunLog([
    JSON.stringify({
      ts: "2026-06-03T10:00:00.000Z",
      runId: "20260603-01",
      sequence: 1,
      slice: null,
      phase: "process-action-map",
      event: "checkpoint",
      summary: "Filled one Process / Action Map row.",
      artifactsRead: ["docs/specs/backfill/context-pack-20260603-01.jsonl"],
      artifactsChanged: ["docs/specs/backfill/process-action-map-20260603-01.jsonl"],
      commands: ["foundation:process-action-map:fill"],
      checks: [],
      nextAction: "Run Process / Action Map check."
    }),
    JSON.stringify({
      ts: "2026-06-03T10:01:00.000Z",
      runId: "20260603-01",
      sequence: 2,
      slice: null,
      phase: "validation",
      event: "validation",
      summary: "Checked Process / Action Map.",
      artifactsRead: ["docs/specs/backfill/process-action-map-20260603-01.jsonl"],
      artifactsChanged: ["docs/specs/backfill/process-action-map-check-20260603-01.json"],
      commands: ["foundation:process-action-map:check"],
      checks: [{ name: "process-action-map-check", result: "passed" }],
      result: "Process / Action Map check passed.",
      nextAction: "Run row eval."
    }),
    JSON.stringify({
      ts: "2026-06-03T10:02:00.000Z",
      runId: "20260603-01",
      sequence: 3,
      slice: null,
      phase: "evaluation",
      event: "evaluation",
      summary: "Evaluated one Process / Action Map row.",
      artifactsRead: ["docs/specs/backfill/process-action-map-20260603-01.jsonl"],
      artifactsChanged: ["docs/specs/backfill/process-action-map-eval-20260603-01.jsonl"],
      commands: ["foundation:process-action-map:eval"],
      checks: [{ name: "process-action-map-eval", result: "passed" }],
      result: "Selected row outstanding.",
      nextAction: "Continue with --next."
    }),
    JSON.stringify({
      ts: "2026-06-03T10:03:00.000Z",
      runId: "20260603-01",
      sequence: 4,
      slice: null,
      phase: "handoff",
      event: "handoff",
      summary: "Recorded Process / Action Map handoff.",
      artifactsRead: ["docs/specs/backfill/process-action-map-20260603-01.jsonl"],
      artifactsChanged: ["docs/specs/backfill/review-report-20260603-01.html"],
      commands: ["foundation:process-action-map:report"],
      checks: [{ name: "process-action-map-handoff", result: "passed" }],
      result: "Process / Action Map handoff gate passed.",
      nextAction: "Author Specs may consume Process / Action Map artifacts."
    })
  ]);

  assert.equal(validateRunLog(file).some(result => result.status === "fail"), false);
});

test("accepts legacy surface-map phase with warning", () => {
  const file = writeRunLog([
    JSON.stringify({
      ts: "2026-05-28T04:00:00.000Z",
      runId: "20260527-01",
      sequence: 1,
      slice: null,
      phase: "surface-map",
      event: "checkpoint",
      summary: "Filled Surface / Function Map rows.",
      artifactsRead: ["docs/specs/backfill/artifact-inventory-20260527-01.jsonl"],
      artifactsChanged: ["docs/specs/backfill/surface-function-map-20260527-01.jsonl"],
      commands: ["foundation:surface-function-map:fill"],
      checks: [],
      nextAction: "Run Surface / Function Map checker."
    })
  ]);

  const results = validateRunLog(file);
  assert.equal(results.some(result => result.status === "fail"), false);
  assert.equal(results.some(result => result.id === "line:1:legacy-phase" && result.status === "warn"), true);
});

test("rejects missing run log files", () => {
  const results = validateRunLog(path.join(os.tmpdir(), "missing-run-log.jsonl"));
  assert.equal(hasFailure(results, "log-exists"), true);
});

test("rejects malformed JSONL", () => {
  const file = writeRunLog(["{bad json"]);
  const results = validateRunLog(file);
  assert.equal(hasFailure(results, "line:1:json"), true);
});

test("rejects duplicate and non-increasing sequences", () => {
  const file = writeRunLog([
    JSON.stringify({
      ts: "2026-05-21T14:00:00.000Z",
      runId: "20260521-01",
      sequence: 2,
      phase: "setup",
      event: "start",
      summary: "Started setup."
    }),
    JSON.stringify({
      ts: "2026-05-21T14:01:00.000Z",
      runId: "20260521-01",
      sequence: 2,
      phase: "setup",
      event: "complete",
      summary: "Completed setup.",
      durationSeconds: 60,
      result: "Doctor passed."
    })
  ]);

  const results = validateRunLog(file);
  assert.equal(hasFailure(results, "line:2:sequence-unique"), true);
  assert.equal(hasFailure(results, "line:2:sequence-order"), true);
});

test("requires duration and result on complete events", () => {
  const file = writeRunLog([
    JSON.stringify({
      ts: "2026-05-21T14:00:00.000Z",
      runId: "20260521-01",
      sequence: 1,
      phase: "quality-evaluation",
      event: "complete",
      summary: "Finished validation."
    })
  ]);

  const results = validateRunLog(file);
  assert.equal(hasFailure(results, "line:1:complete-duration"), true);
  assert.equal(hasFailure(results, "line:1:result"), true);
});

test("rejects mixed run IDs", () => {
  const file = writeRunLog([
    JSON.stringify({
      ts: "2026-05-21T14:00:00.000Z",
      runId: "20260521-01",
      sequence: 1,
      phase: "setup",
      event: "start",
      summary: "Started setup."
    }),
    JSON.stringify({
      ts: "2026-05-21T14:01:00.000Z",
      runId: "20260521-02",
      sequence: 2,
      phase: "setup",
      event: "complete",
      summary: "Completed setup.",
      durationSeconds: 60,
      result: "Doctor passed."
    })
  ]);

  const results = validateRunLog(file);
  assert.equal(hasFailure(results, "single-run-id"), true);
});
