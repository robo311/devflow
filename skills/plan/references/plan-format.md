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
Model:       sonnet | opus (<reason, when opus>)
Tasks:       - [ ] <task>
             - [ ] <task>
Done when:   the observable checks: a test that fails now and passes after,
             a command whose output changes, a behaviour to try
```

A light plan is one part: one implementer builds all its tasks.

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
1. <part title>  (layer: be | fe | other · model: sonnet | opus · depends on: <part numbers> · repo: <when several>)
   Changes:    files or areas
   Model:      only for opus: why this part needs it
   Acceptance: observable criteria, each one testable
   Tasks:
   - [ ] <task>
   - [ ] <task>
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
Outline:       1. <part in one line> (sonnet | opus)  2. <part in one line> (sonnet | opus) ...
Behaviour:     <before → after, only what users, consumers or data see>
Blast radius:  <affected code outside the parts, with path; or "nothing beyond the parts">
Check these:   <the [my call] and ASSUMPTION items worth the developer's attention, most important first, at most five>
Full plan:     .flow/<slug>/plan.md
```

Lead with what the developer must decide or verify; leave the rest to the file.

## Parts

A part is the work one implementer takes on in one run: one layer (`be`, `fe` or `other`), a clear set of files, and acceptance criteria it can test on its own. Every implementer costs a fresh agent that has to read its way into the project, so size parts by the work, not by the file or the step:

- Keep related changes in one layer together. A handler, its route, its validation and its tests are one part, not four.
- Split only for a reason: a different layer (a full-stack feature splits into a `be` part that settles the API contract and an `fe` part that depends on it), a separate area of the code that the same agent would have to learn from scratch, or independent work worth running in parallel.
- A change of a few lines is never a part of its own. Fold it into the part it belongs with.

Most `full` tasks have two to four parts. Parts that share no files can run in parallel; everything else runs in order.

## Tasks

Each part lists its tasks: the concrete steps that build it, in the order they will be done, as Markdown checkboxes (`- [ ] <task>`). A task is one step a reviewer could check off by looking at the change: "add `getOrderStatus` to `src/handlers/orders.js`", "register `GET /orders/:id/status`", "test the 404 case". Two to six tasks per part is typical; a task that would take one line of code merges into its neighbour.

The implementer ticks a task (`- [x]`) in this file when it is built and its test or check passes, so the plan shows progress as the work moves. Write every task unticked.

## Models

Each part names the model its implementer runs on. The developer chooses at approval between this split and Opus for every part, so the split is your recommendation of where Sonnet is enough.

Give a part **Opus** when it:
- touches a risk path (`tiers.md`),
- changes a contract existing consumers rely on, or defines one another part of this plan builds against: an endpoint, a schema, shared types, events,
- lays a new project's foundation,
- has no existing code in the project to follow, or rests on an `ASSUMPTION` the implementer may have to revisit while building.

Give every other part **Sonnet**: it follows code the plan names, and its facts, tasks and acceptance criteria leave nothing to judge. When unsure, Opus.
