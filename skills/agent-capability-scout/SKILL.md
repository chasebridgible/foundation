---
name: agent-capability-scout
description: Run the recurring Foundation scout that researches bounded agent-system sources, records evidence-backed findings with 1-10 interest grades, evaluates durable standalone principle candidates, updates Foundation artifacts, and notifies the owner through GitHub.
---

# Agent Capability Scout

Use this skill when a Codex automation or human asks to run the Foundation Agent Capability Scout.

Owning capability: `foundation.learn-agent-capabilities-over-time.capability`.
Owning job: `foundation.agent-capability-scout.job`.
Technical spec: `foundation.agent-capability-scout.technical`.
Eval spec: `foundation.agent-capability-scout.eval`.

## Stable Principle

The scout exists to turn recurring research into durable Foundation learning, not to create news summaries. A run is useful when it preserves what changed, why it matters, and whether it teaches a standalone principle that should improve future agent systems.

## Automation Prompt

Use this as the Codex cron prompt:

```text
Run the Foundation Agent Capability Scout in /Users/ChaseBartlett/Developer/repos/foundation. Follow skills/agent-capability-scout/SKILL.md exactly. Use a clean worktree or branch; if the checkout is a clean detached Codex worktree, create a dated scout branch before editing. Research only the enabled source registry, then complete one write-through artifact checkpoint for the same run ID: evidence snapshots, canonical JSONL rows, dated brief, and any qualifying principles-doc patch. Do not stop after evidence snapshots alone. Evaluate whether any finding creates a standalone additive principle, patch principles docs only for candidates that pass the principle gate, run the scout checker and spec check, then publish through the protected Foundation GitHub flow and notify the owner with the run grade summary, top findings, principle candidates, PR or blocker path, and next action.
```

## State Files

- `docs/specs/agent-capability-scout/source-registry.json` defines enabled sources and source scope.
- `docs/specs/agent-capability-scout/runs.jsonl` records run manifests.
- `docs/specs/agent-capability-scout/source-snapshots.jsonl` records fetch status, evidence paths, and content hashes.
- `docs/specs/agent-capability-scout/findings.jsonl` records evidence-backed findings and 1-10 interest grades.
- `docs/specs/agent-capability-scout/principle-candidates.jsonl` records findings that may become durable principles.
- `docs/specs/agent-capability-scout/merge-receipts.jsonl` records branch, commit, PR, checks, and merge state.
- `docs/specs/agent-capability-scout/notifications.jsonl` records GitHub notification receipts.
- `docs/specs/agent-capability-scout/briefs/` stores derived human-readable run briefs.

## Run Workflow

1. Read `AGENTS.md`, `docs/specs/index.html`, `docs/specs/foundation-operating-system.html`, the scout job spec, technical spec, eval spec, and this skill.
2. Create or enter a clean Foundation branch or worktree before fetching or editing. Do not run in a dirty mixed-purpose tree unless the user explicitly directs it.
3. If the checkout is clean but detached, create and switch to a dated branch before editing: `codex/agent-capability-scout-YYYYMMDD`. A clean detached Codex worktree is publishable after this branch is created; it is not a review-mode blocker by itself.
4. Generate a stable `runId` in `YYYY-MM-DD-agent-scout-NN` form.
5. Load `source-registry.json`. Research only enabled sources and only within their `topicScope`.
6. For each enabled source, preserve retrieval metadata in `source-snapshots.jsonl`. If a source cannot be fetched, record the source failure instead of inventing a finding.
7. Compare with prior successful run state when available. If comparison state is missing, record a first-run baseline and grade only findings with clear evidence.
8. Complete the write-through artifact checkpoint before moving to checks or status reporting:
   - write evidence files for every fetched or blocked source;
   - append `source-snapshots.jsonl` rows that cite those evidence paths and hashes;
   - append one `findings.jsonl` row for each meaningful change with source ID, evidence path, concise summary, confidence, 1-10 interest grade, and grade reason;
   - append `principle-candidates.jsonl` rows for any finding being considered for doctrine;
   - append or update the `runs.jsonl` row with the dated brief path and current merge/notification state;
   - write the dated brief under `docs/specs/agent-capability-scout/briefs/`.
9. Do not stop after evidence snapshots alone. If evidence exists but the matching JSONL rows or brief do not, the run is incomplete; finish those writes before reporting progress.
10. Create a brief even when there are no findings. The owner should still see what was checked, whether anything was interesting, and whether any source was blocked.
11. For each high-durability finding, run the principle-candidate gate below before editing principles docs.
12. Run `npm run foundation:agent-capability-scout:check` and revise artifacts until it passes.
13. Run `npm run spec:check` after spec, principles, skill, or checker changes.
14. Publish through the Foundation protected GitHub flow when permissions allow. Record merge state or an explicit blocker.
15. Notify the owner through a GitHub issue or PR comment. Include run status, top interest grade, top findings, principle candidates, PR/branch/blocker path, and next action.

## Branch and Worktree Rules

- Dirty mixed-purpose checkout: stop before edits, report `clean-worktree` blocked, and do not write scout state unless the owner explicitly directs the run to use that checkout.
- Clean named branch: continue on that branch when it is not `main`; if on `main`, create `codex/agent-capability-scout-YYYYMMDD` before edits.
- Clean detached worktree: create `codex/agent-capability-scout-YYYYMMDD` before edits, then continue the full write/check/publish loop.
- Branch creation failure: record a blocked run if artifacts can be written safely, or report the blocker without writing if state safety is uncertain.
- Review-mode is reserved for explicit owner requests, dirty mixed-purpose checkouts, failed branch setup, unavailable network, or unavailable publish/notification permissions.

## Interest Grade

Grade findings from 1 to 10 for broad value to improving agent systems.

- `1-3`: routine product note, narrow bugfix, or weakly relevant source change.
- `4-6`: useful implementation detail, workflow pattern, eval idea, or tool behavior worth logging.
- `7-8`: meaningful capability change, durable workflow lesson, eval pattern, memory pattern, or orchestration behavior likely to improve Foundation.
- `9-10`: major agent-system shift or principle-level lesson that should probably change Foundation behavior, skills, evals, or docs.

Every grade needs a short reason. Do not grade high merely because a source is famous or the wording is exciting.

## Principle-Candidate Gate

A finding may become a principle candidate only when it passes all gates:

- The lesson can be stated without naming a vendor, model, release, benchmark, or temporary tool behavior.
- The principle is additive to existing Foundation principles, not a restatement of an existing rule.
- The principle changes how future agents should choose work, preserve memory, evaluate output, revise output, or notify humans.
- The source evidence supports the principle directly enough that a reviewer can trace the logic.
- The target principles document is explicit: usually `docs/principles/agent-principles.html`, or `docs/principles/ai-evals-principles.html` for judge/eval doctrine.

Before patching a principles doc, perform a separate eval pass:

1. Read the target principles section and nearby related principles.
2. Judge whether the proposed principle is standalone, additive, durable, and not too source-specific.
3. If it fails, keep the finding and record no principles-doc patch.
4. If it passes, append a `principle-candidates.jsonl` record with `reviewState: "proposed"`, `standaloneEval: "pass"`, `additiveRationale`, and a patch path or proposed wording.
5. Patch the target principles doc in the smallest section that fits the concept.

## Notification Shape

Prefer a GitHub PR comment when a PR exists. Use a GitHub issue when there is no PR but the owner still needs a durable notification. Email is not a separate v1 integration; GitHub notification emails are the expected email path when the owner watches the repository.

The notification must include:

- Run status and run ID.
- Top interest grade and one-line reason.
- Findings grouped as high, medium, low, or no meaningful changes.
- Principle candidates created or "none".
- Files changed and brief path.
- PR URL, issue URL, or blocker.
- Requested owner action.

## Exit Criteria

The run is complete only when:

- Scout artifacts pass `npm run foundation:agent-capability-scout:check`.
- Any spec/principles/skill edits pass `npm run spec:check`.
- A brief exists for the run.
- Merge state or a merge blocker is recorded.
- A GitHub notification receipt or explicit notification blocker is recorded.
