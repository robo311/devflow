# Changelog

All notable changes to devflow. Versions follow the `version` in `.claude-plugin/plugin.json`; Claude Code offers an update when it changes.

## 0.1.0

First public release.

- `/devflow:run`: the whole flow from request to a reviewed change, sized to the task (trivial, light, full) with review depth set by risk.
- `/devflow:plan`: grounded planning with batched questions and recommended answers, blast radius, behaviour changes, a short brief and an explicit "Implement?"; proposes the foundation for new projects.
- `/devflow:implement`: implementer subagents for backend, frontend and other parts, tests first, following the project's docs, architecture and conventions.
- `/devflow:review`: finder and refuting verifiers, findings with severity, action and "what it breaks", auto-fixes, a fix-only second round, implementer suggestions with a verdict, `REVIEW.md` proposals.
- `summary`, and the `code-rules`, `fe-rules` and `be-rules` rule sets.
- Live mod: phase band above the prompt, panel with flow map, agent lanes, review funnel, findings, blast radius, checks and a session section (model, effort, context, rate limits, cost); optional Haiku narration; `/devflow-status`.
- Eval suite for `claude plugin eval` and tests for the mod.
