# REVIEW.md: template and proposal rules

`REVIEW.md` sits at the project root and tells reviewers what failure means in this project. Reviewers read it on every review.

## Template

```markdown
# Review guide

## What failure looks like here
<!-- One line per area: what a defect in it does to users or operators. -->
- API: a response that no longer matches the OpenAPI spec breaks the frontend's generated types.
- Migrations: a migration that cannot be rolled back.

## Risk paths
<!-- Paths that always get a deep review and a human read. Globs are fine. -->
- src/auth/**
- migrations/**

## Project checks
<!-- Commands a reviewer runs, and when. -->
- `composer test`: always
- `composer check-openapi`: when a route, request or response changes

## Skip
<!-- Generated or vendored paths that reviewers ignore. -->
- public/build/**

## Conventions worth enforcing
<!-- Only ones that are not obvious from the code or written elsewhere. -->
- Handlers return errors through `respondError()`; the shape is `{ error: { code, message } }`.
```

## Proposal rules

After a review, propose a new `REVIEW.md` (when none exists) or additions to the existing one. Each proposed line rests on something this review actually met:

- a risk path the change touched that the file does not list,
- a project check the review ran or found missing,
- a convention the review enforced from examples,
- a generated path that cluttered the diff.

Show the proposal as a short diff or a filled-in template with one reason per line. The developer decides; the file is written only after they agree. Propose nothing when the review met nothing new.
