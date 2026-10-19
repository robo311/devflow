# state.json

`.flow/<slug>/state.json` (or `<review dir>/state.json` for a standalone review) records where a task is. Three readers rely on it: the skills, to resume after the conversation is summarised or restarted; the devflow mod, to draw the progress; the developer. Rewrite the whole file at each update point below; keep it small.

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
- `step`: the step inside the phase, as the skill names it (`ground`, `decide`, `builder-check`, `approve`; `part 2`, `integrate`; `packet`, `find`, `verify`, `fix`, `round-2`, `report`)
- `waitingFor`: `null` while working; otherwise a few words on what the developer must do (`plan approval`, `decision on F1, F3`, `answer for part 2`)
- part `status`: `pending` · `running` · `done` · `blocked` · `partial`
- finding `status`: `open` · `fixed` · `kept` (the developer chose to leave it)

## Update points

- **plan**: when the tier is decided (create the file, `phase: plan`); each time a question round or approval starts (`waitingFor`) and ends; approved.
- **implement**: phase start; each part dispatched, returned or blocked; integrate.
- **review**: each step start; after verification (funnel counts); each decision asked and answered; report written.
- **summary / finish**: phase start; `phase: done` at the end.

Write `updatedAt` on every update. Fields that do not apply yet are left out.
