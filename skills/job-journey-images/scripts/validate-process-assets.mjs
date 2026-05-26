#!/usr/bin/env node

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function usage() {
  return [
    "Usage:",
    "  node validate-process-assets.mjs --target-root <repo> --domain <domain> [options]",
    "",
    "Options:",
    "  --jobs <all|slug,slug>       Job filter. Defaults to all visual manifests.",
    "  --require-decks              Require a one-slide PPTX for each job.",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    if (key === "require-decks") {
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

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function pptxSlideCount(pptxPath) {
  const result = spawnSync("unzip", ["-l", pptxPath, "ppt/slides/slide*.xml"], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`Unable to inspect PPTX slides for ${pptxPath}: ${result.stderr.trim()}`);
  }
  return result.stdout
    .split(/\r?\n/)
    .filter((line) => /ppt\/slides\/slide[0-9]+\.xml$/.test(line.trim())).length;
}

async function discoverJobs(visualRoot, jobsArg) {
  const entries = await fs.readdir(visualRoot, { withFileTypes: true });
  const allJobs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (!jobsArg || jobsArg === "all") return allJobs;
  const wanted = new Set(jobsArg.split(",").map((entry) => entry.trim()).filter(Boolean));
  return allJobs.filter((job) => wanted.has(job));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const targetRoot = path.resolve(requireArg(args, "target-root"));
  const domain = requireArg(args, "domain");
  const visualRoot = path.join(targetRoot, "docs", "knowledge", domain, "visuals");
  const presentationRoot = path.join(targetRoot, "docs", "knowledge", domain, "presentations");
  const jobs = await discoverJobs(visualRoot, args.jobs);
  const errors = [];
  const summary = {
    targetRoot,
    domain,
    jobs: [],
    totals: { jobs: 0, steps: 0, images: 0, prompts: 0, decks: 0 },
  };

  for (const jobSlug of jobs) {
    const manifestPath = path.join(visualRoot, jobSlug, "manifest.json");
    if (!existsSync(manifestPath)) {
      errors.push(`Missing manifest: ${manifestPath}`);
      continue;
    }
    const manifest = await readJson(manifestPath);
    const jobSummary = {
      jobSlug,
      jobTitle: manifest.jobTitle,
      steps: manifest.steps?.length || 0,
      prompts: 0,
      images: 0,
      deckSlides: null,
    };

    for (const step of manifest.steps || []) {
      const promptPath = path.join(path.dirname(manifestPath), step.promptPath);
      const imagePath = path.join(path.dirname(manifestPath), step.imagePath);
      if (existsSync(promptPath)) jobSummary.prompts += 1;
      else errors.push(`Missing prompt: ${promptPath}`);
      if (existsSync(imagePath)) jobSummary.images += 1;
      else errors.push(`Missing image: ${imagePath}`);
    }

    const pptxPath = path.join(presentationRoot, jobSlug, `${jobSlug}-process.pptx`);
    if (existsSync(pptxPath)) {
      const slideCount = pptxSlideCount(pptxPath);
      jobSummary.deckSlides = slideCount;
      if (slideCount !== 1) errors.push(`Expected one slide in ${pptxPath}; found ${slideCount}`);
      summary.totals.decks += 1;
    } else if (args["require-decks"]) {
      errors.push(`Missing deck: ${pptxPath}`);
    }

    summary.jobs.push(jobSummary);
    summary.totals.jobs += 1;
    summary.totals.steps += jobSummary.steps;
    summary.totals.prompts += jobSummary.prompts;
    summary.totals.images += jobSummary.images;
  }

  summary.errors = errors;
  console.log(JSON.stringify(summary, null, 2));
  if (errors.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
