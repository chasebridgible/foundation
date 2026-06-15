# Omi Setup

V1 uses Omi's Memory Creation webhook. This waits until Omi has processed a
conversation and created the memory payload, which is better for grouped notes
than segment-by-segment real-time transcript delivery.

## Configure

1. Start the local API on the Mac mini.
2. Start a public HTTPS tunnel. For weeks-long use, prefer Tailscale Funnel:

   ```bash
   /Applications/Tailscale.app/Contents/MacOS/tailscale funnel --bg --yes 8765
   /Applications/Tailscale.app/Contents/MacOS/tailscale funnel status
   ```

   Use the `https://*.ts.net` URL from the status output.

   For same-day testing only, Cloudflare Quick Tunnel can be used instead:

   ```bash
   cloudflared tunnel --url http://127.0.0.1:8765
   ```

   Copy the printed `https://*.trycloudflare.com` URL.

3. In the Omi app, enable Developer Mode.
4. Set the Memory Creation webhook URL:

   ```text
   https://<public-tunnel-url>/webhooks/omi/memory/<CONTEXT_INTAKE_WEBHOOK_TOKEN>
   ```

5. Trigger a memory webhook from an existing Omi memory or complete a short test
   conversation.
6. Confirm a note appears in `context-intake/notes/`.

## Future Audio Path

Raw audio bytes plus local Whisper is intentionally out of scope for v1. Add it
only if Omi's processed transcripts are not good enough or local transcription
control becomes necessary.
