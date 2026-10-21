# Analysis format

## Writing for people who do not read code

The report is read by people who decide, not only by developers. Everything above the last section is written for them:

- Name things by what they do for someone, not by what they are called in the code: "the nightly revenue email to finance", not `dailyRevenue`.
- No code, snippets, file paths, function, class or table names. Evidence goes in **For developers** at the end.
- A technical term you cannot avoid is explained the first time, in a clause.
- Consequences are concrete: who notices what, and when ("customers paying in USD would get an invoice in euros").
- A guess never reads as a fact. Write "not confirmed:" with what would confirm it, or put it under **Decisions needed** when a person has to answer it.
- Scale it to the subject: a small question gets a short report. Leave out sections that would be empty. The part above **For developers** should read in a few minutes.

## Format

```
# <subject in the requester's words>
<date> · Analysis · <the request in one line>

## Verdict
Doable | Doable with conditions | Not doable as asked.
Two or three sentences: why, the main condition or blocker, and the recommended option.

## What was asked
The request as understood, and the reading taken where it was unclear.
What this analysis covers and what it leaves out.

## How it works today
Only what the reader needs to follow the rest.

## What it would take
What has to be built or changed, grouped by area as the reader knows them
("invoices", "reports for finance"), and what has to happen outside the project:
other teams, vendors and contracts, data that already exists.

## What it affects
Who and what notices the change, and how: customers, staff, other teams, other
systems, stored data, reports. Before → after where it helps. Include what turns
wrong if it is forgotten.

## Options
### A. <name> (recommended)
What it is, in two or three sentences.
Gives: <what the business gets>
Costs: <what it takes, and what it gives up>
Risk: <what could go wrong>
Size: small | medium | large: <what drives it>

### B. <name>
...

Why A: one or two sentences. With a single option: why there is no real alternative.

## Risks and unknowns
- <risk or unknown>: what could happen, how we would find out, how to guard against it.

## Decisions needed
- <question>: who decides · recommended: <answer>

## Next steps
What to confirm or decide first, then what follows if the answer is yes.

## For developers
- Found: <fact> (`path:line`)
- ASSUMPTION: <what is assumed> (verify by: <check>)
- A plan must also cover: <areas a reader would forget: migrations, specs, generated types, configs>
```

**For developers** is the only section with paths, code names and technical detail, and it is where a later `devflow:plan` starts from.
