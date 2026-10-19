---
type: llm
weight: 2
---

PASS if the review reports, as a finding, that src/handlers/orders.js returns its 404 as `{ message }` instead of going through `respondError()` like the users and products handlers, and that this breaks the `{ error: { code, message } }` shape (for example, the client in src/client/api.js reads `body.error.code` and would throw on a missing order instead of returning null).
FAIL if that deviation is missing, or is mentioned only as a style suggestion without the broken error shape.
