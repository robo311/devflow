---
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Skill, Agent, AskUserQuestion, Write, Bash]
---

Plan this: add `GET /orders/:id/status` that returns `{ "status": order.status }`. A missing order returns 404 the same way `GET /orders/:id` does. Add a test like the existing one. Just write the plan; I'll approve it later.
