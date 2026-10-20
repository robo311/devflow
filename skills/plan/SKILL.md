---
name: plan
description: Turn a development task into an approved plan sized to the task, asking the developer only the decisions that change what gets built. Use before implementing a feature, fix or change, or when the developer asks to plan or design one.
argument-hint: "<task description> [--tier trivial|light|full]"
---

# Plan

A good plan is what makes implementation smooth and the review quiet. Find out what the developer actually wants, settle every decision that changes what gets built, and write it down so an implementer who never saw this conversation builds the right thing. Size the effort to the task: a clear small task gets a short plan and no questions.

Task: `$ARGUMENTS`

References, read when the step names them:
- `${CLAUDE_PLUGIN_ROOT}/skills/plan/references/tiers.md`: tiers, risk paths, escalation.
- `${CLAUDE_PLUGIN_ROOT}/skills/plan/references/plan-format.md`: the plan's format and source tags.

## 1. Ground

Learn what the request and the project already settle before asking anything.

First, so the live view shows the task from its start: pick `<slug>`, a short kebab-case name for the task, create `.flow/<slug>/` with the layout `${CLAUDE_PLUGIN_ROOT}/skills/run/references/state.md` describes, make sure `.flow/` is listed in `.git/info/exclude` (add it when missing), and write `agents/state.json` with `title`, `phase: plan` and `step: ground`.

1. Read the project's own guidance: `CLAUDE.md` / `AGENTS.md` (root and the areas the task touches), `REVIEW.md`, README, and `docs/` files related to the task.
2. Find the facts the plan rests on: where the affected code lives, how similar features are built, which contracts, schemas, specs and tests are involved. Facts are your job, never the developer's. For anything beyond a few direct lookups, dispatch `devflow:explorer` with concrete questions, several in parallel for separate areas, and keep their summaries.

3. Find what depends on the code the task will change: callers, consumers, jobs, other repositories (Grep or explorers). This is the blast radius; every entry needs evidence.
4. **New project**: when there is no code yet, or the task is to start one, the foundation belongs to this plan: language and runtime, framework, project structure, architecture and layers, data storage, testing, tooling (lint, format, build), and how it runs locally. Take what the developer already stated; for the rest, propose a choice with a one-line reason each. These are decisions for step 3, confirmed by the developer before anything is built, unless the task already settles them.

Done when you can name the files or areas the task touches, the existing code it should follow, what depends on it, and every decision that is still open.

## 2. Size

Pick the tier and review depth with `tiers.md` and announce them in one line. A `--tier` argument sets the tier; the review depth still follows risk.

- `trivial`: delete the `.flow/<slug>/` folder you created in step 1, and `.flow/` when it is left empty; a trivial task leaves no files. Say in one line what you will change and stop planning. When the `run` skill called you, hand back to it; otherwise tell the developer the task needs no plan.
- `light` and `full`: add the tier and review depth to `state.json` and keep it current at the points `state.md` lists. Continue.

## 3. Decide

Map the open decisions as a tree: each decision unlocks the ones that hang off it. Settle them in rounds.

- **Ask only what changes what gets built** and what the project cannot answer: where the feature belongs, what the developer actually wants, scope boundaries, trade-offs only they can weigh. When the request and the project settle everything, ask nothing.
- **Guess where a wrong guess is cheap**: put it in the plan as `[my call]` or `ASSUMPTION` instead of asking. Ask where a wrong guess would mean rebuilding.
- **A round is the frontier**: every decision whose prerequisites are settled. Number the questions and give each your recommended answer, so "yes" accepts it. Use AskUserQuestion for questions with a few clear options (recommended option first, labelled "(Recommended)", up to four questions per call); ask open questions in text.
- After each round, recompute the frontier and re-check the tier (escalation rules in `tiers.md`).

`light` gets at most one round. `full` continues until the frontier is empty.

Done when every decision that changes what gets built is either answered by the developer or written down as `[my call]` / `ASSUMPTION`.

## 4. Approach (`full`)

Before writing, consider more than one way to build it and drop the weak ones, including any that fight what the developer said they want. Put the alternatives in the plan only when the choice between them matters to the developer.

## 5. Write

Write the plan with `plan-format.md` to `.flow/<slug>/plan.md`. Size the parts by the work and give each its task checklist, as the format's Parts and Tasks sections describe. Copy its assumptions and blast radius into `state.json`.

Every guess is tagged `[my call]` or `ASSUMPTION`; every fact about the project carries its evidence.

## 6. Builder check (`full`)

Dispatch `devflow:plan-checker` with the plan's path. It reads the plan as the implementer would and returns what it would need to ask. Sort its questions:

- **Already answered** by the conversation or the project: put the answer in the plan.
- **Minor**: a sensible implementer could settle it without changing what gets built. Settle it yourself and tag it `[my call]`.
- **The developer's**: only they can answer it, and the answer changes what gets built. Ask these in one message, most important first.

Update the plan with the answers. The builder check runs once.

## 7. Approve

Show the brief from `plan-format.md` in the conversation, not the whole plan, and ask what happens next, at every tier above `trivial`, with these options:

- **Implement** (recommended): the plan is approved and gets built now.
- **Discuss it first**: the developer wants to read the plan or talk it through. Answer their questions, apply the changes they ask for, and ask again.
- **Keep it for later**: the plan is approved and stays in `.flow/<slug>/` for `/devflow:implement <slug>`; nothing is built now.

Without one of these answers, nothing is built.

`full`: nothing gets built before approval. Building includes writing product code, scaffolding, installing dependencies and running generators. Reading and exploring are fine.

Done when the developer chose Implement or Keep it for later. Add `Status: approved` under the plan's title, and set `waitingFor` back to `null` in `state.json`.

## 8. Hand off

- The `run` skill called you: hand back to it with the plan's path and the developer's choice; it builds the plan, or stops for Keep it for later.
- The developer chose **Implement**: invoke the `run` skill with `--resume <slug>` now, in this turn. It builds, reviews, summarises and tidies up, so the whole flow finishes. Choosing Implement means building starts; never stop at "the plan is approved".
- The developer chose **Keep it for later**: tell them where the plan is and that `/devflow:implement <slug>` builds it.
