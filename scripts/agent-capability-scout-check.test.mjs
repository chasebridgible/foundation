import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateScoutState } from "./agent-capability-scout-check.mjs";

function writeFixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "foundation-agent-scout-"));
  const dir = path.join(root, "docs/specs/agent-capability-scout");
  fs.mkdirSync(path.join(dir, "briefs"), { recursive: true });
  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf8");
  }
  return root;
}

function registry() {
  return JSON.stringify({
    schema: "foundation.agent-capability-scout.source-registry.v1",
    version: "2026-06-05",
    defaultCadence: "every other day at 5am America/Chicago",
    topicScope: "Improve agent systems broadly.",
    sources: [
      {
        id: "openai-news",
        family: "OpenAI",
        url: "https://openai.com/news/",
        topicScope: "Agent-system changes.",
        cadence: "every other day",
        enabled: true,
        importance: "high"
      }
    ]
  }, null, 2);
}

function validFiles(overrides = {}) {
  const base = {
    "docs/specs/agent-capability-scout/source-registry.json": registry(),
    "docs/specs/agent-capability-scout/runs.jsonl": `${JSON.stringify({
      runId: "2026-06-05-agent-scout-01",
      trigger: "cron",
      sourceRegistryVersion: "2026-06-05",
      startedAt: "2026-06-05T10:00:00.000Z",
      endedAt: "2026-06-05T10:20:00.000Z",
      status: "complete",
      briefPath: "docs/specs/agent-capability-scout/briefs/2026-06-05-agent-capability-scout.md",
      mergeState: "pr-open",
      notificationReceiptPath: "docs/specs/agent-capability-scout/notifications.jsonl"
    })}\n`,
    "docs/specs/agent-capability-scout/source-snapshots.jsonl": `${JSON.stringify({
      runId: "2026-06-05-agent-scout-01",
      sourceId: "openai-news",
      fetchedAt: "2026-06-05T10:01:00.000Z",
      contentHash: "sha256:abc",
      evidencePath: "docs/specs/agent-capability-scout/evidence/2026-06-05/openai-news.md",
      retrievalStatus: "fetched"
    })}\n`,
    "docs/specs/agent-capability-scout/findings.jsonl": `${JSON.stringify({
      runId: "2026-06-05-agent-scout-01",
      findingId: "finding-001",
      sourceId: "openai-news",
      dateSeen: "2026-06-05",
      changeType: "capability-change",
      summary: "A durable agent workflow pattern was observed.",
      interestGrade: 8,
      gradeReason: "Likely to improve long-running agent reliability.",
      confidence: "high",
      evidencePath: "docs/specs/agent-capability-scout/evidence/2026-06-05/openai-news.md"
    })}\n`,
    "docs/specs/agent-capability-scout/principle-candidates.jsonl": `${JSON.stringify({
      runId: "2026-06-05-agent-scout-01",
      candidateId: "principle-001",
      findingId: "finding-001",
      targetDoc: "docs/principles/agent-principles.html",
      proposedPrinciple: "Long-running agents should convert useful observations into reviewable durable artifacts before claiming learning.",
      patchPath: "docs/principles/agent-principles.html",
      durabilityReason: "The rule generalizes beyond the source and changes future agent memory behavior.",
      evidencePath: "docs/specs/agent-capability-scout/evidence/2026-06-05/openai-news.md",
      reviewState: "proposed",
      standaloneEval: "pass",
      additiveRationale: "Existing principles do not state the observation-to-artifact promotion rule."
    })}\n`,
    "docs/specs/agent-capability-scout/merge-receipts.jsonl": `${JSON.stringify({
      runId: "2026-06-05-agent-scout-01",
      branch: "codex/agent-capability-scout-20260605",
      commit: "abc123",
      prUrl: "https://github.com/example/foundation/pull/1",
      checks: [{ name: "spec:check", result: "passed" }],
      mergeState: "pr-open"
    })}\n`,
    "docs/specs/agent-capability-scout/notifications.jsonl": `${JSON.stringify({
      runId: "2026-06-05-agent-scout-01",
      target: "github-pr-comment",
      status: "sent",
      url: "https://github.com/example/foundation/pull/1#issuecomment-1",
      sentAt: "2026-06-05T10:22:00.000Z",
      summary: "Top grade 8; one principle candidate proposed."
    })}\n`,
    "docs/specs/agent-capability-scout/briefs/2026-06-05-agent-capability-scout.md": "# Agent Capability Scout\n"
  };
  return { ...base, ...overrides };
}

function hasFailure(results, id) {
  return results.some(result => result.status === "fail" && result.id === id);
}

test("accepts valid scout state", () => {
  const root = writeFixture(validFiles());
  const results = validateScoutState({ root });
  assert.equal(results.some(result => result.status === "fail"), false);
});

test("rejects out-of-range interest grades", () => {
  const files = validFiles({
    "docs/specs/agent-capability-scout/findings.jsonl": `${JSON.stringify({
      runId: "2026-06-05-agent-scout-01",
      findingId: "finding-001",
      sourceId: "openai-news",
      dateSeen: "2026-06-05",
      changeType: "capability-change",
      summary: "A durable agent workflow pattern was observed.",
      interestGrade: 11,
      gradeReason: "Too high.",
      confidence: "high",
      evidencePath: "docs/specs/agent-capability-scout/evidence/2026-06-05/openai-news.md"
    })}\n`
  });
  const root = writeFixture(files);
  const results = validateScoutState({ root });
  assert.equal(hasFailure(results, "findings:line:1:interestGrade"), true);
});

test("rejects principle candidates without standalone eval pass or fail", () => {
  const files = validFiles({
    "docs/specs/agent-capability-scout/principle-candidates.jsonl": `${JSON.stringify({
      runId: "2026-06-05-agent-scout-01",
      candidateId: "principle-001",
      findingId: "finding-001",
      targetDoc: "docs/principles/agent-principles.html",
      proposedPrinciple: "A candidate.",
      durabilityReason: "Durable.",
      evidencePath: "docs/specs/agent-capability-scout/evidence/2026-06-05/openai-news.md",
      reviewState: "proposed",
      standaloneEval: "maybe"
    })}\n`
  });
  const root = writeFixture(files);
  const results = validateScoutState({ root });
  assert.equal(hasFailure(results, "principle-candidates:line:1:standaloneEval"), true);
});

test("rejects sent notifications without a URL", () => {
  const files = validFiles({
    "docs/specs/agent-capability-scout/notifications.jsonl": `${JSON.stringify({
      runId: "2026-06-05-agent-scout-01",
      target: "github-pr-comment",
      status: "sent",
      sentAt: "2026-06-05T10:22:00.000Z",
      summary: "Top grade 8."
    })}\n`
  });
  const root = writeFixture(files);
  const results = validateScoutState({ root });
  assert.equal(hasFailure(results, "notifications:line:1:url"), true);
});

