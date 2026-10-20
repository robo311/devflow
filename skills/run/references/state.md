# The task folder and state.json

## Layout

Every task lives in `.flow/<slug>/` (a standalone review in `.flow/reviews/<YYYYMMDD-HHMMSS>/`). What the developer reads sits at the top; the files agents hand to each other sit in `agents/`, which can be deleted once the task is done, all but `state.json`, which keeps the task resumable:

```
.flow/<slug>/
  plan.md          the approved plan, its tasks ticked as they are built
  review.md        the review report
  summary.md       what changed, for the developer
  review-guide.md  what is worth the developer's own review, as checkboxes
  changelog.md     the same, in plain words for whoever raised the task
  agents/          working files
    state.json                  where the task is (read by the skills and the live view)
    implementer-<n>-brief.md    what implementer run <n> builds
    implementer-<n>-report.md   what it built and how it checked it
    review/                     packet.md, diff.patch, candidates-round-<n>.md, snapshot-round-<n>, diff-round-2.patch
```

Never put a working file at the top, and never put a file the developer is meant to read in `agents/`.

## state.json

`.flow/<slug>/agents/state.json` records where a task is. Three readers rely on it: the skills, to resume after the conversation is summarised or restarted; the devflow mod, to draw the progress; the developer. Rewrite the whole file at each update point below; keep it small.

```json
{
  "task": "order-status",
  "title": "Order status endpoint",
  "base": "<commit the task started from>",
  "tier": "light",
  "reviewDepth": "deep",
  "phase": "review",
  "step": "verify",
  "waitingFor": null,
  "skipped": [],
  "updatedAt": "2026-10-20T14:03:00Z",
  "parts": [
    { "n": 1, "title": "Order status endpoint", "layer": "be", "agent": "implementer-be", "status": "done" }
  ],
  "checks": { "npm test": "pass", "npm run lint": "skipped: no lint script" },
  "assumptions": ["backend returns 401, not 403"],
  "escalations": ["light → full: the change also needs a migration"],
  "blastRadius": [{ "path": "src/client/api.js", "why": "reads the error shape" }],
  "review": {
    "round": 1,
    "candidates": 3, "confirmed": 1, "refuted": 1, "unsettled": 1,
    "findings": [{ "id": "F1", "severity": "high", "action": "needs-you", "status": "open", "path": "src/orders.js:12" }]
  }
}
```

Values:
- `phase`: `plan` · `implement` · `review` · `summary` · `finish` · `done`
- `step`: the step inside the phase, as the skill names it (`ground`, `decide`, `builder-check`, `approve`; `part 2`, `integrate`; `packet`, `find`, `verify`, `fix`, `round-2`, `report`; `follow-up 1`)
- `waitingFor`: `null` while working; otherwise a few words on what the developer must do (`plan approval`, `decision on F1, F3`, `answer for part 2`). Set it just before you ask, and back to `null` as the first thing you do after the developer answers.
- `skipped`: phases left out on purpose, with the reason said in the conversation and the summary (`["review"]` for a task that changed no code)
- part `status`: `pending` · `running` · `done` · `blocked` · `partial`
- `followUps`: fixes or additions the developer asked for after the summary, each `{ "n": 1, "ask": "<a few words>", "status": "working" }`; `status` is `working` · `done` · `moved` (it became a task of its own)
- finding `status`: `open` · `fixed` · `kept` (the developer chose to leave it)

## Update points

- **plan**: at its start (create the file: `title`, `phase: plan`, `step: ground`); when the tier is decided; each time a question round or approval starts (`waitingFor`) and ends; approved.
- **implement**: phase start; each part dispatched, returned or blocked; integrate.
- **review**: each step start; after verification (funnel counts); each decision asked and answered; report written.
- **summary / finish**: phase start; each follow-up started and finished; `phase: done` at the end.

Write `updatedAt` on every update. Fields that do not apply yet are left out.
