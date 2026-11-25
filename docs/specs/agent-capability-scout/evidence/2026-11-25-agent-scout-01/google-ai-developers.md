# Google AI Developers evidence — 2026-11-25

- Index source: https://developers.googleblog.com/en/search/?technology_categories=AI
- Retrieved: 2026-11-25T17:14:00Z
- Result: fetched; one new in-scope post dated November 24, 2026 was reviewed.

## Managed ingestion and cited agent retrieval

- Article: https://developers.googleblog.com/en/from-files-to-cited-answers-in-one-api-call-managed-ingestion-and-searchdocuments-in-agent-retrieval/
- Article date: 2026-11-24
- Evidence: Google's managed Agent Retrieval service imports document and video files, retains page ranges or video time offsets for segments, and returns source-file URIs with those locators through one search API. The post also says re-importing updates existing documents rather than duplicating them and skips unchanged content. It supports hybrid retrieval, metadata filtering, and optional reranking.

Scout interpretation: retrieval output that carries a source locator makes downstream agent claims inspectable and keeps the evidence boundary attached to the working context. This is a useful implementation pattern for agent memory and grounded answers, but it reinforces rather than adds to Foundation's existing principles that memory entries be typed and source-backed and that agents favor stable links and provenance.
