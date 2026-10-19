---
type: llm
weight: 2
---

PASS if the review reports, as a finding (not only as a "look at" note or a style remark), that `paginate` in src/paginate.js computes the offset as `page * size` while pages are 1-based, so page 1 skips the first page of orders (and the first `size` orders are never returned).
FAIL if that defect is missing, or is mentioned only as a suggestion, a nit or an uncertain note.
