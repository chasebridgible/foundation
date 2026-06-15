# Cloudflare Tunnel Setup

Use a public HTTPS tunnel so Omi can reach the Mac mini API without opening
router ports. The database and raw payloads still stay local on the Mac mini;
the tunnel only forwards webhook traffic.

For a weeks-long setup, prefer Tailscale Funnel because this Mac mini already
uses Tailscale and Funnel can provide a stable `https://*.ts.net` URL.

## Tailscale Funnel, Stable URL

Enable Funnel for the tailnet, then run:

```bash
/Applications/Tailscale.app/Contents/MacOS/tailscale funnel --bg --yes 8765
```

Check the URL:

```bash
/Applications/Tailscale.app/Contents/MacOS/tailscale funnel status
```

Configure Omi with:

```text
https://<tailscale-funnel-host>/webhooks/omi/memory/<CONTEXT_INTAKE_WEBHOOK_TOKEN>
```

If the Funnel command says Funnel is not enabled, approve the account-level
Tailscale prompt it prints, then rerun the command.

Cloudflare Quick Tunnel remains useful for short testing. It prints a temporary
`https://*.trycloudflare.com` URL and requires no Cloudflare account setup, but
it should not be used as the weeks-long webhook URL.

## Shape

```text
Omi Cloud -> https://*.trycloudflare.com -> Cloudflare Tunnel -> 127.0.0.1:8765
```

## Cloudflare Quick Tunnel, Short Test Only

```bash
cloudflared tunnel --url http://127.0.0.1:8765
```

Copy the printed `https://*.trycloudflare.com` URL and configure Omi with:

```text
https://<printed-url>/webhooks/omi/memory/<CONTEXT_INTAKE_WEBHOOK_TOKEN>
```

Quick Tunnel URLs can change when the tunnel restarts. That is acceptable for
local testing. Move to a named tunnel/custom domain only when you want a stable
production URL.

## Stable Tunnel, Optional Custom Domain

```yaml
tunnel: context-intake
credentials-file: /Users/<user>/.cloudflared/context-intake.json

ingress:
  - hostname: intake.example.com
    service: http://127.0.0.1:8765
  - service: http_status:404
```

Keep webhook authentication enabled even when using Cloudflare. The tunnel
provides transport reachability; `CONTEXT_INTAKE_WEBHOOK_TOKEN` protects the
application endpoint if the URL is shared.
