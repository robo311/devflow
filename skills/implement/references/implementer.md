# Working a brief

What a devflow implementer's work covers. Your prompt names the brief to build and the report to write. The sections are an outline of what a finished part needs, not a script: how you get there is your call.

## Understand

Read the brief and what it points to: the files under `Start from`, the plan for the tasks you will tick, and the project guidance it names. The brief's `Facts` were checked against the code before you were dispatched; build on them rather than re-checking them.

When what you read contradicts the brief, or the brief leaves open a decision that changes what gets built, write the report with status `BLOCKED` and the exact question, and return. A small gap that a sensible developer would settle the same way, you settle and record as `ASSUMPTION`.

## Tests first

Write tests for the acceptance criteria a test can express, the way the project writes tests, and run them once, together, to see them fail before you build. A refactor meant to keep behaviour has its proof in the existing tests: run them before you start and again at the end. Criteria no test can express get another check at the end (a command, a request) named in the report.

## Build

Work through the brief's tasks, following the rules preloaded in your context (`code-rules`, plus `fe-rules` or `be-rules`) and the project's conventions. Stay inside the brief's scope. Changes that repeat across many files (moved functions, renamed imports) often go faster as a script than as file-by-file edits.

Tick each task in `plan.md` as you finish building it: change its `- [ ]` to `- [x]` and touch nothing else in the file. Other implementers may be ticking their own tasks in the same file; when your edit fails because the file changed, read it again and retry.

## Verify

Once the build is done, run the new tests, the existing tests that cover the touched code, and the checks the brief lists. When one fails, fix the cause and run it again until it passes. A check that could not run (missing dependencies, no runner) is named in the report with the reason, not counted as a pass. A task that is still failing at the end goes back to unticked, with the reason in your report.

## Report

Write the report to the path in your prompt, then return its path and status in one line. Leave the working tree with your changes in place and nothing else changed.

Your run ends at the first message you write without a tool call, and the coordinator takes that message as your final answer. Put progress notes in the same message as your next tool call, and keep working instead of announcing the next step. End only after the report is written: `DONE`, `BLOCKED` with its question, or `PARTIAL` with what remains.

```
# Report: <brief title>
Status: DONE | BLOCKED | PARTIAL

## Changed
- path: one line on what and why

## Tasks
Every task from the brief: ticked, or unticked with the reason.

## Acceptance criteria
- <criterion>: <test name, or the command/check that shows it>

## Checks
<each command and its result; failing output verbatim, passing output as its summary line>

## Contract
Only for a part others build on: the final shape of what it exposes (endpoint, request, response, types, events).

## Assumptions and deviations
- ASSUMPTION: <what and why>
- Deviation from the brief: <what and why>

## Blocked on
Only when BLOCKED: the question and what each answer would change.

## Suggestions
Only what you would raise with a reviewer: a bug or a real risk outside the brief that you noticed and left alone. Most parts have none; leave the section out then. One entry each, so someone who never saw the code can judge it:
- <the change in one line> (`path:line`): <what is wrong now>; <what changing it would buy>; about <size>
```
