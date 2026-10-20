# Tiers

A task's tier sets how much planning, implementation machinery and review it gets. Two separate axes decide it:

- **Size and uncertainty** set the tier: how much planning the task needs.
- **Risk** sets the review depth, whatever the tier.

## The tiers

| Tier | The task | Plan | Implementation | Review |
|---|---|---|---|---|
| `trivial` | One clear, local change with no decisions left: a typo, a renamed label, a one-line fix whose cause is known | none; one line saying what will change | the coordinator itself | project checks + a self-check of the diff |
| `light` | A small feature or fix in one area, at most one open decision | short plan (intent, change, done check), one confirmation | one implementer, or the coordinator for a few lines | `devflow:review`, depth by risk |
| `full` | New behaviour, several parts or repositories, a contract change, open decisions, or unclear requirements | design plan, builder check, explicit approval | one implementer per part, small parts grouped | `devflow:review`, depth by risk, round 2 |

Starting a new project is always `full`: its foundation needs the developer's confirmation.

Pick the lowest tier that fits. When two fit, explain the choice in one line and let the developer override it.

## Risk paths

A task that touches a risk path gets a `deep` review at any tier, and is at least `light`. Risk paths are the ones `REVIEW.md` lists plus the defaults: authentication, sessions and permissions; payments and billing; migrations and schema; deletion of user data; secrets and cryptography; public API contracts; CI and deploy configuration.

## Escalation

The tier is re-checked at every phase. Raise it when:

- the change grows past what the tier expected (a `light` task spreading over several areas),
- a risk path turns out to be involved,
- an open decision or a contradiction appears,
- an implementer reports it is blocked.

Raise it out loud in one line (`light → full: the change also needs a migration`) and do the missing planning for the new tier before continuing. A tier is never lowered silently; offer it and let the developer decide.

## The announcement

State the tier in one line with its reason and the review depth, for example:

`Tier: full (new endpoint + frontend page, contract change) · review: deep (touches src/auth)`
