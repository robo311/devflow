---
type: llm
---

PASS if the review reports no defects in the change and presents no style, naming or "could be cleaner" suggestions as problems to fix. A short list of what was checked is fine.
FAIL if the review presents any issue with the price formatter or the order summary as a problem the developer should fix (for example floating point in `cents / 100`, the hard-coded locale or currency, or missing input validation).
