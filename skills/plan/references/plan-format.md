# Plan format

Write the plan in the language of the conversation, short enough to read in a minute or two. Every decision carries its source:

- `[you]`: the developer decided it.
- `[my call]`: you decided it; one clause says why. The developer can overturn it.
- `ASSUMPTION`: not verified. Say what would verify it.

Facts about the project carry their evidence (`path:line`, a command's output). The developer reads `[my call]` and `ASSUMPTION` lines first, so every guess must be one of them.

## Light plan

```
## <task title>
Tier: light (<reason>) · review: <quick|standard|deep> (<reason>)

Intent:      one or two sentences: what changes for the user and why
Change:      the files or areas that change, and how
Behaviour:   what users, API consumers or data see differently: before → after ("none" for internal changes)
Affects:     code outside the change that depends on it (callers, consumers, jobs), with path; "nothing else"
Decisions:   only if any, each tagged [you] / [my call] / ASSUMPTION
Done when:   the observable checks: a test that fails now and passes after,
             a command whose output changes, a behaviour to try
```

## Full plan

```
## <task title>
Tier: full (<reason>) · review: <quick|standard|deep> (<reason>)

### Goal
One or two sentences: what changes for the user and why.

### Decided
- <decision>  [you]
- <decision>  [my call]: <why>
- ASSUMPTION: <what is assumed>  (verify by: <check>)

### Foundation
Only for a new project: language and runtime, framework, structure (a short directory
tree), architecture and layers, data storage, testing, tooling, how it runs. Each line
tagged [you] or [my call] with its reason.

### Approach
Only when real alternatives existed: the chosen one, the others in one line each
with why they lost.

### Parts
1. <part title>  (layer: be | fe | other · depends on: <part numbers> · repo: <when several>)
   Changes:    files or areas
   Acceptance: observable criteria, each one testable
2. ...

### What changes
Files, modules, endpoints, schemas, docs and specs that change, including the
ones a reader would forget: migrations, API specs, generated types, configs.

### Behaviour changes
What users, API consumers, other services or stored data see differently, as before → after.
Internal-only changes say so.

### Blast radius
Code and systems outside the parts that depend on what changes and could be affected:
callers, consumers, scheduled jobs, other repositories, caches, reports. Each with its
evidence (path:line, or how it was found) and what happens to it. Only what was found,
never a guess list; "nothing beyond the parts" is a valid answer.

### Out of scope
What this task deliberately leaves alone.

### Risks
What could go wrong and how the plan guards against it. Omit when none.

### Done when
The project checks to run and the acceptance criteria as tests.
```

## The brief

The developer approves from a brief in the conversation, not by reading the plan file. At most about fifteen lines:

```
**<task title>** · Tier: <tier> · review: <depth>
Foundation:    <new project only: stack · structure · architecture, in one line>
Outline:       1. <part in one line>  2. <part in one line> ...
Behaviour:     <before → after, only what users, consumers or data see>
Blast radius:  <affected code outside the parts, with path; or "nothing beyond the parts">
Check these:   <the [my call] and ASSUMPTION items worth the developer's attention, most important first, at most five>
Full plan:     .flow/<slug>/plan.md
```

Lead with what the developer must decide or verify; leave the rest to the file.

## Parts

A part is one unit of work for one implementer: one layer (`be`, `fe` or `other`), a clear set of files, and acceptance criteria it can test on its own. A full-stack feature splits into a `be` part that settles the API contract and an `fe` part that depends on it. Parts that share no files can run in parallel; everything else runs in order.
