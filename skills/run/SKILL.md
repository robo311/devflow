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

With `--resume`, read `.flow/<slug>/state.json` (the most recently updated one when no slug is given) and continue from its `phase` and `step`, reading the files that phase produced. Skip to that phase.

## 1. Plan

Invoke the `plan` skill with the task. It grounds itself in the project, sizes the task, asks what only the developer can answer, and returns an approved plan, or reports the task as `trivial`.

**Trivial**: do it yourself: invoke `code-rules` (and `fe-rules` / `be-rules` for the layer), make the change, run the project checks that cover it, read your diff once, and report in two or three lines what changed and what the checks said. No `.flow/` files. The run ends here.

Otherwise record `base` (`git rev-parse HEAD`, or the empty tree in a repository without commits) in `state.json`.

## 2. Implement and review

Invoke the `implement` skill with the slug. It builds the parts with implementers and ends with the `review` skill at the plan's review depth, which brings its decisions to the developer.

## 3. Summary

Invoke the `summary` skill with the slug.

## 4. Finish

Look for finishing steps this project defines: instructions in `CLAUDE.md` / `AGENTS.md` / `REVIEW.md` about what to do when work is finished, and skills whose description says to use them when finishing work in this project (documentation, changelogs, knowledge bases). When there are any, list them and ask the developer which to run (one multi-select question), then run the chosen ones. When there are none, skip this step without asking.

## 5. Clean up

The files in `.flow/<slug>/` are the developer's. Nothing there is deleted without their explicit answer.

1. Ask whether the whole task is truly done. List anything still open (findings, suggestions, unverified assumptions, failed checks) in the question so the answer is informed. When it is not done, keep everything, say what is left, and stop here.
2. When it is done, ask what to do with the files, in one question:
   - keep the important ones (`plan.md`, `summary.md`, the review's `report.md`) and delete the rest (`state.json`, briefs, reports, packets, patches) (Recommended),
   - delete everything,
   - keep everything.
3. Delete exactly what they chose inside `.flow/<slug>/`, and `.flow/` only if it is left empty. Set `phase: done` in `state.json` when it is kept.
