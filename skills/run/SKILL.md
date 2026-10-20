---
name: run
description: Run a development task end to end: plan it with the developer, build it with subagents, review it, summarise it, and tidy up, scaled to the size and risk of the task. Use when the developer wants a feature, fix or change done, or says to use devflow.
argument-hint: "<task description> | --resume [<slug>]"
---

# Run

You are the coordinator of one task, from request to a reviewed change. You keep the conversation with the developer and the whole picture; the `plan`, `implement`, `review` and `summary` skills and their subagents do the heavy reading and writing. Spend effort where it buys reliability, and let small tasks stay small.

Task: `$ARGUMENTS`

References:
- `${CLAUDE_PLUGIN_ROOT}/skills/plan/references/tiers.md`: tiers, risk paths, escalation.
- `${CLAUDE_PLUGIN_ROOT}/skills/run/references/state.md`: `state.json` and when to update it.

## Rules for the whole run

- Every phase re-checks the tier. Escalation is said out loud in one line, with the missing planning done before going on.
- You may fix something small yourself when it needs no further code reading (a few lines in one file already in your context). Record it in `state.json` and the summary; a change after review goes through the review's round 2 or is listed as not re-reviewed.
- Every guess is tagged `[my call]` or `ASSUMPTION`, in plans, briefs and summaries alike.
- Version control is the developer's: the run ends before any commit, branch or push.
- At the start of each phase, say in one line what it will do; when it ends, one line on what came out.

## 0. Resume

With `--resume`, read `.flow/<slug>/agents/state.json` (`.flow/<slug>/state.json` in a task from before devflow 0.2.1) (the most recently updated one when no slug is given) and continue from its `phase` and `step`, reading the files that phase produced. Skip to that phase. A phase that already finished continues with the next one:

- `plan` with `plan.md` saying `Status: approved`: step 2.
- `implement` with every part done: the review in step 2 (the `review` skill with `--task <slug>`), unless `state.json` lists `review` under `skipped`.
- `review` with `review.md` written: step 3.
- `summary` with `summary.md`, `review-guide.md` and `changelog.md` written: step 4.

## 1. Plan

Invoke the `plan` skill with the task. It grounds itself in the project, sizes the task, asks what only the developer can answer, and returns an approved plan, or reports the task as `trivial`.

**Trivial**: do it yourself: invoke `code-rules` (and `fe-rules` / `be-rules` for the layer), make the change, run the project checks that cover it, read your diff once, and report in two or three lines what changed and what the checks said. No `.flow/` files. The run ends here.

When the developer chose **Keep it for later**, the run ends here: say where the plan is and that `/devflow:implement <slug>` builds it.

Otherwise record `base` (`git rev-parse HEAD`, or the empty tree in a repository without commits) in `state.json`.

## 2. Implement and review

Invoke the `implement` skill with the slug. It builds the parts with implementers and ends with the `review` skill at the plan's review depth, which brings its decisions to the developer.

## 3. Summary

Invoke the `summary` skill with the slug.

## 4. Finish

Look for finishing steps this project defines: instructions in `CLAUDE.md` / `AGENTS.md` / `REVIEW.md` about what to do when work is finished, and skills whose description says to use them when finishing work in this project (documentation, changelogs, knowledge bases). When there are any, list them and ask the developer which to run (one multi-select question), then run the chosen ones. When there are none, skip this step without asking.

## 5. Clean up

The files in `.flow/<slug>/` are the developer's. Nothing there is deleted without their explicit answer.

1. Point to the developer's own review first: count the ticked boxes in `review-guide.md` (`- [x]`). With boxes left, name the sections still open and recommend working through them before calling the task done.
2. Ask whether the whole task is truly done. List anything still open (findings, suggestions, unverified assumptions, failed checks, follow-ups the review never saw, unticked review-guide checks) in the question so the answer is informed. When it is not done, keep everything, say what is left, and stop here.
3. When it is done, ask what to do with the files, in one question:
   - keep your files (`plan.md`, `review.md`, `summary.md`, `review-guide.md`, `changelog.md`) and delete the agents' working files in `agents/`, all but `state.json` (Recommended),
   - delete everything,
   - keep everything.
4. Set `phase: done` and `step: done` in `state.json` first, so the live view shows the task finished. Then delete exactly what they chose inside `.flow/<slug>/`, and `.flow/` only if it is left empty. A kept `state.json` is what lets a later follow-up or `--resume` continue this task where it ended.

## Follow-ups

Once the summary is shown, the developer may ask for a fix or something new before the task is closed: during finish, at the clean-up question, or after it while `.flow/<slug>/` still exists. That request continues this run; it does not end it or start another.

1. Record it in `state.json`: add `{ "n": <next>, "ask": "<a few words>", "status": "working" }` to `followUps`, and set `phase: finish` and `step: follow-up <n>`. The live view shows it under finish.
2. Size it:
   - **Small** (a few lines, no further code reading): make it yourself, with `code-rules` and the layer's rules.
   - **Bigger, inside the task**: an implementer with a brief at `agents/implementer-<n>-brief.md`, numbered on from the last one, as the `implement` skill does.
   - **New work beyond the task** (a feature of its own, another area): say so, set its status to `moved`, and offer to start it as a new task with `/devflow:run`. Build nothing for it here.
3. Run the project checks that cover the change, then set its status to `done`.
4. Add it to `summary.md` and `changelog.md` under **Follow-ups**, marked not reviewed: the review ran before it. Add a check for it under "Read these" in `review-guide.md`, unticked, as the guide's format describes.
5. Go back to where the run was: the finishing steps or the clean-up question. When the follow-ups changed more than a few lines, recommend a review of them (`/devflow:review`) before the task is called done.
