const VALID_PHASES = new Set([
  "setup",
  "artifact-inventory",
  "surface-map",
  "surface-function-map",
  "capability-map",
  "spec-job-queue",
  "context-pack",
  "process-action-map",
  "author-specs",
  "job",
  "descriptive",
  "rendered-ux",
  "technical",
  "spec-adequacy",
  "job-slice-evaluation",
  "system-coherence-evaluation",
  "quality-evaluation",
  "validation",
  "evaluation",
  "report",
  "handoff"
]);

const LEGACY_PHASES = new Set([
  "descriptive",
  "surface-map"
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

export {
  LEGACY_PHASES,
  VALID_EVENTS,
  VALID_PHASES
};
