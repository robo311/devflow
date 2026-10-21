# Changelog

All notable changes to devflow. Versions follow the `version` in `.claude-plugin/plugin.json`; Claude Code offers an update when it changes.

## 0.2.4

- New `analyze` skill: `/devflow:analyze <task or idea>` checks whether something can be done in the project, what it needs, what it would affect (including jobs, reports, exports and outside systems) and the options with their trade-offs, before anyone decides to build it. It writes `.flow/<slug>/analysis.md` in plain language for non-technical readers, with the evidence in a closing **For developers** section, and changes no code. It runs on its own: `run` never calls it, and it writes no `state.json`. `plan` picks up an analysis the task points to, reusing its slug, findings, open decisions and recommended option.
- Faster implementers: the implementer guide is an outline of what a finished part needs rather than a step-by-step script. Implementers build on the brief's checked facts instead of re-verifying them, run the new tests once to see them fail and the full checks once at the end (fixing until they pass), treat existing tests as the proof for behaviour-preserving refactors, and may script edits that repeat across many files. The rules no longer ask for a report line per rule area that doesn't apply, and report suggestions are kept to what a reviewer should hear, so most parts have none. Integrate runs only when more than one implementer built the change.
- `state.json` records when each phase started (`phaseStarts`) and when each part's implementer was dispatched and reported back (`startedAt`, `finishedAt`), so a finished task shows where its time went. It also records how long each phase waited for you (`waitingSince`, `waited`). The live panel shows them: the task's total time and waiting time in the **Flow** heading, the time and waiting time beside each phase, and the time beside each part.
- The live panel shows devflow's own version in the **Session** heading, so an out-of-date install is visible at a glance.
- Shorter review guide: only what matters for the task (acceptance criteria, changed behaviour, risk paths it touches, decisions taken for you), three to six boxes, each a question, its `path:line` and one "If wrong" line. Sections are now **Read** and **Confirm**, with an optional **Worth knowing** at the end in place of a lesson per check.

## 0.2.3

- Live view: the plan's sub-steps now follow the work. The plan skill writes `step` at the start of every step, so "questions" no longer stays highlighted while the plan is written and checked; a new **write plan** step shows the writing, and a `light` plan, which has no builder check, no longer shows one.
- Faster builder check: the plan-checker verifies the claims the build rests on and checks the blast radius per changed contract, instead of every claim in the plan; a part that would need a long search becomes a question. Plans with four or more parts get two or three checkers in parallel, each taking a share of the parts.
- Implementers run on Sonnet or Opus by part: the plan gives each part a model (Opus for risk paths, contracts that consumers or other parts depend on, a new project's foundation or parts with nothing to follow; Sonnet otherwise), and approval offers **Implement with Sonnet + Opus** or **Implement with Opus**. A Sonnet run that comes back unfinished, or blocked on something already answered, is re-run on Opus.

## 0.2.2

- A finished task stays on the panel, marked finished, instead of turning into "no active task": clean-up sets `phase: done` first and keeps `agents/state.json` (the recommended choice deletes the other working files), so a later follow-up or `--resume` carries on from there. If the task's files are deleted anyway, the panel keeps its last view and marks it finished.
- `summary` writes `review-guide.md`, your own review as a checklist, most important first: whether the change is what you wanted, the few spots worth reading (each a question with `path:line`, what to look for, why it matters and, where there is an idea behind it, a short lesson), decisions made for you, what to try by hand, what nobody checked, and what is safe to skim. The summary and the clean-up point to it; the clean-up says how many checks are left. Follow-ups add a check of their own. It replaces the summary's "Worth a look" list.
- Live view: a **Your review** section shows how many of the guide's boxes you ticked, as you tick them.
- The live view belongs to the session: it shows only tasks this session started, resumed or reviewed (any tool call touching `.flow/<task>/`), so a new session no longer opens the panel for, or shows, a task another session runs in the same project. `/devflow:run --resume <task>` brings a task into the session.

## 0.2.1

- Follow-ups: a fix or addition asked for after the summary (during finish or at the clean-up question) is recorded in `state.json` and shows in the live view as a step under finish (`follow-up 2 · Sort the list by date`, with a `1/2 follow-ups` count). Small ones the coordinator makes, bigger ones go to an implementer, new work is offered as a new task; each lands in `summary.md` and `changelog.md` under Follow-ups, marked not reviewed.
- Task files are split by reader: what the developer reads (`plan.md`, `review.md`, `summary.md`, `changelog.md`) sits at the top of `.flow/<slug>/`; the agents' working files (`state.json`, `implementer-<n>-brief.md` and `-report.md`, the review's packet, diffs, candidates and snapshots) sit in `agents/`. Clean-up keeps the top and deletes `agents/`. The live view and `run --resume` still find tasks in the old layout.
- Decision batches start with a choice of how to go through them: findings that need you can be decided one by one, all left open, or talked through first; implementer suggestions can be decided one by one, skipped all at once (kept as Later) or talked through first.
- Implementer suggestions come with their context: the review first lists each one in the conversation (what, where, who noticed it, why, cost, the finder's verdict and recommendation), then asks per suggestion: Apply now, Later or Drop. Implementer reports give every suggestion its location, reason and size.
- `summary` also writes `.flow/<slug>/changelog.md`: what changed, what is different, how to check it and what is still open, in plain words for whoever raised the task, ready to paste into the issue. The clean-up keeps it with the other important files.
- Live view: "waiting for you" now follows what the session is doing. It shows while a question is open or Claude has stopped to ask, and gives way to "working" once you answered, even if `state.json` still says otherwise.
- A devflow agent working in the background counts as working: the band no longer says "waiting for you" while Claude's own turn has ended but its explorers or plan-checker still run.
- The band is set apart from Claude's spinner by a blank line and draws in devflow's own colours (yellow mark and current step, teal "working").
- The band is three short lines: the task, the steps with the current one marked, and either "waiting for you" or "working" with the running agents.
- The `main` row says "waiting on plan-checker" (or whichever agents run) while Claude's own turn has ended and its subagents work in the background, instead of "waiting for you"; agent entries have a blank line between them.
- The agents section lists the main session first, marked `main`, and labels every agent "running 45s" or "done in 2m" over a time axis.
- Long assumptions and escalations wrap instead of being cut off.
- `plan` ends with three choices: Implement (builds it right away), Discuss it first, or Keep it for later. Choosing Implement on a standalone plan now starts the build instead of stopping at "approved".
- The flow no longer stalls after `implement`: Implement on a standalone plan, or a directly started `implement`, continues through review, summary and clean-up via `run --resume`, which now picks up after a finished phase.
- A task that changed no code records its review as skipped; the live view shows it struck through instead of pending.
- The live view finds a task whose `.flow/` lives in another repository than the one the session started in (a plan written in the frontend repo from a backend session): any tool call that touches that `.flow/` adds the project to the folders the mod watches.
- The live view shows a task from its first second: `plan` writes `state.json` before it reads the project (and removes it again for a trivial task), instead of only after sizing.
- When a terminal is too narrow for the panel to open on its own (under 144 columns), a toast says `/devflow-status` opens it.
- Live view: a flow that stopped part-way says so, names the next step and the command that continues it; sub-steps read in plain words (`integrate` is "final checks") with a hint for the current one, in a tree under their phase.

## 0.2.0

- Plans size parts by the work: related changes in one layer stay in one part, and a change of a few lines is never a part of its own. The plan-checker flags parts split too fine or too large.
- Every part in a plan carries a task checklist (`- [ ]`); implementers tick each task in `plan.md` when it is built and its test passes, and the coordinator checks that every task is ticked.
- `implement` gives small parts in the same layer to one implementer instead of starting an agent per part.
- README: screenshots retaken from the redesigned, dark presentation.

## 0.1.1

- Implementers end their run only after writing a report (`DONE`, `BLOCKED` or `PARTIAL`); a missing report counts as `PARTIAL`, and a part is re-dispatched at most twice for the same reason before it comes to the developer.
- A check that failed to start is reported as such and never counts as a pass.
- Review: a finder reply without `CANDIDATES:` or a verifier reply missing a verdict is continued once instead of being read as "no findings"; anything still unverified is reported as `look-at`.
- The explorer answers every question before returning; what it cannot settle goes under `Not found`.
- `run` states in one line what each phase will do and what came out of it.
- Agent narration: a larger token budget so Haiku's thinking cannot leave the label empty; empty replies keep the previous label.
- README: screenshots of the band, panel, figures and an example finding replace the text mockups.

## 0.1.0

First public release.

- `/devflow:run`: the whole flow from request to a reviewed change, sized to the task (trivial, light, full) with review depth set by risk.
- `/devflow:plan`: grounded planning with batched questions and recommended answers, blast radius, behaviour changes, a short brief and an explicit "Implement?"; proposes the foundation for new projects.
- `/devflow:implement`: implementer subagents for backend, frontend and other parts, tests first, following the project's docs, architecture and conventions.
- `/devflow:review`: finder and refuting verifiers, findings with severity, action and "what it breaks", auto-fixes, a fix-only second round, implementer suggestions with a verdict, `REVIEW.md` proposals.
- `summary`, and the `code-rules`, `fe-rules` and `be-rules` rule sets.
- Live mod: phase band above the prompt, panel with flow map, agent lanes, review funnel, findings, blast radius, checks and a session section (model, effort, context, rate limits, cost); optional Haiku narration; `/devflow-status`.
- Eval suite for `claude plugin eval` and tests for the mod.
