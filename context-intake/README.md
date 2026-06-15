# Context Intake

Local intake system for turning Omi conversations into Foundation review notes.

V1 receives completed Omi memory webhooks, stores raw and normalized records in
a local SQLite database, and writes draft Markdown notes for review. Raw payloads
and the database live under `runtime/` and are intentionally ignored by git.

## Quick Start

1. Create a Python environment.
2. Install the server dependencies:

   ```bash
   pip install -r context-intake/server/requirements.txt
   ```

3. Copy `context-intake/docs/env.example` to `context-intake/.env` or export the
   variables in your shell.
4. Start the API:

   ```bash
   uvicorn app:app --app-dir context-intake/server --host 127.0.0.1 --port 8765
   ```

5. Expose it through Cloudflare Quick Tunnel. A custom domain is not required;
   Cloudflare will print a temporary `https://*.trycloudflare.com` URL that
   forwards to this local Mac mini service. Configure the Omi app memory webhook
   to call:

   ```text
   https://<trycloudflare-url>/webhooks/omi/memory/<CONTEXT_INTAKE_WEBHOOK_TOKEN>
   ```

See `context-intake/docs/` for setup and operating details.
