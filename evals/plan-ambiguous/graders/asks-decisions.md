---
type: llm
focus: trace
weight: 2
---

PASS if the assistant asks the developer about the decisions that define a discount (for example: percentage or fixed amount, per item or per order, how a discount is applied or who grants it, how it combines with other discounts or affects stored totals), either through the AskUserQuestion tool or as questions in its reply, and gives a recommended answer for its questions.
FAIL if it asks nothing and decides these itself without tagging them as its own call or assumption, or if it asks only generic questions unrelated to what a discount means in this project.
