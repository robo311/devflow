---
name: be-rules
description: Rules for backend code: input validation, authorization, transactions, migrations, API contracts, errors and logging, queries, external calls, jobs. Use when implementing or changing server-side code, and when judging whether it follows them.
---

# Backend rules

These add to `code-rules` for server-side code, under the same priority: the developer's instructions and the plan first, then the project's docs (`CLAUDE.md`, `AGENTS.md`, `docs/`), then its existing backend code and conventions, then these rules. Apply each rule where its subject exists in the task.

## Architecture and language

- Build inside the project's backend architecture: its layers (controller, service, repository, domain), dependency injection, module boundaries and patterns. A new endpoint, job or service is shaped like the existing ones.
- When you see a better design than the project's, build it the project's way and put the alternative in your report as a suggestion, with what it would buy.
- Where the project is silent, follow the language's and framework's idioms and best practices: their type system, error handling, standard library and the framework's own way of doing validation, persistence and configuration.

## Input

- Validate and normalise input at the boundary (controller, handler, command, consumer) into a typed shape before it reaches domain code; reject invalid input in the project's error format.

## Authorization

- Every new or changed entry point checks who may do this to which record: ownership or tenant, not only "is logged in".

## Consistency

- Writes that must succeed together run in one transaction.
- Handlers that can be retried (webhooks, queue consumers, payment callbacks) are idempotent.

## Migrations

- Every migration has a working rollback, or the plan says why it cannot.
- Migrations are safe on existing data: new columns are nullable or have defaults, backfills are explicit, destructive changes (drop, rename, type change) happen only when the plan includes them.

## API contract

- Response shapes and status codes follow the project's conventions.
- A contract change updates everything that describes it in the same task: the API spec (OpenAPI or similar), generated types and clients, and docs.
- Existing consumers keep working, or the plan says how they change.

## Errors and logging

- Errors leave in the project's error format with a stable code.
- Logs carry enough context to debug (ids, operation) and never secrets, tokens or personal data; responses never leak internals.

## Data access

- No queries in loops where one query would do; lists that can grow are paginated; new filters and joins are backed by an index or the report says why not.

## External calls

- Calls to other services have a timeout, a defined behaviour on failure, and retries only where the call is safe to repeat.

## Time, money, config

- Time zones are explicit; money uses integer minor units or the project's decimal type, never floats.
- Configuration and secrets come through the project's config mechanism, never hard-coded.

## Background jobs

- Jobs are idempotent, report failure, and can be re-run safely.
