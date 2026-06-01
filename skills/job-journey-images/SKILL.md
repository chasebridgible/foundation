---
name: job-journey-images
description: Generate wordless airport-safety-card-style instructional images and one-slide process canvases for a business job or process, saving prompts, images, manifests, and presentation outputs into the target repo for later use in PDFs, decks, process docs, or app screens.
---

# Job Journey Images

Use this skill when a user wants visual assets for the actions in a job, SOP, checklist, training flow, or business process.

Use the bundled scripts for batch work. They keep the run queue, file naming, asset validation, and deck export deterministic while leaving image generation itself to Codex imagegen.

## Core Style

Use this exact style direction as the base for every generated image:

> Airport safety card style for business operations. Simple, flat instructional illustrations that show one physical action per panel. Clean black outlines, limited colors, off-white background, limited decorative detail, clean, with limited facial expression. Each panel should make the action understandable in two seconds: a manager checking an invoice, scanning a case, separating damaged product, creating a pending credit, handing off a follow-up task. Use symbols and simple props where helpful. The image itself should be wordless as the text for the action will be shown in a separate step.

## Queue Workflow

1. Pick one source document and domain. The source document is the copy authority for process title, step title, and step description.
2. Create a run manifest and target folders before generating images:

```bash
node <skill-dir>/scripts/prepare-process-run.mjs \
  --target-root <target-repo> \
  --source <target-repo>/docs/knowledge/<domain>/<source>.md \
  --domain <domain> \
  --run-id <run-id> \
  --processes all
```

3. Treat `outputs/<run-id>/job-journey-images/process-run.json` as the queue. Each queue item has a stable `stepId`, prompt path, target image path, and status.
4. For each pending queue item, create a stamp, generate one image from that step's prompt, then immediately claim the generated file into the target repo:

```bash
touch /private/tmp/<run-id>-<step-id>.stamp
# Use imagegen with the prompt file for exactly one step.
node <skill-dir>/scripts/claim-generated-image.mjs \
  --target-root <target-repo> \
  --domain <domain> \
  --job-slug <job-slug> \
  --step-number <n> \
  --stamp /private/tmp/<run-id>-<step-id>.stamp \
  --run-manifest outputs/<run-id>/job-journey-images/process-run.json
```

5. Resume by reading the queue and existing target files. Completed image files stay in place; pending items continue from their step id.
6. Build one-slide process decks after images are complete. Use the Presentations skill and this helper when artifact-tool is available:

```bash
node <skill-dir>/scripts/build-process-decks.mjs \
  --target-root <target-repo> \
  --domain <domain> \
  --source <target-repo>/docs/knowledge/<domain>/<source>.md \
  --presentations-skill-dir <presentations-skill-dir> \
  --run-id <run-id>
```

7. Validate before handoff:

```bash
node <skill-dir>/scripts/validate-process-assets.mjs \
  --target-root <target-repo> \
  --domain <domain> \
  --require-decks
```

## Graph Metadata

Generated images and one-slide process canvases are evidence artifacts. When a job spec, capability spec, or process doc references them, update that spec's `graph-metadata` so the relevant process or job node is linked to an `evidence` node with `evidenced-by`. Do not make the image or deck the canonical process source; the source spec or source document remains canonical. After spec edits, run `npm run foundation:visible-business-graph:check -- --repo <target-repo>`.

## One-Slide Process Canvas

When the user asks for a process deck, create one PowerPoint file per process, with one slide per file:

1. Read the source document and visual manifest.
2. Map image paths by step number.
3. Create a 16:9 slide with title and process summary at the top.
4. Place panels left to right, top to bottom.
5. Put image above title and description.
6. Add visible sequence arrows between panels.
7. Preserve source wording verbatim for titles and descriptions.
8. Fit copy with compact panel widths, smaller body type, balanced line height, generous margins, and panel heights that keep text inside its area.
9. Save final decks under:
   - `docs/knowledge/<domain>/presentations/<job-slug>/<job-slug>-process.pptx`

## Prompt Shape

Use this prompt structure:

```text
Create one wordless instructional illustration.

Style: <Core Style>

Wordless guard: no letters, no numbers, no labels, no readable UI, no readable signs.
Process: <source process title>
Source step title: <source step title>
Source step description: <source step description>
Action: <one physical action>
Scene: <simple business environment>
Subject: <actor and props>
Composition: one clear panel, centered action, generous padding, uncluttered layout.
Color: off-white background, black line art, muted accent colors only.
Image content: wordless business action, abstract paperwork marks, simple props, flat instructional style.
```

## Manifest Shape

Use this JSON shape:

```json
{
  "jobSlug": "manager-receiving",
  "jobTitle": "Manager Receiving",
  "source": "docs/knowledge/inventory/current-inventory-process.md",
  "style": "airport-safety-card-business-operations",
  "steps": [
    {
      "number": 1,
      "slug": "verify-invoice",
      "title": "Verify invoice",
      "description": "The manager checks the invoice against product received.",
      "promptPath": "prompts/01-verify-invoice.prompt.md",
      "imagePath": "images/01-verify-invoice.png",
      "status": "pending-image"
    }
  ]
}
```

## Output Contract

Final target repo files:

- `docs/knowledge/<domain>/visuals/<job-slug>/manifest.json`
- `docs/knowledge/<domain>/visuals/<job-slug>/prompts/<nn>-<step-slug>.prompt.md`
- `docs/knowledge/<domain>/visuals/<job-slug>/images/<nn>-<step-slug>.png`
- `docs/knowledge/<domain>/presentations/<job-slug>/<job-slug>-process.pptx`

Scratch files:

- `outputs/<run-id>/job-journey-images/process-run.json`
- `outputs/<run-id>/job-journey-images/decks/<job-slug>/...`

Final response:

- Processes completed.
- Total images generated and copied.
- Total decks generated.
- Validation result.
- Exact target paths.
