---
type: llm
focus: { source: file, path: src/handlers/orders.js }
---

PASS if the file defines a status handler that follows the same pattern as getOrder (finds the order, returns 404 through respondError when missing, otherwise responds with only `{ status }`), exports it, and has no comments that merely narrate what the code does and no debug output.
FAIL if the handler builds its error response by hand, returns more than the status, or the file contains narrating comments or console output.
