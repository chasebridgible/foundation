#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

const VALID_PHASES = new Set([
  "setup",
  "inventory",
  "surface-registry",
  "queue",
  "user-flow",
  "descriptive",
  "rendered-ux",
  "technical",
  "adequacy",
  "evaluation",
  "validation",
  "report",
  "handoff"
]);

const VALID_EVENTS = new Set([
  "start",
  "complete",
  "checkpoint",
  "revision",
  "evaluation",
  "validation",
  "blocked",
  "handoff"
]);

function usage() {
  return `Usage:
  npm run backfill:run-log:check -- <path-to-run-log.jsonl>
  node scripts/backfill-run-log-check.mjs <path-to-run-log.jsonl>

Options:
  --json    Print JSON output
  --help    Show this help`;
}

function parseArgs(argv) {
  const options = { logPath: null, json: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { ...options, help: true };
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token.startsWith("--")) throw new Error(`Unknown argument: ${token}`);
    if (options.logPath) throw new Error(`Unexpected extra argument: ${token}`);
    options.logPath = path.resolve(token);
  }

  if (!options.help && !options.logPath) throw new Error("Missing run log path");
  return options;
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

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isNullableString(value) {
  return value === null || value === undefined || typeof value === "string";
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIsoTimestamp(value) {
  if (!isNonEmptyString(value)) return false;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed);
}

function parseJsonLines(text) {
  const events = [];
  const errors = [];
  const lines = text.split(/\r?\n/);

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    const lineNumber = index + 1;
    if (!line) continue;

    try {
      const parsed = JSON.parse(line);
      if (!isPlainObject(parsed)) {
        errors.push({ line: lineNumber, error: "Line must parse to a JSON object" });
        continue;
      }
      events.push({ line: lineNumber, event: parsed });
    } catch (error) {
      errors.push({ line: lineNumber, error: error.message });
    }
  }

  return { events, errors };
}

function validateArrayField(results, event, field, prefix) {
  if (event[field] === undefined) return;
  if (!Array.isArray(event[field])) {
    results.push(fail(`${prefix}:${field}`, `${field} must be an array when present`));
    return;
  }

  for (const [index, value] of event[field].entries()) {
    if (!isNonEmptyString(value)) {
      results.push(fail(`${prefix}:${field}:${index + 1}`, `${field} entries must be non-empty strings`));
    }
  }
}

function validateCommandArray(results, event, prefix) {
  if (event.commands === undefined) return;
  if (!Array.isArray(event.commands)) {
    results.push(fail(`${prefix}:commands`, "commands must be an array when present"));
    return;
  }

  for (const [index, command] of event.commands.entries()) {
    if (typeof command === "string") continue;
    if (isPlainObject(command) && isNonEmptyString(command.command)) continue;
    results.push(fail(`${prefix}:commands:${index + 1}`, "Command entries must be strings or objects with a non-empty command"));
  }
}

function validateCheckArray(results, event, prefix) {
  if (event.checks === undefined) return;
  if (!Array.isArray(event.checks)) {
    results.push(fail(`${prefix}:checks`, "checks must be an array when present"));
    return;
  }

  for (const [index, check] of event.checks.entries()) {
    if (typeof check === "string") continue;
    if (isPlainObject(check) && isNonEmptyString(check.name) && isNonEmptyString(check.result)) continue;
    results.push(fail(`${prefix}:checks:${index + 1}`, "Check entries must be strings or objects with non-empty name and result"));
  }
}

function validateEvents(parsedEvents) {
  const results = [];

  if (parsedEvents.length === 0) {
    return [fail("events-present", "Run log must contain at least one JSON event")];
  }

  results.push(pass("events-present", `Run log has ${parsedEvents.length} event(s)`));

  const runIds = new Set();
  const sequences = new Set();
  let previousSequence = 0;

  for (const { line, event } of parsedEvents) {
    const prefix = `line:${line}`;

    if (!isIsoTimestamp(event.ts)) {
      results.push(fail(`${prefix}:ts`, "Event must include a parseable ISO timestamp string", { ts: event.ts }));
    }

    if (!isNonEmptyString(event.runId)) {
      results.push(fail(`${prefix}:run-id`, "Event must include a non-empty runId"));
    } else {
      runIds.add(event.runId);
    }

    if (!Number.isInteger(event.sequence) || event.sequence <= 0) {
      results.push(fail(`${prefix}:sequence`, "Event must include a positive integer sequence", { sequence: event.sequence }));
    } else {
      if (sequences.has(event.sequence)) {
        results.push(fail(`${prefix}:sequence-unique`, "Event sequence must be unique", { sequence: event.sequence }));
      }
      if (event.sequence <= previousSequence) {
        results.push(fail(`${prefix}:sequence-order`, "Event sequence must increase monotonically", {
          previousSequence,
          sequence: event.sequence
        }));
      }
      sequences.add(event.sequence);
      previousSequence = event.sequence;
    }

    if (!isNullableString(event.slice)) {
      results.push(fail(`${prefix}:slice`, "slice must be a string, null, or omitted"));
    }

    if (!VALID_PHASES.has(event.phase)) {
      results.push(fail(`${prefix}:phase`, "Event phase is not in the run log enum", {
        phase: event.phase,
        validPhases: [...VALID_PHASES]
      }));
    }

    if (!VALID_EVENTS.has(event.event)) {
      results.push(fail(`${prefix}:event`, "Event type is not in the run log enum", {
        event: event.event,
        validEvents: [...VALID_EVENTS]
      }));
    }

    if (!isNonEmptyString(event.summary)) {
      results.push(fail(`${prefix}:summary`, "Event must include a non-empty summary"));
    }

    validateArrayField(results, event, "artifactsRead", prefix);
    validateArrayField(results, event, "artifactsChanged", prefix);
    validateCommandArray(results, event, prefix);
    validateCheckArray(results, event, prefix);

    if (event.durationSeconds !== undefined && event.durationSeconds !== null) {
      if (typeof event.durationSeconds !== "number" || event.durationSeconds < 0) {
        results.push(fail(`${prefix}:duration`, "durationSeconds must be a non-negative number when present", {
          durationSeconds: event.durationSeconds
        }));
      }
    }

    if (event.event === "complete" && typeof event.durationSeconds !== "number") {
      results.push(fail(`${prefix}:complete-duration`, "complete events must include durationSeconds"));
    }

    if (["complete", "blocked", "evaluation", "validation", "handoff"].includes(event.event) && !isNonEmptyString(event.result)) {
      results.push(fail(`${prefix}:result`, `${event.event} events must include a non-empty result`));
    }

    if (event.nextAction !== undefined && !isNullableString(event.nextAction)) {
      results.push(fail(`${prefix}:next-action`, "nextAction must be a string, null, or omitted"));
    }
  }

  results.push(runIds.size === 1
    ? pass("single-run-id", `All events use run ID ${[...runIds][0]}`)
    : fail("single-run-id", "Run log must contain exactly one runId", { runIds: [...runIds] }));

  results.push(sequences.size === parsedEvents.length
    ? pass("unique-sequences", "Event sequences are unique")
    : fail("unique-sequences", "Event sequences must be unique"));

  if (!parsedEvents.some(({ event }) => event.event === "start")) {
    results.push(warn("start-event", "Run log has no start event"));
  }

  if (!parsedEvents.some(({ event }) => event.event === "complete" || event.event === "handoff")) {
    results.push(warn("completion-event", "Run log has no complete or handoff event yet"));
  }

  return results;
}

function validateRunLog(logPath) {
  if (!fs.existsSync(logPath)) {
    return [fail("log-exists", `Run log does not exist: ${logPath}`)];
  }

  const text = fs.readFileSync(logPath, "utf8");
  const { events, errors } = parseJsonLines(text);
  const parseResults = errors.map(error => fail(`line:${error.line}:json`, "JSONL line must parse", { error: error.error }));

  if (parseResults.length > 0) {
    return [pass("log-exists", "Run log exists"), ...parseResults];
  }

  return [
    pass("log-exists", "Run log exists"),
    pass("jsonl-parse", "Every non-empty line parses as a JSON object"),
    ...validateEvents(events)
  ];
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
  const lines = ["Backfill run log check"];
  for (const item of results) {
    lines.push(`${item.status.toUpperCase()} [${item.id}] ${item.message}`);
  }
  lines.push(`Summary: ${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail`);
  return lines.join("\n");
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

  const results = validateRunLog(options.logPath);
  if (options.json) {
    console.log(JSON.stringify({ results, summary: summarize(results) }, null, 2));
  } else {
    console.log(renderText(results));
  }

  if (summarize(results).fail > 0) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main();
}

export {
  VALID_EVENTS,
  VALID_PHASES,
  parseArgs,
  parseJsonLines,
  renderText,
  summarize,
  validateEvents,
  validateRunLog
};
