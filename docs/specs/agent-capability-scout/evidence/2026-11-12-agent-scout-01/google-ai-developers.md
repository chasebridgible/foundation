# Google AI Developers snapshot

- Source: https://developers.googleblog.com/en/search/?technology_categories=AI
- Retrieved: 2026-11-13T05:03:00Z
- Scope checked: Google AI developer, agent, model, tool, eval, and platform changes relevant to improving agent systems.
- Comparison baseline: `2026-11-08-agent-scout-01`.

## New scoped item

**2026-11-12 — Agent Anomaly Detection**

Google reports an asynchronous monitoring system that analyzes OpenTelemetry traces and logs for goal hijacks and tool misuse. Rather than relying only on benchmarks authored alongside the system, it reports evaluation across five public security benchmarks, where it caught 87% of harmful instructions carried out by agents without added runtime latency. The described deployment combines anomaly monitoring with semantic governance and strict tool limits as defense in depth.

This is a scoped agent-system finding because independently selected benchmark suites reduce the risk that a monitoring system is only validated against the failure shapes its authors anticipated.

Source: https://developers.googleblog.com/en/how-agent-anomaly-detection-scores-on-benchmarks-we-didnt-write/
