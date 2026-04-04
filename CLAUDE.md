# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Start dev server (localhost:5173) with the demo page
yarn build        # Build and package the library
yarn lint         # Check formatting (Prettier) and linting (ESLint)
yarn format       # Auto-format all files with Prettier
yarn test         # Run tests in watch mode with coverage
yarn test:ci      # Run tests once (used in CI)
```

Run a single test file:

```bash
yarn vitest run src/lib/__tests__/useTooltip.test.js
```

## Architecture

This is a **Svelte action library** — it exports a single `useTooltip` action, not components.

**Data flow:**

```
use:useTooltip={params}
  → useTooltip.js (Svelte action wrapper: lifecycle, update/destroy delegation)
    → Tooltip.js (core class: DOM creation, positioning, events, animation)
```

- `src/lib/index.js` — public entry point, re-exports `useTooltip`
- `src/lib/useTooltip.js` — thin Svelte action wrapper; instantiates `Tooltip`, forwards `update()` and `destroy()` calls
- `src/lib/Tooltip.js` — all tooltip logic: DOM creation, viewport-aware positioning (flips when near edges), show/hide with optional animation and delay, content from text or `<template>` selector, interactive content via `contentActions`
- `src/lib/useTooltip.css` — default styles; consumers import this or write their own

**Positioning:** The tooltip checks viewport boundaries on show and flips to the opposite side if it would overflow. Primary position is passed as a prop (`top`/`bottom`/`left`/`right`).

**Content:** Either a plain string (`content`) or a CSS selector pointing to a `<template>` element (`contentSelector`). Template content is cloned into the tooltip DOM.

**Interactive content:** `contentActions` maps CSS selectors to `{ eventType, callback, callbackParams, closeOnCallback }` — event listeners are attached to cloned template content.

## Testing

Tests live in `src/lib/__tests__/useTooltip.test.js`. The setup file `vitest.setup.js` defines global helpers used throughout tests:

- `_enter(trigger)` / `_leave(trigger)` — simulate mouseOver/mouseEnter and mouseLeave
- `_focus(trigger)` / `_blur(trigger)` — simulate focusIn/focusOut
- `_keyDown(trigger, key)` — simulate key press (default: Escape)

Tests use `@testing-library/svelte` with jsdom. Coverage is reported via `@vitest/coverage-v8`.

## Release

Releases are fully automated via GitHub Actions (`.github/workflows/publish.yml`) using `semantic-release`. Commit message format drives version bumps — use Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
