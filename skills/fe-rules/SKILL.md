---
name: fe-rules
description: Rules for frontend code: design, state and data flow, loading/error/empty states, API types, components, forms, accessibility, SEO for public pages, client-side security and performance. Use when implementing or changing UI code, and when judging whether it follows them.
---

# Frontend rules

These add to `code-rules` for UI code, under the same priority: the developer's instructions and the plan first, then the project's docs (`CLAUDE.md`, `AGENTS.md`, `docs/`), then its existing frontend code and conventions, then these rules. Apply each rule where its subject exists; when its area does not exist in the project (no public pages, no i18n, no forms), skip it and name the skip in the report.

## Design

- Follow the project's existing design: its design system or UI kit, tokens, typography, spacing, layout patterns and component look. A new screen looks like it belongs, unless the developer asked for something different.
- Colours, spacing and breakpoints come from the project's tokens or theme, not literals.

## Data and state

- Keep one source of truth for each piece of state; derive values instead of copying them into new state.
- Keep server data (fetched, cached) apart from UI state (open, selected, draft), using the project's store or data-fetching pattern.
- State worth sharing or restoring (filters, pagination, selected tab) lives in the URL when the project does that elsewhere.

## Async UI

- Every view that loads data has a loading state, an error state and an empty state, shown the way the project already shows them.
- Actions that call the server show progress, block double submission, and report failure to the user.

## API contract

- Use the project's generated or shared API types; when the backend part of the same task changes the contract, build on its final shape from that part's report.
- Optional and nullable fields in the contract are handled as real states, not assumed present.

## Components

- A component renders and wires events; logic that is not about rendering lives in the project's composables, hooks or services.
- Props go down, events go up; a child does not reach into its parent's state.

## Forms

- Client validation mirrors the backend rules and shows messages next to the field; the backend stays the authority.
- Invalid fields carry `aria-invalid` and `aria-describedby` pointing at their message; after a failed submit, focus moves to the first invalid field or the error summary; an error is never shown by colour alone.
- Inputs use the most specific `type` and a correct `autocomplete` token (`email`, `current-password`, `new-password`, `one-time-code`, ...); pasting is never blocked.
- The user's input survives a failed submit.

## Accessibility

- Semantic elements first (`button` for actions, `a` for navigation, labelled form controls).
- Everything works with the keyboard, focus is visible and moves sensibly after dialogs and route changes, images have meaningful `alt`.
- Icon-only buttons and links have an accessible name (`aria-label` or visually hidden text); the decorative icon inside gets `aria-hidden="true"`.
- Modals use the native `<dialog>` with `showModal()`, or make the background `inert`, so focus cannot leave the open dialog.
- Messages that appear without moving focus (saved, toasts, async errors) go into a live region (`role="status"`, or `role="alert"` for errors) that is already in the page before the message is inserted.
- Animations, carousels and autoplaying media respect `prefers-reduced-motion`.

## Text and formatting

- User-facing text goes through the project's i18n when it has one.
- Dates, numbers and currency are formatted with `Intl` or the project's i18n, with an explicit locale and time zone, so server and client render the same.

## Media and performance

- Images have `width` and `height` (or a reserved aspect ratio); images below the first screen load lazily, the main above-the-fold image never does.
- No requests in loops where one request would do; heavy routes and components load lazily when the project does that.

## SEO (public, indexable pages)

Only for pages search engines are meant to index; skip for apps behind a login.

- Each route has its own `<title>`, meta description, canonical URL and Open Graph tags, present in the server-rendered HTML together with the main content and real `<a href>` links.
- A missing resource answers with HTTP 404 or 410, not a 200 page saying "not found" and not a redirect to the home page.
- Staging, preview and admin pages carry `noindex`.

## Security

- Untrusted data never reaches raw HTML (`v-html`, `innerHTML`, `dangerouslySetInnerHTML`) unsanitised.
- No secrets in client code or bundles.
