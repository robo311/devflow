# Findings: what counts, how it is classified, how it is written

Single source of truth for the review skill, the finder and the verifier.

## What counts as a finding

A finding is a defect that a real user, caller or operator of **this** project can hit. Every finding carries:

- **A failure scenario**: concrete input or state → the wrong result it produces. "Could be a problem" is not a scenario.
- **Reachability**: the path by which that input or state actually arrives, traced through callers, validation, framework guarantees and the project's documented constraints. A scenario that upstream code already rules out is unreachable.
- **Evidence**: `file:line` for the defect and for every claim the scenario rests on.

Valid kinds of finding:

- **Bug**: wrong behaviour, a broken edge case that is reachable, a missing error path at a system boundary, data loss, a race that real traffic can trigger.
- **Security**: an exploitable path with its attacker-controlled input named.
- **Contract break**: a change that breaks callers, consumers, API shape, generated types, documented behaviour.
- **Convention deviation**: the change does something differently from how the project already does it, shown by at least two existing examples (`file:line`) or a project doc. Example: every handler returns errors through `respondError()` and the new one builds the JSON by hand.
- **Plan deviation**: when a plan or brief exists, behaviour it asked for is missing, behaviour it did not ask for was added, or a test does not test the criterion it claims to cover.
- **Missing project check**: a project check (test, lint, type check, schema or spec validation) fails, or a check the project requires for this kind of change was not updated (example: an endpoint changed, its OpenAPI spec did not).

Report each **class** of defect once and list every location where it occurs.

## What is dropped

Each of these is dropped before it reaches the developer:

- Style, formatting, naming taste and "cleaner" rewrites with no failure scenario. Formatting belongs to the project's formatter.
- Preferences with no support in the project's code or docs.
- Hypotheticals: scenarios whose input cannot arrive, "in the future someone might", defensive checks against states the code already prevents.
- Restatements of what a passing project check already proves.

"No findings" is the expected result for a sound change. A clean review states what was checked and stops.

## Severity

How bad the failure is when it happens. Judge by the impact in the failure scenario, not by how much code the fix needs.

- `critical`: a security hole, data loss or corruption, wrong money, a crash or outage on a main path, a migration that fails or cannot be rolled back.
- `high`: a feature does not work for a realistic case, or a contract break that callers or consumers will hit.
- `medium`: wrong behaviour in a less common but reachable case, a convention deviation that makes behaviour inconsistent, a missing or failing project check.
- `low`: a real defect with limited impact or an easy workaround, a convention deviation with no effect on behaviour.

Nitpicks have no severity: they are dropped (see above).

## Origin

- New (the default, no tag): introduced or made reachable by this change.
- `pre-existing`: the defect exists in code this change did not write, and this change's code path depends on it or makes it reachable. Pre-existing defects elsewhere in the file are out of scope. Pre-existing findings are never the author's fault and never trigger another review round.

## Action

- `auto-fix`: verified, small, local, inside the change's scope, with exactly one obvious fix that changes no behaviour the developer chose. Typical: a missed convention with clear examples, an off-by-one with a single correct reading, a forgotten spec update. The fix is applied and listed in the report.
- `needs-you`: more than one reasonable fix, a design alternative, a fix that reaches beyond the change, behaviour outside the plan, a real trade-off, or anything pre-existing that needs fixing.
- `look-at`: no defect is claimed, and the developer should still read this spot. Give the reason: risky area (auth, money, data deletion, migrations, concurrency), behaviour that the tests cannot cover, a deviation from the plan that may be intended, or a candidate the verifier could not settle (name the check that would settle it).

When torn between `auto-fix` and `needs-you`, choose `needs-you`.

## Format

Write so that any developer who has not seen the change understands the finding without opening other files first: plain words, and every project-specific term explained where it first appears. Use the language of the conversation.

```
F<n> [<severity> · <action>]  <path>:<line>          (a pre-existing finding: [<severity> · pre-existing · <action>])
Problem:          what is wrong, in one or two sentences
When it happens:  the failure scenario (input or state → wrong result)
What it breaks:   what fails in the codebase as it is now: the feature, endpoint, screen,
                  job or data that goes wrong, traced through its callers (path:line)
Recommended fix:  what to change and why this way
Alternatives:     only real ones, each with its trade-off (omit the line when there are none)
Evidence:         file:line references the claim rests on
```

A `look-at` item claims no defect, so it has no severity: its tag is `[look-at]`, it uses `Why look:` in place of `Problem` / `When it happens`, and it has no fix lines. `F<n>` is the item's number in the report; the review skill assigns it.
