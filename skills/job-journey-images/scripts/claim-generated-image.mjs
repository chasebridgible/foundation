#!/usr/bin/env node

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function usage() {
  return [
    "Usage:",
    "  node claim-generated-image.mjs --target-root <repo> --domain <domain> --job-slug <slug> --step-number <n> --stamp <path> [options]",
    "",
    "Options:",
    "  --generated-root <dir>       Defaults to ~/.codex/generated_images.",
    "  --run-manifest <path>        Marks the matching queue item image-copied.",
    "  --allow-multiple-newest      Use the newest image when more than one image is newer than the stamp.",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    if (key === "allow-multiple-newest") {
      args[key] = true;
      continue;
    }
    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

function requireArg(args, key) {
  if (!args[key]) throw new Error(`Missing required --${key}.\n${usage()}`);
  return args[key];
}

async function walkPngs(root) {
  const results = [];
  async function visit(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const filePath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await visit(filePath);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".png")) {
        const stat = await fs.stat(filePath);
        results.push({ filePath, mtimeMs: stat.mtimeMs, size: stat.size });
      }
    }
  }
  await visit(root);
  return results;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function markRunManifest(runManifestPath, jobSlug, stepNumber, sourceImage, targetImage) {
  if (!runManifestPath) return;
  const manifest = await readJson(runManifestPath);
  const job = manifest.jobs?.find((entry) => entry.jobSlug === jobSlug);
  const step = job?.steps?.find((entry) => Number(entry.number) === Number(stepNumber));
  if (!step) throw new Error(`Queue item not found in ${runManifestPath}: ${jobSlug} step ${stepNumber}`);
  step.status = "image-copied";
  step.generatedImageSource = sourceImage;
  step.imagePath = targetImage;
  step.updatedAt = new Date().toISOString();
  await writeJson(runManifestPath, manifest);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const targetRoot = path.resolve(requireArg(args, "target-root"));
  const domain = requireArg(args, "domain");
  const jobSlug = requireArg(args, "job-slug");
  const stepNumber = Number.parseInt(requireArg(args, "step-number"), 10);
  const stamp = path.resolve(requireArg(args, "stamp"));
  const generatedRoot = path.resolve(
    args["generated-root"] || path.join(os.homedir(), ".codex", "generated_images"),
  );
  const manifestPath = path.join(
    targetRoot,
    "docs",
    "knowledge",
    domain,
    "visuals",
    jobSlug,
    "manifest.json",
  );
  const manifest = await readJson(manifestPath);
  const step = manifest.steps.find((entry) => Number(entry.number) === stepNumber);
  if (!step) throw new Error(`Step ${stepNumber} not found in ${manifestPath}`);
  if (!existsSync(stamp)) throw new Error(`Stamp file not found: ${stamp}`);
  const stampStat = await fs.stat(stamp);
  const candidates = (await walkPngs(generatedRoot))
    .filter((entry) => entry.mtimeMs > stampStat.mtimeMs && entry.size > 0)
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (candidates.length === 0) {
    throw new Error(`No generated PNGs newer than ${stamp}`);
  }
  if (candidates.length > 1 && !args["allow-multiple-newest"]) {
    throw new Error(
      `Found ${candidates.length} generated PNGs newer than the stamp. Re-run immediately after a single image generation, or pass --allow-multiple-newest.`,
    );
  }

  const selected = candidates[0];
  const targetImage = path.join(path.dirname(manifestPath), step.imagePath);
  await fs.mkdir(path.dirname(targetImage), { recursive: true });
  await fs.copyFile(selected.filePath, targetImage);

  step.status = "image-copied";
  step.generatedImageSource = selected.filePath;
  step.updatedAt = new Date().toISOString();
  await writeJson(manifestPath, manifest);
  await markRunManifest(args["run-manifest"], jobSlug, stepNumber, selected.filePath, targetImage);

  console.log(
    JSON.stringify(
      {
        jobSlug,
        stepNumber,
        source: selected.filePath,
        target: targetImage,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
