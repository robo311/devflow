# The review guide

The automated review hunted for defects and proved what it reported. It cannot tell whether the change is what the developer meant, whether a decision taken for them is right, or how the change behaves where no check runs. `review-guide.md` hands the developer exactly that, most important first, and nothing else: working through it takes minutes, not an afternoon reading the whole diff. Along the way it teaches: every check says why it matters and, where there is a real idea behind it, explains the idea on this code.

## What earns a place

Choose from the diff, `plan.md`, `review.md` and the implementer reports. A spot earns a place when a human eye catches what the tests and the review cannot:

- Logic where a plausible mistake still passes the tests: boundaries and off-by-one, ordering, time zones, rounding, empty and missing values, permission checks, error paths that swallow or retry.
- Risk paths the change touches: authentication, payments, migrations, deletion of user data, secrets, public contracts, CI and deploy.
- Trade-offs taken, and every `[my call]` and `ASSUMPTION` in the plan, reports and review.
- The review's `look-at` items and the `needs-you` findings left open.
- Places that depart from the project's conventions or bring in a new pattern.
- Contracts others depend on: the blast radius in `state.json`, API shapes, events, schemas.
- Follow-ups made after the review: nothing reviewed them.

Leave out code a test pins directly, mechanical changes (renames, moved code, formatting, generated and lock files), and anything the review checked and fixed with nothing left to decide. They go under **Safe to skim**, one line per group.

"Read these" holds at most about eight items, and fewer is better: a small light task may have two. When nothing earns a place, say so in one line with the reason it is safe ("the change is pinned by the new tests in `x.test.ts` and the review found nothing in `y`").

## Each check

- **A question** the developer answers by reading the lines, never "review this file": "Does the cursor reset when the filter changes?"
- **`path:line`** (or a line range) at the exact hunk.
- **Look for**: the concrete thing to check, and how to tell right from wrong.
- **Why**: what breaks if it is wrong, for whom and when.
- **Learn** (optional): the idea behind the check in two or three sentences, on this code: the pattern, the failure mode, why the project does it this way. Only when it teaches something a working developer may not know or may not have connected to this case; never generic advice ("write tests", "handle errors"). A few good lessons per guide, not one per item.

## Format

Write it in the language of the conversation. Leave out empty sections. Count about two minutes per "Read these" item and one per other box.

```
# Review guide: <task title>
<N> checks, about <M> minutes. The automated review checked <its Checked areas, in a few words> and found <its Findings line, short>. What is left for you is below, most important first. Tick each box as you go; the live panel counts them.

## Is this what you wanted?
- [ ] <behaviour before → after>: <how to confirm it, one line>

## Read these
- [ ] **<question>** · `path:line`
  Look for: <what to check and how to tell right from wrong>
  Why: <what breaks, for whom, when>
  Learn: <the idea behind it, on this code>

## Decisions made for you
- [ ] <the [my call] or ASSUMPTION> · <where it is written>: keep it? If not: <what changes>

## Try it
- [ ] <steps> → <what should happen>

## Nobody checked this
- [ ] <what neither the review nor the checks covered: a skipped check, look and feel, real data or load, another repository in the blast radius>: accept it, or check it by <how>

## Safe to skim
- `path`, `path`: <why no close read is needed>
```
