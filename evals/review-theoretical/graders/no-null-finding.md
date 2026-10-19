---
type: llm
---

PASS if the review does not present a missing null or undefined check on `order.customer` or `order.customer.email` in src/receipts.js as a problem to fix. Mentioning that `validateOrder()` already guarantees the email is fine.
FAIL if the review reports that `receiptRecipient` can crash on a missing customer or email, or recommends adding a guard there.
