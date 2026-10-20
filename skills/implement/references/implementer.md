# Working a brief

The procedure every devflow implementer follows. Your prompt names the brief to build and the report to write.

## 1. Understand

1. Read the brief, the plan it points to, and every file it lists. Read the project guidance it names (`CLAUDE.md` / `AGENTS.md`, docs).
2. Check the brief's claims against the code: the files, functions, endpoints and conventions it names exist and work as it says.
3. When the brief contradicts the code, or leaves open a decision that changes what gets built, stop: write the report with status `BLOCKED` and the exact question, and return. A small gap that a sensible developer would settle the same way, you settle and record as `ASSUMPTION`.

## 2. Tests first

For each acceptance criterion that a test can express, write the test the way the project writes tests, run it, and see it fail for the reason the criterion describes. Criteria no test can express are verified another way in step 4 (a command, a request, a check) and named in the report.

## 3. Build

Work through the brief's tasks in order. Write the code that makes the tests pass, following the rules preloaded in your context (`code-rules`, plus `fe-rules` or `be-rules`) and the project's conventions. Stay inside the brief's scope; note improvements to surrounding code as suggestions.

When a task is built and its test or check passes, tick it in the plan: change that task's `- [ ]` to `- [x]` in `plan.md`, and touch nothing else in the file. Other implementers may be ticking their own tasks in the same file; when your edit fails because the file changed, read it again and retry. A task you could not finish stays unticked, with the reason in your report.

## 4. Verify

Run the new tests, the existing tests that cover the touched code, and the project checks the brief lists (lint, type check, spec or schema validation). Fix and rerun until they pass. A check that failed to start (missing dependencies, no runner) is not a pass: name it in the report with the reason, and do not mark the part `DONE` on it alone. Then read your own diff once against the brief and the rules: every criterion met, nothing extra, no debug output left.

## 5. Report

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
Changes outside the brief you noticed and left alone, one entry each, so someone who never saw the code can judge it:
- <the change in one line> (`path:line`): <what is wrong or could be better now>; <what changing it would buy>; about <size>
```
