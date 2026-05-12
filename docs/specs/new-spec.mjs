#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const specsDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.dirname(specsDir);
const repoRoot = path.dirname(docsDir);
const repoName = path.basename(repoRoot);
const allowedTypes = new Set(["descriptive", "technical", "test", "process", "linking", "template"]);

const typeSections = {
  descriptive: [
    ["product-intent", "product-intent", "Product intent"],
    ["user-model", "user-model", "User model"],
    ["interface-journey", "journey", "Interface journey"],
    ["states-and-rules", "states-rules", "States and rules"],
    ["test-coverage", "coverage", "Test coverage"]
  ],
  technical: [
    ["required-depth", "decision-rule", "Required depth"],
    ["internal-sequence", "sequence", "Internal sequence"],
    ["contracts", "contracts", "Contracts"],
    ["failure-modes", "failure-modes", "Failure modes"],
    ["paths-and-coverage", "links-coverage", "Paths and coverage"]
  ],
  test: [
    ["verification-contract", "verification-contract", "Verification contract"],
    ["acceptance-mapping", "acceptance", "Acceptance mapping"],
    ["coverage-plan", "coverage", "Coverage plan"],
    ["commands-and-evidence", "evidence", "Commands and evidence"],
    ["gaps-and-followups", "gaps", "Gaps and follow-ups"]
  ],
  process: [
    ["workflow-contract", "process-contract", "Workflow contract"],
    ["reading-order", "progressive-disclosure", "Reading order"],
    ["update-obligations", "maintenance", "Update obligations"]
  ],
  linking: [
    ["html-native-metadata", "machine-contract", "HTML-native metadata"],
    ["resolution", "agent-navigation", "Resolution"],
    ["path-update-loop", "maintenance", "Path update loop"]
  ],
  template: [
    ["template-contract", "template-contract", "Template contract"],
    ["required-placeholders", "authoring-contract", "Required placeholders"],
    ["copy-rule", "maintenance", "Copy rule"]
  ]
};

function usage() {
  return `Usage:
  npm run spec:new -- --type descriptive --id product.feature.descriptive --title "Feature Descriptive Spec" --out docs/specs/features/feature-descriptive.html

Required:
  --type              descriptive, technical, test, process, linking, or template
  --id                stable dotted spec id
  --title             human-readable spec title
  --out               output .html path under docs/specs

Optional:
  --parent            parent spec id
  --status            draft or active (default: draft)
  --confidence        low, medium, or high (default: low)
  --review-cadence    per-change, monthly, quarterly, or on-trigger (default: per-change)
  --tag               repeatable tag
  --force             overwrite an existing file
  --dry-run           validate inputs without writing the file`;
}

function parseArgs(argv) {
  const args = { tags: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (key === "force" || key === "dry-run") {
      args[key] = true;
      continue;
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    index += 1;
    if (key === "tag") args.tags.push(value);
    else args[key] = value;
  }
  return args;
}

function fail(message) {
  console.error(message);
  console.error("");
  console.error(usage());
  process.exit(1);
}

function html(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slash(file) {
  return file.split(path.sep).join("/");
}

function relativeFromOutput(outputPath, targetPath) {
  const relativePath = slash(path.relative(path.dirname(outputPath), targetPath));
  if (relativePath.startsWith(".")) return relativePath;
  return `./${relativePath}`;
}

function repoPathFor(file) {
  return `${repoName}/${slash(path.relative(repoRoot, file))}`;
}

function navNumber(index) {
  return String(index + 1).padStart(2, "0");
}

function renderSpec({ args, outputPath }) {
  const sections = typeSections[args.type];
  const date = new Date().toISOString().slice(0, 10);
  const metadata = {
    id: args.id,
    title: args.title,
    type: args.type,
    status: args.status || "draft",
    lastUpdated: date,
    reviewCadence: args["review-cadence"] || "per-change",
    confidence: args.confidence || "low",
    parent: args.parent || null,
    children: [],
    relatedSpecs: [],
    ownedPaths: [
      { path: repoPathFor(outputPath), kind: "doc", ownership: "direct" }
    ],
    implementationPaths: [],
    coverage: [],
    tags: [...new Set([args.type, ...args.tags])]
  };
  const stylesheet = relativeFromOutput(outputPath, path.join(specsDir, "spec-system.css"));
  const registry = relativeFromOutput(outputPath, path.join(specsDir, "index.html"));
  const siteMap = relativeFromOutput(outputPath, path.join(docsDir, "site-map.js"));
  const siteNav = relativeFromOutput(outputPath, path.join(docsDir, "site-nav.js"));
  const firstSection = sections[0][0];

  const nav = sections.map(([id, , title], index) => {
    const active = index === 0 ? " active" : "";
    return `    <a class="nav-item${active}" href="#${id}"><span class="nav-num">${navNumber(index)}</span>${html(title)}</a>`;
  }).join("\n");

  const bodySections = sections.map(([id, sectionType, title], index) => {
    const canonical = index === 0 ? ' data-spec-canonical="true"' : "";
    const heading = index === 0 ? "h1" : "h2";
    return `    <section id="${id}" data-spec-section="${id}" data-section-type="${sectionType}"${canonical}>
      <${heading}>${html(title)}</${heading}>
      <p>[Write this section before using the spec to drive implementation.]</p>
    </section>`;
  }).join("\n\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="spec:id" content="${html(args.id)}">
<meta name="spec:type" content="${html(args.type)}">
<meta name="spec:status" content="${html(metadata.status)}">
<meta name="spec:last-updated" content="${date}">
<title>${html(args.title)}</title>
<link rel="stylesheet" href="${stylesheet}">
<link rel="spec-registry" href="${registry}">
<script type="application/json" id="spec-metadata">
${JSON.stringify(metadata, null, 2)}
</script>
</head>
<body>
<nav class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-mark">${html(args.type[0].toUpperCase())}</div>
    <div>
      <div class="sidebar-title">${html(args.title)}</div>
      <div class="sidebar-sub">${html(args.type)} spec</div>
    </div>
  </div>
  <div class="nav-section">
    <div class="nav-label">Sections</div>
${nav}
  </div>
</nav>

<main class="main">
  <section id="overview" data-spec-section="overview" data-section-type="summary">
    <div class="spec-eyebrow">${html(repoPathFor(outputPath))}</div>
    <h1>${html(args.title)}</h1>
    <p class="lede">[Replace with the durable intent this spec owns.]</p>
    <div class="meta-row">
      <div><strong>Status:</strong> ${html(metadata.status)}</div>
      <div><strong>Updated:</strong> ${date}</div>
      <div><strong>Canonical section:</strong> <a href="#${firstSection}">#${firstSection}</a></div>
    </div>
  </section>

  <article class="doc-body">
${bodySections}
  </article>

  <hr>
  <p class="footer-note">${html(args.title)} · generated starter spec</p>
</main>
<script src="${siteMap}"></script>
<script src="${siteNav}"></script>
</body>
</html>
`;
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  fail(error.message);
}

for (const required of ["type", "id", "title", "out"]) {
  if (!args[required]) fail(`Missing required --${required}`);
}
if (!allowedTypes.has(args.type)) fail(`Invalid --type: ${args.type}`);
if (!/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(args.id)) fail(`Invalid --id: ${args.id}`);
if (args.status && !["draft", "active"].includes(args.status)) fail(`Invalid --status: ${args.status}`);
if (args.confidence && !["low", "medium", "high"].includes(args.confidence)) {
  fail(`Invalid --confidence: ${args.confidence}`);
}

const outputPath = path.resolve(repoRoot, args.out);
const relativeToSpecs = path.relative(specsDir, outputPath);
if (relativeToSpecs.startsWith("..") || path.isAbsolute(relativeToSpecs)) {
  fail("--out must be inside docs/specs");
}
if (!outputPath.endsWith(".html")) fail("--out must end with .html");
if (fs.existsSync(outputPath) && !args.force) fail(`${args.out} already exists; pass --force to overwrite`);

const content = renderSpec({ args, outputPath });

if (args["dry-run"]) {
  console.log(`Spec scaffold is valid: ${slash(path.relative(repoRoot, outputPath))}`);
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content);
  console.log(`Created ${slash(path.relative(repoRoot, outputPath))}`);
  console.log("Next: fill the spec, run npm run spec:registry, then npm run spec:check.");
}
