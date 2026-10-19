---
name: summary
description: Summarise a finished devflow task for the developer: what changed and why, behaviour now, the parts worth reading, open review items and leftovers. Use when a devflow task's implementation and review are done.
argument-hint: "<slug>"
---

# Summary

Tell the developer what their codebase looks like now, in a form they can read in a minute. They should come away knowing what changed, what behaves differently, which few spots deserve their eyes, and what is still open. Everything else stays in the files.

Task: `$ARGUMENTS`

## 1. Gather

Read `.flow/<slug>/plan.md`, every `report-<n>.md`, the review's `report.md`, and `state.json`. Get the change itself with `git diff --stat <base>` (`base` from `state.json`) and read the hunks you are going to point at.

## 2. Write

Write `.flow/<slug>/summary.md` and show it in the conversation, in the language of the conversation. Leave out empty sections; keep it to about twenty lines.

```
## <task title>: done
Tier: <tier> · review: <depth>, <rounds> round(s)

What changed and why
- <area>: one line on what changed and why
- ...

Behaviour now
- <before → after, as users, API consumers or data see it>

Worth a look
- path:line: why this part deserves a read (the important or non-obvious logic, a trade-off taken)

Review
Findings: <the review's Findings line> · open: <F-numbers still open, or "none">

Left open
- ASSUMPTION: <assumptions never verified>
- <failed or skipped checks>

Later
- <implementer suggestions the developer did not apply, with the review's verdict, one line each, at most five>
```

"Worth a look" holds at most three to five entries: the logic a reviewer would ask about, not every file. Explain each in a sentence or two.
