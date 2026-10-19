---
type: regex
pattern: "respondError\\(res,\\s*404"
match: "count:2"
target: { source: file, path: src/handlers/orders.js }
---
