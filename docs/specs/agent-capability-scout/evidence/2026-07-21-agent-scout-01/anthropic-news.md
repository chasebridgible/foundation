# Anthropic News evidence - 2026-07-21

Run ID: `2026-07-21-agent-scout-01`
Source ID: `anthropic-news`
Fetched at: `2026-07-21T05:06:34Z`
Source URL: https://www.anthropic.com/news
Detail URL: https://www.anthropic.com/news/rare-disease-research-grants
Retrieval status: fetched

## Observed source state

- Anthropic News listed `Apply for Anthropic's AI for Science rare disease research grants`, dated July 20, 2026.
- The grant call describes two tracks: basic rare-disease research and early-stage biotech acceleration, with accepted applicants receiving Claude credits and Claude Science access.
- The article highlights agent-friendly scientific substrate: Mondo, Monarch Knowledge Graph, and DisMech, a mechanistic disease classification library where Claude can read case reports, variant databases, registry schemas, and public data to identify disease-mechanism similarities.
- It names agent tasks such as proposing mechanistic disease links with evidence an expert can validate, building evals for rare-disease tasks, drafting variant classifications for expert review, running bioinformatics pipelines, analyzing data, and drafting regulatory documentation.
- It also states limits: Claude cannot compensate for missing or poorly organized data, and high-quality longitudinal data and partnerships remain necessary.

## Scout assessment

This is a meaningful domain-agent finding. It is narrower than the OpenAI and Addy findings, but useful because it shows a science-agent program organized around agent-readable knowledge structures, expert validation, explicit task evals, and honest limits where data infrastructure is inadequate.

Potential principle-candidate evaluation: no principles-doc patch. The lesson reinforces existing AI Evals Principles around intent/risk contracts, production-like environments, expert labeling, traceable evidence, and failure-driven evals. It also reinforces Agent Principles around durable artifacts and human judgment, but does not add a standalone rule.
