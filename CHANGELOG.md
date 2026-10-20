# Changelog

All notable changes to devflow. Versions follow the `version` in `.claude-plugin/plugin.json`; Claude Code offers an update when it changes.

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
