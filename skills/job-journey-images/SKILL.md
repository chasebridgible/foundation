---
name: job-journey-images
description: Generate wordless airport-safety-card-style instructional images and one-slide process canvases for a business job or process, saving prompts, images, manifests, and presentation outputs into the target repo for later use in PDFs, decks, process docs, or app screens.
---

# Job Journey Images

Use this skill when a user wants visual assets for the actions in a job, SOP, checklist, training flow, or business process.

## Core Style

Use this exact style direction as the base for every generated image:

> Airport safety card style for business operations. Simple, flat instructional illustrations that show one physical action per panel. Clean black outlines, limited colors, off-white background, limited decorative detail, clean, with limited facial expression. Each panel should make the action understandable in two seconds: a manager checking an invoice, scanning a case, separating damaged product, creating a pending credit, handing off a follow-up task. Use symbols and simple props where helpful. The image itself should be wordless as the text for the action will be shown in a separate step.

## Workflow

1. Pick one source document and one job or process.
2. Use the source document as the copy authority for job title, step titles, and step descriptions.
3. Break the job into physical actions, one image per action.
4. Create a stable output folder in the target repo:
   - `docs/knowledge/<domain>/visuals/<job-slug>/`
5. Save:
   - `manifest.json` for job metadata and step-to-asset mapping.
   - `prompts/<nn>-<action-slug>.prompt.md` for each final prompt.
   - `images/<nn>-<action-slug>.png` for each generated image.
6. Use two-digit step numbers and imperative action slugs.
7. Generate images with the project-bound image generation workflow and copy final files into the target repo.

## One-Slide Process Canvas

When the user asks for a process deck, create a one-slide PowerPoint canvas for one process:

1. Read the source document and extract the selected process heading, numbered step titles, and step descriptions.
2. Read the manifest and map `imagePath` entries to steps by step number.
3. Create a 16:9 slide with the process title at the top.
4. Place step panels left to right, top to bottom.
5. Put the step image above the step title and description.
6. Add arrows between panels to show sequence.
7. Use the source document wording verbatim for titles and descriptions.
8. Fit verbatim copy with responsive design choices: compact panel widths, smaller body type, balanced line height, generous margins, and panel heights that keep text inside its area.
9. Save final decks under:
   - `docs/knowledge/<domain>/presentations/<job-slug>/<job-slug>-process.pptx`

## Prompt Shape

Use this prompt structure:

```text
Create one wordless instructional illustration.

Style: <Core Style>

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
      "promptPath": "prompts/01-verify-invoice.prompt.md",
      "imagePath": "images/01-verify-invoice.png"
    }
  ]
}
```
