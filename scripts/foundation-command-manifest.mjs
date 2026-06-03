import path from "node:path";

const targetFoundationCommands = [
  {
    name: "foundation:doctor",
    foundationScript: "scripts/foundation-doctor.mjs",
    args: ({ foundationRef }) => `--repo . --foundation ${shellQuote(foundationRef)}`
  },
  {
    name: "backfill:spec-job-queue:check",
    foundationScript: "scripts/spec-job-queue-report-check.mjs"
  },
  {
    name: "backfill:run-log:check",
    foundationScript: "scripts/backfill-run-log-check.mjs"
  },
  {
    name: "foundation:visible-business-graph:check",
    foundationScript: "scripts/visible-business-graph-check.mjs",
    args: () => "--repo ."
  },
  {
    name: "foundation:artifact-inventory:init",
    foundationScript: "scripts/artifact-inventory-init.mjs"
  },
  {
    name: "foundation:artifact-inventory:fill",
    foundationScript: "scripts/artifact-inventory-fill.mjs"
  },
  {
    name: "foundation:artifact-inventory:check",
    foundationScript: "scripts/artifact-inventory-check.mjs"
  },
  {
    name: "foundation:artifact-inventory:eval",
    foundationScript: "scripts/artifact-inventory-eval.mjs"
  },
  {
    name: "foundation:artifact-inventory:graph-check",
    foundationScript: "scripts/artifact-inventory-graph-check.mjs"
  },
  {
    name: "foundation:artifact-inventory:refresh",
    foundationScript: "scripts/artifact-inventory-refresh.mjs"
  },
  {
    name: "foundation:artifact-inventory:report",
    foundationScript: "scripts/artifact-inventory-report.mjs"
  },
  {
    name: "foundation:surface-function-map:init",
    foundationScript: "scripts/surface-function-map-init.mjs"
  },
  {
    name: "foundation:surface-function-map:fill",
    foundationScript: "scripts/surface-function-map-fill.mjs"
  },
  {
    name: "foundation:surface-function-map:check",
    foundationScript: "scripts/surface-function-map-check.mjs"
  },
  {
    name: "foundation:surface-function-map:eval",
    foundationScript: "scripts/surface-function-map-eval.mjs"
  },
  {
    name: "foundation:surface-function-map:refresh",
    foundationScript: "scripts/surface-function-map-refresh.mjs"
  },
  {
    name: "foundation:surface-function-map:report",
    foundationScript: "scripts/surface-function-map-report.mjs"
  },
  {
    name: "foundation:capability-map:init",
    foundationScript: "scripts/capability-map-init.mjs"
  },
  {
    name: "foundation:capability-map:fill",
    foundationScript: "scripts/capability-map-fill.mjs"
  },
  {
    name: "foundation:capability-map:check",
    foundationScript: "scripts/capability-map-check.mjs"
  },
  {
    name: "foundation:capability-map:eval",
    foundationScript: "scripts/capability-map-eval.mjs"
  },
  {
    name: "foundation:capability-map:refresh",
    foundationScript: "scripts/capability-map-refresh.mjs"
  },
  {
    name: "foundation:capability-map:report",
    foundationScript: "scripts/capability-map-report.mjs"
  },
  {
    name: "foundation:spec-job-queue:init",
    foundationScript: "scripts/spec-job-queue-init.mjs"
  },
  {
    name: "foundation:spec-job-queue:fill",
    foundationScript: "scripts/spec-job-queue-fill.mjs"
  },
  {
    name: "foundation:spec-job-queue:check",
    foundationScript: "scripts/spec-job-queue-check.mjs"
  },
  {
    name: "foundation:spec-job-queue:eval",
    foundationScript: "scripts/spec-job-queue-eval.mjs"
  },
  {
    name: "foundation:spec-job-queue:refresh",
    foundationScript: "scripts/spec-job-queue-refresh.mjs"
  },
  {
    name: "foundation:spec-job-queue:report",
    foundationScript: "scripts/spec-job-queue-report.mjs"
  },
  {
    name: "foundation:context-pack:init",
    foundationScript: "scripts/context-pack-init.mjs"
  },
  {
    name: "foundation:context-pack:fill",
    foundationScript: "scripts/context-pack-fill.mjs"
  },
  {
    name: "foundation:context-pack:check",
    foundationScript: "scripts/context-pack-check.mjs"
  },
  {
    name: "foundation:context-pack:eval",
    foundationScript: "scripts/context-pack-eval.mjs"
  },
  {
    name: "foundation:context-pack:refresh",
    foundationScript: "scripts/context-pack-refresh.mjs"
  },
  {
    name: "foundation:context-pack:report",
    foundationScript: "scripts/context-pack-report.mjs"
  },
  {
    name: "foundation:process-action-map:init",
    foundationScript: "scripts/process-action-map-init.mjs"
  },
  {
    name: "foundation:process-action-map:fill",
    foundationScript: "scripts/process-action-map-fill.mjs"
  },
  {
    name: "foundation:process-action-map:check",
    foundationScript: "scripts/process-action-map-check.mjs"
  },
  {
    name: "foundation:process-action-map:eval",
    foundationScript: "scripts/process-action-map-eval.mjs"
  },
  {
    name: "foundation:process-action-map:refresh",
    foundationScript: "scripts/process-action-map-refresh.mjs"
  },
  {
    name: "foundation:process-action-map:report",
    foundationScript: "scripts/process-action-map-report.mjs"
  },
  {
    name: "foundation:author-specs:init",
    foundationScript: "scripts/author-specs-init.mjs"
  },
  {
    name: "foundation:author-specs:fill",
    foundationScript: "scripts/author-specs-fill.mjs"
  },
  {
    name: "foundation:author-specs:check",
    foundationScript: "scripts/author-specs-check.mjs"
  },
  {
    name: "foundation:author-specs:eval",
    foundationScript: "scripts/author-specs-eval.mjs"
  },
  {
    name: "foundation:author-specs:refresh",
    foundationScript: "scripts/author-specs-refresh.mjs"
  },
  {
    name: "foundation:author-specs:report",
    foundationScript: "scripts/author-specs-report.mjs"
  }
];

function toPosix(value) {
  return value.split(path.sep).join("/");
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_@%+=:,./-]+$/.test(value)) return value;
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function relativeFoundationRef({ repoPath, foundationPath }) {
  const relative = toPosix(path.relative(repoPath, foundationPath));
  if (!relative) return ".";
  return relative;
}

function foundationScriptCommand(spec, { repoPath, foundationPath }) {
  const foundationRef = relativeFoundationRef({ repoPath, foundationPath });
  const scriptPath = toPosix(path.join(foundationRef, spec.foundationScript));
  const args = typeof spec.args === "function" ? spec.args({ foundationRef }) : spec.args;
  return ["node", shellQuote(scriptPath), args].filter(Boolean).join(" ");
}

function targetPackageScriptCommand(spec, options) {
  return foundationScriptCommand(spec, options);
}

function targetPackageScriptManifest(options) {
  return Object.fromEntries(targetFoundationCommands.map(spec => [
    spec.name,
    targetPackageScriptCommand(spec, options)
  ]));
}

export {
  targetFoundationCommands,
  targetPackageScriptCommand,
  targetPackageScriptManifest
};
