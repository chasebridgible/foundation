# Omi Setup

V1 should use Omi's **Conversation events** webhook as the primary note-producing
trigger. If the app also offers real-time transcript, audio bytes, and day
summary webhooks, they can point at the same URL. The server will acknowledge
and store them raw; conversation-style JSON and day summaries can create notes.

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

   If the Omi app asks for specific webhook slots instead of "Memory Creation",
   paste the same URL into:

   - Conversation events
   - Real-time transcript
   - Audio bytes
   - Day summary

5. Trigger a memory webhook from an existing Omi memory or complete a short test
   conversation.
6. Confirm a note appears in `context-intake/notes/`.

## Future Audio Path

Raw audio bytes plus local Whisper is intentionally out of scope for v1. Add it
only if Omi's processed transcripts are not good enough or local transcription
control becomes necessary.
