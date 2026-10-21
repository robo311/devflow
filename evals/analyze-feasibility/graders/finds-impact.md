---
type: llm
focus: trace
weight: 2
---

Judge the analysis the assistant produced (the report file it wrote, or its reply if it wrote none).

PASS if it names all three of these as affected by multi-currency support: the invoices (amounts are always shown with the € sign), the nightly daily-revenue report for finance (it adds up all order totals, which would mix currencies), and the accounting export, including that the accounting software accepts only EUR in fixed columns so changing it needs the vendor. It must also raise exchange rates (where rates come from, or when an amount is converted) as a decision or open question.
FAIL if any of the three areas or the exchange-rate question is missing, or if it treats the accounting export as a change inside this project alone.
