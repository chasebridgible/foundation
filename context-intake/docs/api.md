# Context Intake API

Base URL for local development:

```text
http://127.0.0.1:8765
```

Cloudflare Tunnel should expose the same service over HTTPS for Omi.

## `GET /health`

Returns service status and whether required paths/tokens are configured.

## `POST /webhooks/omi/{event_type}/{webhook_token}`

Primary Omi webhook endpoint. The token must match `CONTEXT_INTAKE_WEBHOOK_TOKEN`.

Use this one endpoint for Omi's webhook slots:

- Conversation events: note-producing when payload includes conversation-style fields.
- Real-time transcript: stored raw in v1, acknowledged without note generation.
- Audio bytes: stored raw binary in v1, acknowledged without note generation.
- Day summary: note-producing when payload includes `summary_json`.

The service stores raw payloads under `runtime/raw/`. Conversation-like JSON is
also normalized into SQLite and creates a draft note under `context-intake/notes/`.

## `GET /admin/intakes?token=<admin_token>`

Lists recent intakes. The token must match `CONTEXT_INTAKE_ADMIN_TOKEN`.

## `POST /admin/intakes/{conversation_id}/regenerate-note?token=<admin_token>`

Regenerates a draft note from the latest stored raw payload for the conversation.
Use this after changing the note template.
