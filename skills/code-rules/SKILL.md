---
name: code-rules
description: General rules for writing production code in any project: conventions, reuse, structure, comments, scope, errors, tests. Use when implementing or changing code, and when judging whether written code follows them.
---

# Code rules

## Priority

When sources disagree, the higher one wins:

1. What the developer said for this task, and the approved plan.
2. The project's written rules: `CLAUDE.md`, `AGENTS.md`, `docs/`, ADRs, `REVIEW.md`.
3. The project's existing code: its architecture, conventions and syntax.
4. These rules and the `fe-rules` / `be-rules` that add to them.
5. The best practices of the language and framework in use.

## Applying the rules

Apply a rule where its subject exists in the task. When a rule's area does not exist in the project (no public pages for SEO rules, no i18n, no queue), skip it and say so in one line of the report, so the skip is visible rather than silent.

## Architecture

- Build inside the project's architecture: its layers, module boundaries, patterns and data flow. A new feature looks like the features already there.
- When you see a better way than the project's, build it the project's way and put the alternative in your report as a suggestion, with what it would buy.
- In a new project, the architecture comes from the approved plan.

## Conventions

- Write new code the way the surrounding code is written: naming, file layout, syntax, error handling, test style. Before writing a new kind of file, read two or three existing files that do the same job and match them.
- Where the project is silent, follow the idioms and best practices of the language and framework (their standard library, error handling and type conventions).
- Use the project's formatter and linter settings; leave formatting of lines you did not change as it is.

## Reuse

- Search before writing: an existing helper, component, service, query or type that does the job is used or extended, not duplicated.
- When you extend something shared, check its other callers still work.

## Structure

- Split by responsibility, not by length: one unit does one job. Split a unit when it does two jobs; keep it whole when it does one, even if it is long.
- A reader understands a unit without jumping through more than a couple of files. Thin wrappers and one-line indirections that add a file without adding meaning are folded back in.
- An abstraction earns its place with a second real use or a clearly separate responsibility, never "for later".

## Simplicity

- Write the simplest code that meets the acceptance criteria: clear names, early returns, no flags or options nobody asked for.
- Leave no dead code, commented-out code or debug output (`console.log`, `dd()`, `var_dump`, `print`).
- Add a dependency only when the plan includes it.

## Comments

- Comment the why that the code cannot say: a constraint, a workaround and its reason, an invariant, a non-obvious consequence. One or two lines.
- Let names and structure say what the code does; a comment that narrates the code is deleted.
- Changes and their history belong to version control, not to comments.

## Scope

- Change what the plan or the task asks for, and what that change requires (a caller that must follow a new signature, a spec that must match a new response).
- Anything outside that scope you think should change (a bug you noticed, a cleanup, a better structure) goes to your report as a suggestion with its reason. It is never changed without the developer's approval.
- Leave version control to the developer: no commits, branches, stashes or pushes.

## Errors

- Validate and handle errors at system boundaries: user input, requests, files, network, external services. Trust internal code and framework guarantees.
- Fail loudly with context; an error is never swallowed or turned into a silent default.

## Tests

- Test behaviour through the public interface, derived from the acceptance criteria. Follow the project's test conventions and location.
- A new test fails before the change and passes after it; run it red first when the change makes that feasible.
- Mock only at boundaries the project already mocks (network, time, external services), never the unit under test.

## Verification

Run the project checks that cover the change (tests, lint, type check, schema or spec validation) and keep their real output for the report. Work is done when they pass, or when the report says exactly which ones fail and why.
