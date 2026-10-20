---
name: review
description: Review code changes for real defects, verify each finding, fix the obvious ones and bring the rest to the developer. Use when reviewing uncommitted changes, a branch against its base, or a devflow task before it is called done.
argument-hint: "[base-ref] [--task <slug>] [--depth quick|standard|deep] [--report-only]"
---

# Review

Find the defects in a change that a real user, caller or operator would hit, prove each one, fix what has one obvious fix, and hand the developer only what needs their judgement. A sound change gets a short "no findings" report. Cost scales with the depth of the review: small changes get one finder and verification only when something was found.

`${CLAUDE_PLUGIN_ROOT}/skills/review/references/findings.md` defines what counts as a finding, severity, action and the finding format. Read it before step 4; the finder and verifier read it too.

Arguments: `$ARGUMENTS`

- `base-ref`: review everything that differs from this commit or branch (default `HEAD`, which means uncommitted work, untracked files included).
- `--task <slug>`: a devflow task; its plan and briefs in `.flow/<slug>/` are the intent.
- `--depth`: set by the caller. It can only raise the depth step 3 picks, never lower it.
- `--report-only`: review and report, change no files.

## 1. Scope

1. Confirm a git repository (`git rev-parse --show-toplevel`). Without one, ask the developer which files to review and treat them as fully new.
2. Pick the task folder: `.flow/<slug>/` with `--task`, else a new `.flow/reviews/<YYYYMMDD-HHMMSS>/`, laid out as `${CLAUDE_PLUGIN_ROOT}/skills/run/references/state.md` describes. The report goes to its top as `review.md`; every working file of the review (snapshots, diffs, the packet, candidates) goes to its `agents/review/` folder, called the working folder below. Make sure `.flow/` is listed in `.git/info/exclude`, adding it when missing. Keep the folder's `agents/state.json` current as `state.md` describes. Set `phase: review` and update `step`, the funnel counts, findings and `waitingFor` as the review moves.
3. Snapshot the working tree: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/snapshot.sh"` prints a tree id. Save it in the working folder as `snapshot-round-1`.
4. Write the change to the working folder's `diff.patch`: `git diff <base-ref> <snapshot-round-1>`. In a repository with no commits, diff against the empty tree `4b825dc642cb6eb9a060e54bf8d69288fbee4904`.

Done when `diff.patch` exists. An empty diff ends the review: say there is nothing to review.

## 2. Packet

Build `packet.md` in the working folder once. Every agent reads it instead of rediscovering the project. It holds:

- **Intent**: the plan and briefs (`--task`), else what the developer said about the change in this conversation, else the commit messages in `base-ref..HEAD`. With none of these, write `Intent: not stated` and one line inferred from the diff, marked `ASSUMPTION`.
- **Diff**: the path to `diff.patch` and `git diff --stat` of it.
- **Project docs**: paths to `CLAUDE.md` and `AGENTS.md` (root and in every changed directory's ancestors), README, `docs/` files whose names relate to the changed areas, ADRs, `REVIEW.md`. Read `REVIEW.md` in full and copy its risk paths, skip paths and checks into the packet.
- **Checks**: the project checks you ran and their results (see below).
- **Risk paths touched**: changed files that match `REVIEW.md` risk paths or the default risk areas: authentication, sessions and permissions; payments and billing; migrations and schema; deletion of user data; secrets and cryptography; public API contracts; CI and deploy configuration.
- **Convention examples**: for each kind of changed file (a controller, a component, a migration, a test), two or three existing files in the project that do the same job.
- **Skip paths**: generated, vendored and lock files, plus `REVIEW.md` skips.
- **Implementer suggestions**: with `--task`, the `Suggestions` sections of `.flow/<slug>/agents/implementer-*-report.md`: changes outside the task that the implementers proposed and did not make.

**Project checks.** Find them in this order: `REVIEW.md`, then commands documented in `CLAUDE.md` / `AGENTS.md`, then scripts in `package.json`, `composer.json`, `Makefile`, `justfile`, `pyproject.toml` and similar whose names say lint, typecheck, test, check or validate. Run the ones that cover the changed areas, including project-specific validators (an OpenAPI or schema check when an endpoint changed). A check that deploys, publishes, migrates a real database, needs secrets or network access, or starts a server or watcher stays unrun; record it as skipped with the reason. Record each run as pass or fail, with the failing output trimmed to what locates the failure.

Done when every bullet above has an entry, even if the entry is "none found".

## 3. Depth

- `deep`: a risk path is touched.
- `quick`: at most about 150 changed lines of non-test code, one area of the code, no risk path.
- `standard`: everything else.

Count only non-test code. Test files (what the project's test runner picks up; by convention `test/`, `tests/`, `__tests__/`, `spec/` and `*.test.*`, `*.spec.*`, `*Test.php`, `*_test.*`), generated and lock files and skip paths do not count toward the size. The finder still reviews the tests.

A `--depth` argument raises the result, never lowers it. Record the depth and its one-line reason in the packet.

## 4. Find

Dispatch the `devflow:finder` agent with the packet path and the round (`1`). At `deep`, dispatch a second finder in parallel with `focus: security`. Save what they return to `candidates-round-1.md` in the working folder. A finder reply without a `CANDIDATES:` line is unfinished, not empty: continue that finder once, and if it still has none, record the gap in the report.

No candidates: skip step 5 (and go straight to step 8 when there are no implementer suggestions either).

## 5. Verify

Every candidate goes to the `devflow:verifier` agent, which tries to refute it. Pass the packet path, the candidate text and the language of the conversation.

- `quick`: one verifier for all candidates.
- `standard` and `deep`: one verifier per candidate the finder marked `critical` or `high`, one more for all the rest. At most five verifiers per round; past that, group candidates by file.
- `deep`, extra: a candidate a verifier confirms with action `needs-you` gets a second, independent verifier that does not see the first verdict. Both confirm: keep it. They split: keep it as `look-at` with both arguments. Both refute: drop it.

Verdicts: `CONFIRMED` (with the finished finding), `REFUTED` (with the reason), `UNSETTLED` (with the check that would settle it, which becomes a `look-at`).

A verifier reply that leaves a candidate without a verdict is unfinished: continue that verifier once for the missing ones, and report any candidate still without a verdict as `look-at` with "not verified".

Done when every candidate has a verdict.

## 6. Triage and fix

1. Merge the confirmed findings. Collapse duplicates into one finding per defect class with all its locations. Apply the severity and action rules from `findings.md`. Number every reported item, findings and `look-at` alike, `F1`, `F2`, … in report order; round 2 continues the sequence. Questions, fixes and the report refer to items by these numbers.
2. With `--report-only`, or with nothing to fix and no suggestions, go to step 8.
3. Apply every `auto-fix`, then rerun the project checks that cover the touched files.
4. Bring the `needs-you` findings to the developer in one message: each finding in full. With more than one, first ask how they want to go through them: **Decide one by one** (recommended), **Leave them all open** (nothing changes; they stay open in the report and the summary), or **Talk them through first** (explain each in more depth: what happens and when, why it matters, the options and their cost; then ask again). Deciding one by one is a question per finding with the recommended fix as the first option (use AskUserQuestion when available). Apply what they choose.
5. Bring the implementer suggestions to the developer. These are changes outside the task that an implementer noticed and, by the rules, left alone. A question has no room for their context, so first write them in the conversation, one short block each, numbered `S1`, `S2`, … with the most worthwhile first:

   ```
   S<n> <the change in a few words> · <path:line> · noticed by <implementer> in part <n>
   What:     the change, in one sentence
   Why:      what is wrong or could be better now, and what changing it would buy
   Cost:     size, what it touches (other files, the developer's uncommitted changes), any risk
   Finder:   worth it | not worth it: <why> · recommended: apply now | later | drop
   ```

   With more than one, first ask how they want to go through them: **Decide one by one**, **Skip all** (every suggestion goes to Later, nothing is applied), or **Talk them through first** (explain each in more depth, then ask again); recommend Skip all when the finder judged none of them worth it now. Deciding one by one is a question per suggestion (AskUserQuestion, up to four per call) with the options **Apply now**, **Later** (kept in the report and the summary's Later list) and **Drop**, the recommended one first. Apply only what they choose to apply now. A suggestion is never applied without that answer; with `--report-only`, list the blocks and ask nothing.

Done when every `auto-fix` is applied and every `needs-you` and suggestion has the developer's decision.

## 7. Round 2 (fixes only, at most once)

Runs only when step 6 changed files.

1. Snapshot again (`snapshot-round-2`) and write the fixes alone to `diff-round-2.patch`: `git diff <snapshot-round-1> <snapshot-round-2>`.
2. Dispatch the finder with round `2`, `diff-round-2.patch`, and the list of findings already reported. It looks at the fixes only and reports nothing already reported.
3. Verify and triage new candidates as in steps 5 and 6. Apply new `auto-fix` items and mark them "applied in round 2, not re-reviewed". Bring new `needs-you` items to the developer.
4. There is no round 3. If a new (not `pre-existing`) `critical` or `high` finding is still open after round 2, stop and tell the developer the problem is likely the approach rather than the details, and that it needs their call.

## 8. Report

Show the report in the conversation and save it as `review.md` at the top of the task folder. Use the language of the conversation. The first four lines are fixed:

```
## Review: <what was reviewed>
Depth: <quick|standard|deep> (<reason>) · Rounds: <1|2>
Checks: <command> ✓ · <command> ✗ · <command> skipped (<reason>)
Findings: <N> (critical <a> · high <b> · medium <c> · low <d>) · Look at: <M>
```

`Findings` counts defects, `pre-existing` ones included; the parentheses split them by severity and leave out zero counts (`Findings: 0` stands alone). `Look at` counts `look-at` items. Then, leaving out empty sections and listing findings within each section from most to least severe:

- **Needs you**: unresolved `needs-you` findings, in full.
- **Fixed**: each applied fix, with one line on what changed and the developer's decision where there was one.
- **Look at**: `look-at` items, each with `Why look:`.
- **Suggestions**: each implementer suggestion with the finder's verdict and the developer's decision (applied, later, dropped, open).
- **Checked**: the areas, files and kinds of defect examined, so a clean review shows its coverage.
- **Dropped by verification**: one line per refuted candidate with the reason. This shows how much noise the verification removed.

## 9. REVIEW.md proposal

Follow `${CLAUDE_PLUGIN_ROOT}/skills/review/references/review-md.md`: propose a new `REVIEW.md` or additions to the existing one, each line resting on something this review met. Write the file only after the developer agrees. Skip this step when the review met nothing new.

## 10. Clean up

With `--task`, skip this step: the task's own flow cleans up `.flow/<slug>/` when the whole task is finished.

Otherwise, once nothing is left open (every `needs-you` and suggestion decided, the `REVIEW.md` proposal answered), ask the developer whether the review is done and what to do with its files, in one question: keep only `review.md` and delete `agents/` (recommended), delete everything, or keep everything. Delete nothing without that answer. Then delete exactly what they chose inside this review's folder, and `.flow/reviews/` and `.flow/` only if they are left empty. While anything is still open, keep the files and say where the report is.
