# Operator Runbook

## Daily Use

1. Keep the API and Cloudflare Tunnel running on the Mac mini.
2. Let Omi send memory webhooks after conversations complete.
3. Review generated notes in `context-intake/notes/`.
4. Edit note status from `draft` to `reviewed` in frontmatter once the note is
   safe and useful.
5. Commit only reviewed notes that should become Foundation substrate.

## Privacy Rules

- Do not commit `context-intake/runtime/`.
- Do not commit `.env`, SQLite files, raw JSON payloads, or logs.
- Keep full transcripts out of notes by default.
- Use short excerpts only when they are needed as source evidence.

## Recovery

- If a note template changes, call the regenerate endpoint for the conversation.
- If a webhook was duplicated, the payload hash and Omi id prevent duplicate
  normalized rows.
- If a payload cannot be normalized, keep the raw file and inspect the API logs.
