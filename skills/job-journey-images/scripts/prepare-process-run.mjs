#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";

const STYLE_ID = "airport-safety-card-business-operations";
const CORE_STYLE =
  "Airport safety card style for business operations. Simple, flat instructional illustrations that show one physical action per panel. Clean black outlines, limited colors, off-white background, limited decorative detail, clean, with limited facial expression. Each panel should make the action understandable in two seconds. Use symbols and simple props where helpful. The image itself should be wordless as the text for the action will be shown in a separate step.";

function usage() {
  return [
    "Usage:",
    "  node prepare-process-run.mjs --target-root <repo> --source <process.md> --domain <domain> --run-id <id> [options]",
    "",
    "Options:",
    "  --processes <all|slug,title>   Process filter. Defaults to all.",
    "  --out <path>                   Run manifest path. Defaults to <cwd>/outputs/<run-id>/job-journey-images/process-run.json.",
    "  --dry-run                      Print the run manifest without writing target files.",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    if (key === "dry-run") {
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

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function stripProcessSuffix(value) {
  return value.replace(/\s+Process$/i, "").trim();
}

function stripHeadingNumber(value) {
  return value.replace(/^\d+\.\s*/, "").trim();
}

function relativeOrAbsolute(fromRoot, filePath) {
  const relativePath = path.relative(fromRoot, filePath);
  return relativePath.startsWith("..") ? filePath : relativePath;
}

function parseProcesses(markdown) {
  const headingPattern = /^##\s+(.+)$/gm;
  const headings = [...markdown.matchAll(headingPattern)].filter((match) =>
    /^\d+\.\s+/.test(match[1].trim()),
  );
  const processes = [];

  for (let i = 0; i < headings.length; i += 1) {
    const match = headings[i];
    const next = headings[i + 1];
    const headingText = match[1].trim();
    const title = stripHeadingNumber(headingText);
    const body = markdown.slice(
      match.index + match[0].length,
      next ? next.index : markdown.length,
    );
    const lines = body.split(/\r?\n/);
    const summaryLines = [];
    const steps = [];
    let currentStep = null;

    for (const line of lines) {
      const stepMatch = line.match(/^\s*\d+\.\s+\*\*(.+?)\*\*\s*$/);
      if (stepMatch) {
        if (currentStep) steps.push(currentStep);
        currentStep = {
          number: steps.length + 1,
          title: stepMatch[1].trim(),
          description: "",
        };
        continue;
      }

      if (currentStep) {
        if (line.trim()) {
          currentStep.description = currentStep.description
            ? `${currentStep.description} ${line.trim()}`
            : line.trim();
        }
        continue;
      }

      if (line.trim()) summaryLines.push(line.trim());
    }

    if (currentStep) steps.push(currentStep);
    if (steps.length > 0) {
      processes.push({
        heading: `## ${headingText}`,
        title,
        slug: slugify(stripProcessSuffix(title)),
        summary: summaryLines.join(" "),
        steps,
      });
    }
  }

  return processes;
}

function filterProcesses(processes, filterValue) {
  if (!filterValue || filterValue === "all") return processes;
  const wanted = new Set(
    filterValue
      .split(",")
      .map((entry) => slugify(stripProcessSuffix(entry.trim())))
      .filter(Boolean),
  );
  return processes.filter((process) => wanted.has(process.slug));
}

function buildPrompt({ process, step }) {
  return [
    "Create one completely wordless instructional illustration with abstract marks only.",
    "",
    `Style: ${CORE_STYLE}`,
    "",
    "Wordless guard: no letters, no numbers, no labels, no readable UI, no readable signs.",
    `Process: ${process.title}.`,
    `Source step title: ${step.title}`,
    `Source step description: ${step.description}`,
    `Action: Show this step as one clear physical business action: ${step.title}`,
    "Scene: Simple business operations environment relevant to the process.",
    "Subject: Human actor, practical store or office props, abstract paperwork or interface blocks, simple sequence symbols where useful.",
    "Composition: One clear panel, centered action, generous padding, uncluttered layout.",
    "Color: Off-white background, black line art, muted accent colors only.",
    "Image content: Wordless business action, abstract paperwork marks, simple props, flat instructional style.",
    "",
  ].join("\n");
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, value, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const targetRoot = path.resolve(requireArg(args, "target-root"));
  const source = path.resolve(requireArg(args, "source"));
  const domain = requireArg(args, "domain");
  const runId = requireArg(args, "run-id");
  const dryRun = Boolean(args["dry-run"]);
  const out = path.resolve(
    args.out || path.join(process.cwd(), "outputs", runId, "job-journey-images", "process-run.json"),
  );
  const sourceRelative = relativeOrAbsolute(targetRoot, source);
  const markdown = await fs.readFile(source, "utf8");
  const selectedProcesses = filterProcesses(parseProcesses(markdown), args.processes);

  if (selectedProcesses.length === 0) {
    throw new Error("No matching processes found in source document.");
  }

  const runManifest = {
    runId,
    createdAt: new Date().toISOString(),
    targetRoot,
    domain,
    source: sourceRelative,
    style: STYLE_ID,
    jobs: [],
  };

  for (const process of selectedProcesses) {
    const visualRoot = path.join(
      targetRoot,
      "docs",
      "knowledge",
      domain,
      "visuals",
      process.slug,
    );
    const presentationPath = path.join(
      "docs",
      "knowledge",
      domain,
      "presentations",
      process.slug,
      `${process.slug}-process.pptx`,
    );
    const manifest = {
      jobSlug: process.slug,
      jobTitle: process.title,
      source: sourceRelative,
      sourceHeading: process.heading,
      summary: process.summary,
      style: STYLE_ID,
      steps: process.steps.map((step) => {
        const stepSlug = slugify(step.title);
        return {
          number: step.number,
          slug: stepSlug,
          title: step.title,
          description: step.description,
          promptPath: `prompts/${String(step.number).padStart(2, "0")}-${stepSlug}.prompt.md`,
          imagePath: `images/${String(step.number).padStart(2, "0")}-${stepSlug}.png`,
          status: "pending-image",
        };
      }),
    };

    if (!dryRun) {
      await writeJson(path.join(visualRoot, "manifest.json"), manifest);
      for (const step of manifest.steps) {
        await writeText(
          path.join(visualRoot, step.promptPath),
          buildPrompt({ process, step }),
        );
      }
    }

    runManifest.jobs.push({
      jobSlug: process.slug,
      jobTitle: process.title,
      summary: process.summary,
      manifestPath: path.relative(targetRoot, path.join(visualRoot, "manifest.json")),
      presentationPath,
      steps: manifest.steps.map((step) => ({
        stepId: `${process.slug}/${String(step.number).padStart(2, "0")}-${step.slug}`,
        number: step.number,
        title: step.title,
        description: step.description,
        promptPath: path.join(path.dirname(path.join(visualRoot, "manifest.json")), step.promptPath),
        imagePath: path.join(path.dirname(path.join(visualRoot, "manifest.json")), step.imagePath),
        status: step.status,
      })),
    });
  }

  if (!dryRun) await writeJson(out, runManifest);
  console.log(JSON.stringify(runManifest, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
