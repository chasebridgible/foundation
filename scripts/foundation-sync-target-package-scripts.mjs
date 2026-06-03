#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { targetPackageScriptManifest } from "./foundation-command-manifest.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const foundationRoot = path.dirname(path.dirname(scriptPath));

function usage() {
  return `Usage:
  npm run foundation:target-scripts:sync -- --repo /path/to/target [--foundation /path/to/foundation] [--dry-run] [--json]

Adds or refreshes target package.json aliases for Foundation-backed doctor, backfill, and graph commands.`;
}

function parseArgs(argv) {
  const options = {
    repoPath: null,
    foundationPath: foundationRoot,
    dryRun: false,
    json: false,
    help: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help") return { ...options, help: true };
    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (token === "--json") {
      options.json = true;
      continue;
    }
    if (token === "--repo" || token === "--foundation") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${token}`);
      index += 1;
      if (token === "--repo") options.repoPath = path.resolve(value);
      if (token === "--foundation") options.foundationPath = path.resolve(value);
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.help && !options.repoPath) throw new Error("Missing --repo");
  return options;
}

function readPackageJson(packagePath) {
  if (!fs.existsSync(packagePath)) {
    throw new Error(`Target package.json does not exist: ${packagePath}`);
  }
  return JSON.parse(fs.readFileSync(packagePath, "utf8"));
}

function syncPackageScripts({ repoPath, foundationPath, dryRun = false }) {
  const packagePath = path.join(repoPath, "package.json");
  const packageJson = readPackageJson(packagePath);
  const expected = targetPackageScriptManifest({ repoPath, foundationPath });
  const scripts = { ...(packageJson.scripts || {}) };
  const added = [];
  const updated = [];

  for (const [name, command] of Object.entries(expected)) {
    if (scripts[name] === command) continue;
    if (scripts[name] === undefined) added.push(name);
    else updated.push({ name, before: scripts[name], after: command });
    scripts[name] = command;
  }

  const nextPackageJson = {
    ...packageJson,
    scripts
  };

  if (!dryRun && (added.length > 0 || updated.length > 0)) {
    fs.writeFileSync(packagePath, `${JSON.stringify(nextPackageJson, null, 2)}\n`, "utf8");
  }

  return {
    packagePath,
    added,
    updated,
    changed: added.length > 0 || updated.length > 0,
    dryRun
  };
}

function renderText(result) {
  const lines = ["Foundation target package scripts sync"];
  lines.push(`Package: ${result.packagePath}`);
  lines.push(`Added: ${result.added.length}`);
  lines.push(`Updated: ${result.updated.length}`);
  lines.push(result.changed
    ? result.dryRun ? "Result: changes needed; package.json not written because --dry-run was used." : "Result: package.json updated."
    : "Result: package.json already has current Foundation aliases.");
  if (result.added.length > 0) lines.push(`Added scripts: ${result.added.join(", ")}`);
  if (result.updated.length > 0) lines.push(`Updated scripts: ${result.updated.map(item => item.name).join(", ")}`);
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

  const result = syncPackageScripts(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else console.log(renderText(result));
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    console.error("");
    console.error(usage());
    process.exit(2);
  }
}

export {
  parseArgs,
  renderText,
  syncPackageScripts
};
