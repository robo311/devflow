---
name: summary
description: Summarise a finished devflow task for the developer (what changed and why, behaviour now, open review items and leftovers), write a review guide with only the spots worth a human check, and a plain-language changelog for whoever raised the task. Use when a devflow task's implementation and review are done.
argument-hint: "<slug>"
---

# Summary

Tell the developer what their codebase looks like now, in a form they can read in a minute. They should come away knowing what changed, what behaves differently, and what is still open. Everything else stays in the files.

The few spots that deserve their eyes go into a review guide they work through, so their own review covers what the automated one cannot instead of the whole diff.

Then write the same story for the person who raised the task (a product owner, a tester, a client, a teammate), so the developer can hand it over as it is.

Task: `$ARGUMENTS`

## 1. Gather

Read `.flow/<slug>/plan.md`, `review.md`, every `agents/implementer-<n>-report.md` and `agents/state.json`. Get the change itself with `git diff --stat <base>` (`base` from `state.json`) and read the hunks you are going to point at.

## 2. Review guide

Write `.flow/<slug>/review-guide.md` as `${CLAUDE_PLUGIN_ROOT}/skills/summary/references/review-guide.md` describes: only what matters for the task, most important first.

## 3. Summary

Write `.flow/<slug>/summary.md` and show it in the conversation, in the language of the conversation. Leave out empty sections; keep it to about twenty lines.

```
## <task title>: done
Tier: <tier> · review: <depth>, <rounds> round(s)

What changed and why
- <area>: one line on what changed and why
- ...

Behaviour now
- <before → after, as users, API consumers or data see it>

Your review
<N> checks, about <M> minutes: .flow/<slug>/review-guide.md

Review
Findings: <the review's Findings line> · open: <F-numbers still open, or "none">

Left open
- ASSUMPTION: <assumptions never verified>
- <failed or skipped checks>

Later
- <implementer suggestions the developer did not apply, with the review's verdict, one line each, at most five>
```

## 4. Changelog for the requester

Write `.flow/<slug>/changelog.md` for the person who asked for the task. They know the product, not the code: write what they would notice, in plain words, with no file paths, code, tool names or review jargon. Keep it to about fifteen lines, short enough to paste into the issue, the ticket or a message. Write it in the language of the conversation unless the developer asks for another; leave out empty sections.

```
# <task title in the requester's words>
<date> · <the issue or ticket reference, when the task named one>

## In short
One to three sentences: what was asked and what is done now.

## What changed
- <a change as the requester would describe it>

## What is different now
- <before → after, as users, customers or other teams see it>

## How to check it
- <where to go, what to do, what should happen>

## Not included or still open
- <left out on purpose, waiting for a decision, known limits>
```

A task that changed no code (an analysis, an audit) gets the same file: what was looked into, what came out, and what is recommended next.

Show it in the conversation after the summary, under one line saying it is ready to hand over, with its path.

## 5. Point to the review guide

End with the review guide, so the developer's next step is their own review: its path, how many checks and minutes, and the questions under "Read", one line each. Ask them to work through the file and tick the boxes before calling the task done. Do not paste the whole guide.