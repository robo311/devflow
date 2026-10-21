---
name: analyze
description: Analyse whether a proposed task or idea can be done in this project, what it needs, what it would affect and the trade-offs, written so non-technical readers can follow it. Use when asked for a technical analysis, a feasibility check, an impact assessment or "can we do X / what would it take" before deciding to build it; not for planning or building it.
argument-hint: "<task or idea>"
---

# Analyze

An analysis answers "can we, what would it take, and what would it change?" before anyone decides to build. The people who decide read it (a product owner, a manager, a client) as well as the developers, so it speaks in plain words and keeps the evidence for those who want it. It is not a plan: it lays out what is possible, what it costs and what it touches, and leaves the how-to-build to `devflow:plan`. Nothing in the project changes: no code, no installs, no generators, no migrations.

Task: `$ARGUMENTS`

References, read when the step names them:
- `${CLAUDE_PLUGIN_ROOT}/skills/analyze/references/analysis-format.md`: the report's format and how to write for non-technical readers.

## 1. Understand the question

Pick `<slug>`, a short kebab-case name for the subject, create `.flow/<slug>/`, and make sure `.flow/` is listed in `.git/info/exclude` (add it when missing). Write no `state.json`: an analysis is not a task the live view or `run --resume` follows.

Work out what is proposed, what decision the analysis feeds (go or no-go, which option, how much it costs) and who will read it. Ask only when the request reads two ways that would lead to different analyses, in one round, each question with your recommended answer. Everything else you settle yourself and state at the top of the report as the reading you took.

## 2. Ground

1. Read the project's own guidance: `CLAUDE.md` / `AGENTS.md`, README, and `docs/` files related to the subject.
2. Find how the project handles this today and what the change would have to touch. For anything beyond a few direct lookups, dispatch `devflow:explorer` with concrete questions, several in parallel for separate areas.
3. Follow the change past the code: scheduled jobs, reports, exports, emails, other services and repositories, third-party systems and the contracts or limits behind them, data that is already stored. What breaks or turns wrong if it is forgotten belongs here.
4. Every fact carries its evidence (`path:line`, a doc, a command's output). What you could not confirm is an `ASSUMPTION` with what would confirm it; a question only a person can answer is a decision for step 3.

Done when you can say whether it can be done here, what has to exist first, what changes, and who or what notices.

## 3. Weigh

- **Verdict**: doable, doable with conditions, or not doable as asked (and what would make it doable). It rests on what you found, not on what is usual.
- **Options**: think of more than one way and drop the weak ones. Keep those a decision-maker would genuinely choose between, usually two or three. For each: what it gives, what it costs, its risk, what it makes harder later, and its size (small, medium or large, with what drives it). Recommend one and say why. With a single sensible way, say why there is no alternative.
- **Effort** is relative size and its drivers. Give no hours or days unless the developer asks for them or the project has a basis for them.
- **Decisions needed**: the questions people outside the code have to answer (business rules, budget, a vendor change), each with who decides and your recommendation.

## 4. Write

Write `.flow/<slug>/analysis.md` with `analysis-format.md`, in the language of the conversation unless the developer asks for another.

Show the short version in the conversation, about ten lines: the verdict, the options with the recommended one, the decisions needed, and the file's path. Do not paste the whole report.

## 5. Hand off

End with what can happen next, in one or two lines: share the report as it is, settle the decisions needed, or plan it with `/devflow:plan` pointing to the analysis, which picks up its facts and its slug. Do not start planning or building unless the developer asks.
