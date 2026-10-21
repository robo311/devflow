---
type: llm
focus: trace
weight: 2
---

Judge the analysis the assistant produced (the report file it wrote, or its reply if it wrote none), as a reader from finance or sales who does not read code.

PASS if all hold:
- It opens with a clear verdict on whether this is doable, and under which conditions, before any detail.
- The main text has no code snippets or code blocks, and function names, file paths and technical terms are either absent from it or explained in plain words. File paths may appear in a section clearly marked for developers.
- It lays out at least two options or approaches with what each costs and gives, or explains why there is only one.
FAIL if a non-technical reader would need a developer to understand the verdict, or if the main text contains code.
