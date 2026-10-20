---
name: implement
description: Build an approved devflow plan with implementer subagents sized to its parts, ticking off its tasks, then hand the result to review. Use when a plan in .flow/ is approved and the developer wants it built.
argument-hint: "<slug> [--no-review]"
---

# Implement

Build the approved plan in `.flow/<slug>/plan.md`. You coordinate: you decide how many implementers the parts need, write their briefs, pick the right implementer, check what comes back, and keep the parts consistent with each other. The implementers do the reading and writing of code, so your context stays free for the whole picture.

Arguments: `$ARGUMENTS`

References:
- `${CLAUDE_PLUGIN_ROOT}/skills/plan/references/tiers.md`: escalation rules.
- `${CLAUDE_PLUGIN_ROOT}/skills/implement/references/implementer.md`: what an implementer does and the report it returns.

## 1. Load the plan

Read `.flow/<slug>/plan.md`. It must say `Status: approved`; when it does not, or there is no plan, say so and offer to run the `plan` skill first. Note the tier, the review depth and the parts.

Keep `.flow/<slug>/agents/state.json` current as `${CLAUDE_PLUGIN_ROOT}/skills/run/references/state.md` describes: set `phase: implement`, list the parts, and update each part's status as it moves. When `state.json` has no `base`, record `git rev-parse HEAD` as it before the first part starts.

## 2. Schedule

Order the parts by their `depends on`. A `be` part whose contract an `fe` part uses always comes first. Parts run in parallel only when they depend on nothing unfinished and share no files; everything else runs one after another.

Then decide how many implementers the work needs. One implementer per part is the default for parts of real size. Small parts in the same layer that would run one after another anyway go to one implementer in one brief: a fresh agent for a few lines spends more reading its way in than building. Never split a part across implementers; when a part looks too big for one, say so and re-plan it with the developer instead.

## 3. Brief

For each implementer run, write `.flow/<slug>/agents/implementer-<n>-brief.md`, numbered in dispatch order, so that an implementer who never saw the conversation builds the right thing:

```
# Brief <n>: <part title, or the titles of the grouped parts>
Plan: .flow/<slug>/plan.md (part <n>, or parts <n>, <m>)
Report to: .flow/<slug>/agents/implementer-<n>-report.md

## Goal
## Tasks                       the parts' task checklists, copied from the plan; tick each in plan.md when done
## Acceptance criteria         (from the plan, each testable)
## Start from                  files to change or create, and two or three existing files to follow as examples
## Facts                       what you or the explorers established, with path:line
## Contract                    for a part that depends on another: that part's report path and its Contract section
## Checks to run               the project commands that cover this part
## Out of scope
```

Gather missing facts with `devflow:explorer` before writing the brief, not inside it.

## 4. Build

Dispatch each brief to the implementer for its layer: `devflow:implementer-be`, `devflow:implementer-fe`, or `devflow:implementer` for anything else. Pass the brief's path.

Work small enough to finish without reading more code (a few lines in one file you already know) you build yourself instead: invoke the `code-rules` skill (and `fe-rules` / `be-rules` for its layer), follow `implementer.md`, tick its tasks in the plan and write its report the same way.

When a report comes back:

- `DONE`: check that every task of its parts is ticked in `plan.md`, that its acceptance criteria are each backed by a test or a check, and that its `Contract` matches what dependent parts expect. A task left unticked without a reason in the report makes it `PARTIAL`. Then continue.
- `BLOCKED`: answer the question from the plan or the project when they settle it; otherwise ask the developer. Re-dispatch the part with the answer added to its brief.
- `PARTIAL`: re-dispatch with the report, so the implementer continues where it stopped.
- No report file, or no `Status:` line in it: treat it as `PARTIAL`.

Re-dispatch a part at most twice for the same reason. After that, mark it `blocked` in `state.json` and bring it to the developer with what is missing.

After each part, re-check the tier (`tiers.md`): a change that grows past the plan, touches a risk path, or turns up an open decision is raised out loud before the next part starts.

Done when every part's report says `DONE`.

## 5. Integrate

Run the project checks over the whole change. When parts meet (a page calling a new endpoint, a job using a new service), confirm they fit: types, names, payloads, error handling on both sides. Fix gaps through the part that owns them.

## 6. Review

Unless `--no-review` was given, invoke the `review` skill with `<base> --task <slug> --depth <the plan's review depth>`, `base` from `state.json`. It verifies the change, fixes what is obvious and brings the rest to the developer.

When the task changed no code at all (only a report, notes or data), there is nothing for the review to verify: say so in one line, add `review` to `skipped` in `state.json`, and go on. `--no-review` is recorded the same way.

## 7. Hand off

When the `run` skill called you, hand back to it. Otherwise the task still needs its summary and finish: invoke the `run` skill with `--resume <slug>`, which continues from the state you left.
