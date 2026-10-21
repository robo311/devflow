# The review guide

The automated review hunted for defects and proved what it reported. It cannot tell whether the change is what the developer meant, whether a decision taken for them is right, or how the change behaves where no check runs. `review-guide.md` hands the developer only what matters for that: a short list they can work through in minutes, not every detail of the diff.

## What earns a place

Choose from the diff, `plan.md`, `review.md` and the implementer reports. Ask of each candidate: if this were wrong, would the task have failed, or would someone notice? Only those earn a place:

- The acceptance criteria and the behaviour that changed: what users, API consumers or data now see differently.
- The parts the task's success rests on, where a plausible mistake still passes the tests.
- Risk paths the change actually touches: authentication, payments, migrations, deletion of user data, secrets, public contracts, CI and deploy.
- Decisions taken for the developer: the `[my call]`s and `ASSUMPTION`s that change behaviour, and `needs-you` findings left open.
- Follow-ups made after the review: nothing reviewed them.

Leave out edge cases the change does not reach, code a test pins directly, mechanical changes (moves, renames, formatting, generated and lock files), and anything the review checked and fixed with nothing left to decide. A guide that lists everything gets skimmed; one that lists what matters gets read.

Aim for three to six boxes in all; a small light task may have one or two. When nothing earns a place, say so in one line with the reason it is safe ("pinned by the new tests in `x.test.ts`; the review found nothing in `y`").

## Format

Write it in the language of the conversation. Leave out empty sections. Count about two minutes per box under Read and one per other box.

```
# Review guide: <task title>
<N> checks · ~<M> min · review: <its Findings line, short>

## Read
- [ ] <a question answered by reading the lines, never "review this file">
      `path:line`
      If wrong: <what breaks, for whom>

## Confirm
- [ ] Decided for you: <the call, where it is written>. Keep it?
- [ ] Try: <steps> → <what should happen>
- [ ] Nobody checked: <what neither the review nor the checks covered>

Safe to skim: `path`, `path` (<why, a few words>)

---
Worth knowing
- <topic>: <the idea behind a Read check, on this code, in two sentences>
```

`Worth knowing` is optional: one or two entries, only when a check rests on an idea a working developer may not know or may not connect to this case. Never generic advice.
