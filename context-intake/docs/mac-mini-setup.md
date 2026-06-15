# Mac Mini Setup

## Runtime

Install Python 3.11 or newer, then create an environment:

```bash
cd /Users/chasebmini/Developer/repos/foundation
python3 -m venv .venv-context-intake
source .venv-context-intake/bin/activate
pip install -r context-intake/server/requirements.txt
```

Create local configuration:

```bash
cp context-intake/docs/env.example context-intake/.env
```

Edit `context-intake/.env` and replace both tokens with long random values.

## Run Locally

```bash
set -a
source context-intake/.env
set +a
uvicorn app:app --app-dir context-intake/server --host 127.0.0.1 --port 8765 --no-access-log
```

Confirm:

```bash
curl http://127.0.0.1:8765/health
```

## Keep It Running For Testing

For initial testing, keep two terminal sessions open:

1. API server:

   ```bash
   uvicorn app:app --app-dir context-intake/server --host 127.0.0.1 --port 8765 --no-access-log
   ```

2. HTTPS tunnel. For weeks-long use, prefer Tailscale Funnel:

   ```bash
   /Applications/Tailscale.app/Contents/MacOS/tailscale funnel --bg --yes 8765
   ```

   If Funnel is not enabled on the tailnet, Tailscale prints an approval URL.

   For same-day testing only, Cloudflare Quick Tunnel also works:

   ```bash
   cloudflared tunnel --url http://127.0.0.1:8765
   ```

Use the printed public HTTPS URL in Omi.

## LaunchAgent

For always-on operation, install the included LaunchAgent:

```bash
mkdir -p context-intake/runtime/logs ~/Library/LaunchAgents
chmod +x context-intake/bin/run-server.sh
cp context-intake/launchd/com.foundation.context-intake.plist ~/Library/LaunchAgents/
launchctl bootstrap "gui/$(id -u)" ~/Library/LaunchAgents/com.foundation.context-intake.plist
launchctl enable "gui/$(id -u)/com.foundation.context-intake"
launchctl kickstart -k "gui/$(id -u)/com.foundation.context-intake"
```

Logs stay under `context-intake/runtime/logs/` so they remain local and ignored
by git.

## Backups

Back up these local-only paths:

```text
context-intake/runtime/context-intake.sqlite
context-intake/runtime/raw/
```

Reviewed notes under `context-intake/notes/` can be committed intentionally.
