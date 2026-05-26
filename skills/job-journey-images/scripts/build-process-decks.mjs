#!/usr/bin/env node

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function usage() {
  return [
    "Usage:",
    "  node build-process-decks.mjs --target-root <repo> --domain <domain> --presentations-skill-dir <dir> [options]",
    "",
    "Options:",
    "  --jobs <all|slug,slug>       Job filter. Defaults to all visual manifests.",
    "  --source <process.md>        Source document fallback for older manifests without descriptions.",
    "  --run-id <id>                Scratch run id. Defaults to manual timestamp.",
    "  --workspace-root <dir>       Scratch root. Defaults to <cwd>/outputs/<run-id>/job-journey-images/decks.",
  ].join("\n");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

function requireArg(args, key) {
  if (!args[key]) throw new Error(`Missing required --${key}.\n${usage()}`);
  return args[key];
}

function stripHeadingNumber(value) {
  return value.replace(/^\d+\.\s*/, "").trim();
}

function stripProcessSuffix(value) {
  return value.replace(/\s+Process$/i, "").trim();
}

function parseSourceProcesses(markdown) {
  const headingPattern = /^##\s+(.+)$/gm;
  const headings = [...markdown.matchAll(headingPattern)].filter((match) =>
    /^\d+\.\s+/.test(match[1].trim()),
  );
  const processes = new Map();

  for (let i = 0; i < headings.length; i += 1) {
    const match = headings[i];
    const next = headings[i + 1];
    const title = stripHeadingNumber(match[1].trim());
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
        currentStep = { title: stepMatch[1].trim(), description: "" };
        continue;
      }
      if (currentStep) {
        if (line.trim()) {
          currentStep.description = currentStep.description
            ? `${currentStep.description} ${line.trim()}`
            : line.trim();
        }
      } else if (line.trim()) {
        summaryLines.push(line.trim());
      }
    }

    if (currentStep) steps.push(currentStep);
    const record = { title, summary: summaryLines.join(" "), steps };
    processes.set(title, record);
    processes.set(stripProcessSuffix(title), record);
  }

  return processes;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function discoverJobs(visualRoot, jobsArg) {
  const entries = await fs.readdir(visualRoot, { withFileTypes: true });
  const allJobs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  if (!jobsArg || jobsArg === "all") return allJobs;
  const wanted = new Set(jobsArg.split(",").map((entry) => entry.trim()).filter(Boolean));
  return allJobs.filter((job) => wanted.has(job));
}

function layoutForStepCount(count) {
  if (count <= 5) return { columns: count, rows: 1 };
  if (count === 6) return { columns: 3, rows: 2 };
  if (count <= 8) return { columns: 4, rows: 2 };
  return { columns: 5, rows: 2 };
}

function mergeSource(manifest, sourceProcesses) {
  const source = sourceProcesses.get(manifest.jobTitle) || sourceProcesses.get(stripProcessSuffix(manifest.jobTitle));
  const steps = manifest.steps.map((step, index) => ({
    title: step.title,
    description: step.description || source?.steps?.[index]?.description || "",
    imagePath: step.imagePath,
  }));
  return {
    title: source?.title || manifest.jobTitle,
    summary: manifest.summary || source?.summary || "",
    steps,
  };
}

function slideModuleSource(data) {
  return `const DATA = ${JSON.stringify(data, null, 2)};

function sizeFor(role) {
  if (role === "title") return DATA.steps.length >= 9 ? 11 : DATA.steps.length >= 7 ? 12 : 13;
  return DATA.steps.length >= 9 ? 8.4 : DATA.steps.length >= 7 ? 9.4 : 10.5;
}

function arrow(slide, ctx, text, x, y, size) {
  ctx.addText(slide, {
    text,
    x,
    y,
    w: size,
    h: size,
    fontSize: size * 0.82,
    bold: true,
    color: "#4F5D68",
    align: "center",
    valign: "mid",
    typeface: ctx.fonts.title,
  });
}

export async function slide01(presentation, ctx) {
  const slide = presentation.slides.add();
  const W = ctx.W;
  const H = ctx.H;
  const marginX = 34;
  const gridTop = DATA.layout.rows === 1 ? 148 : 122;
  const gridBottom = 34;
  const gapX = DATA.layout.columns >= 5 ? 14 : 18;
  const gapY = 22;
  const columns = DATA.layout.columns;
  const rows = DATA.layout.rows;
  const cardW = (W - marginX * 2 - gapX * (columns - 1)) / columns;
  const availableCardH = (H - gridTop - gridBottom - gapY * (rows - 1)) / rows;
  const cardH = rows === 1 ? Math.min(448, availableCardH) : availableCardH;
  const imageH = rows === 1 ? Math.min(230, cardH * 0.5) : Math.min(112, cardH * 0.45);
  const titleH = DATA.steps.length >= 9 ? 31 : 34;

  ctx.addShape(slide, { x: 0, y: 0, w: W, h: H, fill: "#F8F3EA", line: ctx.line("#00000000", 0) });
  ctx.addText(slide, {
    text: DATA.title,
    x: marginX,
    y: 24,
    w: 820,
    h: 34,
    fontSize: 27,
    bold: true,
    color: "#17212A",
    typeface: ctx.fonts.title,
  });
  ctx.addText(slide, {
    text: DATA.summary,
    x: marginX,
    y: 62,
    w: 900,
    h: 42,
    fontSize: 12.5,
    color: "#3C4852",
    typeface: ctx.fonts.body,
  });
  ctx.addText(slide, {
    text: DATA.footer,
    x: W - 284,
    y: 31,
    w: 250,
    h: 24,
    fontSize: 11,
    color: "#5F6D78",
    align: "right",
    typeface: ctx.fonts.body,
  });

  for (let index = 0; index < DATA.steps.length; index += 1) {
    const step = DATA.steps[index];
    const row = Math.floor(index / columns);
    const col = index % columns;
    const x = marginX + col * (cardW + gapX);
    const y = gridTop + row * (cardH + gapY);
    const pad = DATA.steps.length >= 9 ? 8 : 10;

    ctx.addShape(slide, { x, y, w: cardW, h: cardH, fill: "#FFFDF8", line: ctx.line("#2A3035", 1) });
    await ctx.addImage(slide, {
      path: step.imagePath,
      x: x + pad,
      y: y + pad,
      w: cardW - pad * 2,
      h: imageH,
      fit: "contain",
      alt: step.title,
    });
    ctx.addText(slide, {
      text: step.title,
      x: x + 12,
      y: y + pad + imageH + 9,
      w: cardW - 24,
      h: titleH,
      fontSize: sizeFor("title"),
      bold: true,
      color: "#18242D",
      typeface: ctx.fonts.title,
    });
    ctx.addText(slide, {
      text: step.description,
      x: x + 12,
      y: y + pad + imageH + 9 + titleH + 4,
      w: cardW - 24,
      h: Math.max(46, cardH - imageH - titleH - pad - 24),
      fontSize: sizeFor("body"),
      color: "#3E4952",
      typeface: ctx.fonts.body,
    });

    if (col < columns - 1 && index < DATA.steps.length - 1) {
      arrow(slide, ctx, "\\u2192", x + cardW + (gapX - 18) / 2, y + imageH * 0.42, 18);
    } else if (rows > 1 && row < rows - 1 && index < DATA.steps.length - 1) {
      arrow(slide, ctx, "\\u2193", x + cardW / 2 - 9, y + cardH + (gapY - 18) / 2, 18);
    }
  }

  return slide;
}
`;
}

async function buildDeck({ targetRoot, domain, jobSlug, manifest, sourceProcesses, workspaceRoot, buildScript }) {
  const visualRoot = path.join(targetRoot, "docs", "knowledge", domain, "visuals", jobSlug);
  const outputDir = path.join(targetRoot, "docs", "knowledge", domain, "presentations", jobSlug);
  const outputPptx = path.join(outputDir, `${jobSlug}-process.pptx`);
  const workspace = path.join(workspaceRoot, jobSlug);
  const slidesDir = path.join(workspace, "slides");
  const previewDir = path.join(workspace, "preview");
  const layoutDir = path.join(workspace, "layout");
  const processData = mergeSource(manifest, sourceProcesses);
  const data = {
    title: processData.title,
    summary: processData.summary,
    footer: `${domain} process`,
    layout: layoutForStepCount(processData.steps.length),
    steps: processData.steps.map((step) => ({
      title: step.title,
      description: step.description,
      imagePath: path.join(visualRoot, step.imagePath),
    })),
  };

  await fs.mkdir(slidesDir, { recursive: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(slidesDir, "slide-01.mjs"), slideModuleSource(data), "utf8");
  const result = spawnSync(
    "node",
    [
      buildScript,
      "--workspace",
      workspace,
      "--slides-dir",
      slidesDir,
      "--out",
      outputPptx,
      "--preview-dir",
      previewDir,
      "--layout-dir",
      layoutDir,
      "--manifest",
      path.join(workspace, "artifact-build-manifest.json"),
      "--contact-sheet",
      path.join(previewDir, "contact-sheet.png"),
      "--slide-count",
      "1",
      "--slide-size",
      "1280x720",
      "--scale",
      "1",
    ],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    throw new Error([`Deck build failed for ${jobSlug}.`, result.stdout, result.stderr].filter(Boolean).join("\n"));
  }

  const buildManifest = JSON.parse(result.stdout);
  return {
    jobSlug,
    pptx: outputPptx,
    preview: buildManifest.previewPaths?.[0],
    bytes: buildManifest.outputBytes,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }

  const targetRoot = path.resolve(requireArg(args, "target-root"));
  const domain = requireArg(args, "domain");
  const presentationsSkillDir = path.resolve(requireArg(args, "presentations-skill-dir"));
  const buildScript = path.join(presentationsSkillDir, "scripts", "build_artifact_deck.mjs");
  if (!existsSync(buildScript)) throw new Error(`Presentation build script not found: ${buildScript}`);
  const runId = args["run-id"] || `manual-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`;
  const workspaceRoot = path.resolve(
    args["workspace-root"] || path.join(process.cwd(), "outputs", runId, "job-journey-images", "decks"),
  );
  const visualRoot = path.join(targetRoot, "docs", "knowledge", domain, "visuals");
  const jobs = await discoverJobs(visualRoot, args.jobs);
  const sourceProcesses = args.source
    ? parseSourceProcesses(await fs.readFile(path.resolve(args.source), "utf8"))
    : new Map();
  const results = [];

  for (const jobSlug of jobs) {
    const manifest = await readJson(path.join(visualRoot, jobSlug, "manifest.json"));
    results.push(
      await buildDeck({
        targetRoot,
        domain,
        jobSlug,
        manifest,
        sourceProcesses,
        workspaceRoot,
        buildScript,
      }),
    );
  }

  console.log(JSON.stringify({ runId, workspaceRoot, results }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
