# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn dev          # Start the demo app (SvelteKit) on http://localhost:5173
yarn build        # Build the demo site (build/) and package the library (dist/)
yarn package      # Package the library only: svelte-kit sync, svelte-package, publint
yarn preview      # Serve the built demo site
yarn lint         # Check formatting (Prettier) and linting (ESLint)
yarn format       # Auto-format all files with Prettier
yarn test         # Run tests in watch mode with coverage
yarn test:ci      # Run tests once with coverage thresholds (used in CI)
```

Run a single test file, or only the tests whose name matches a pattern:

```bash
yarn vitest run src/lib/__tests__/useTooltip.test.ts
yarn vitest run src/lib/__tests__/useTooltip.test.ts -t "aria-describedby"
```

Add `--host` to `yarn dev` or `yarn preview` to open the demo from another device. Through a LAN IP, the page is a non-secure context, where browsers hide APIs such as `crypto.randomUUID()`.

## Architecture

This is a **Svelte 5 action library** written in TypeScript — it exports a single `useTooltip` action, not components. The README API table lists every option.

**Data flow:**

```
use:useTooltip={params}
  → useTooltip.ts (Svelte action wrapper: lifecycle, update/destroy delegation)
    → Tooltip.ts (core class: DOM creation, positioning, events, animation, ARIA)
```

- `src/lib/index.ts` — public entry point: re-exports `useTooltip` and the public types defined in `Tooltip.ts` (`TooltipOptions`, `TooltipPosition`, `ContentAction`, `ContentActionValue`, `ContentActions`). A type that consumers need must be re-exported here; the README's TypeScript section documents this list.
- `src/lib/useTooltip.ts` — thin Svelte action wrapper; instantiates `Tooltip`, forwards `update()` and `destroy()` calls, and imports the default stylesheet
- `src/lib/Tooltip.ts` — all tooltip logic in one class, with its state in `#private` fields
- `src/lib/useTooltip.css` — default styles (`__tooltip`, `__tooltip-<position>`, `__tooltip-enter` / `__tooltip-leave`); the `containerClassName` and animation class name options replace them
- `src/routes/+page.svelte` — demo page with a settings panel for every option (not published)

`svelte-package` compiles `src/lib` to `.js` and `.d.ts` files in `dist/`, the only published folder. It keeps import paths as written, so relative imports in `src/lib` must end in `.js` (`from './Tooltip.js'`): consumers resolving with `moduleResolution: nodenext` cannot resolve extensionless paths and silently get `any` types.

**Rendering:** With `portal: true` (default), the tooltip is appended to `document.body` with `position: fixed` and copies the target's computed font. With `portal: false`, it is appended inside the target, which gets `position: relative`. Each instance has a unique id (`tooltip-<uuid>`), which the target references in `aria-describedby` while the tooltip is shown.

**Positioning:** The tooltip is positioned when shown, then again on window resize or scroll and on scroll of any scrollable ancestor. If the preferred `position` (`top` / `bottom` / `left` / `right`) doesn't fit in the viewport, a horizontal tooltip with `width: 'auto'` is narrowed to the available space (80px minimum); otherwise it moves to another side, trying them from the most to the least room, and `onPlacementChange(from, to)` fires.

**Showing and hiding:** `showOn` / `hideOn` list the target events that show and hide the tooltip (defaults: `mouseenter`, `focusin` / `mouseleave`, `focusout`); an event in both lists toggles it. `touchBehavior`, `enterDelay` / `leaveDelay`, `animated` and the Escape key also apply. `open: true` locks the tooltip open; `open: false` closes it once.

**Content:** Either a plain string (`content`, inserted as text) or a CSS selector (`contentSelector`, which takes precedence). The first element child of a `<template>`, or a plain element itself, is cloned into the tooltip. `@untemps/dom-observer` waits for the selector to match before cloning.

**Interactive content:** `contentActions` maps CSS selectors to one or more `{ eventType, callback, callbackParams, closeOnCallback }` objects. Listeners are attached to the cloned content each time the tooltip is shown. The `'*'` key targets the tooltip container itself; other keys require `contentSelector`. When the content also contains focusable elements, the tooltip becomes a `role="dialog"` with a focus trap, and the target gets `aria-expanded`, `aria-haspopup` and, if missing, `tabindex="0"`. Otherwise it stays `role="tooltip"`.

**Updates:** `update()` is partial: options passed as `undefined` keep their current value. It runs `#detectChanges` (compares with the current state), then `#applyState`, then `#applyChanges`. A change of `content`, `contentSelector`, `position` or `offset` rebuilds the tooltip element.

Development-only warnings are gated on `DEV` from `esm-env` (see `#warnIfNoContent`).

## Testing

Tests live in `src/lib/__tests__/useTooltip.test.ts` and run with Vitest in jsdom. They call the action function directly on DOM nodes built with `@untemps/utils` helpers, without mounting Svelte components, and fire events with `@testing-library/svelte`. `afterEach` destroys every instance with the static `Tooltip.destroy()`. Tooltip ids are random, so tests find tooltips by role (`[role="tooltip"]`) or by their content, never by id.

The setup file `vitest.setup.ts` loads the `@testing-library/jest-dom` matchers and defines global helpers used throughout tests. Each helper fires its events, then waits 1 ms (`standby(1)`):

- `_enter(trigger)` / `_leave(trigger)` / `_enterAndLeave(trigger)` — simulate mouseOver + mouseEnter, then mouseLeave
- `_focus(trigger)` / `_blur(trigger)` / `_focusAndBlur(trigger)` — simulate focusIn, then focusOut
- `_keyDown(trigger, init?)` — simulate a key press; `init` is the event init object (default: Escape)
- `_touchStart(trigger)` / `_touchEnd(trigger)` / `_touchCancel(trigger)` — simulate touch events

`yarn test:ci` enforces coverage thresholds through `@vitest/coverage-v8`: 95% of statements, functions and lines, 90% of branches.

`yarn build` leaves compiled test copies in `.svelte-kit/__package__/__tests__`, and Vitest then runs them too. After a build, run `rm -rf .svelte-kit/__package__` before testing or committing.

## Commits and release

- Commit messages follow Conventional Commits with a sentence-case subject (first letter uppercase), e.g. `fix(tooltip): Clear observer before structure rebuild`. commitlint enforces this in the husky `commit-msg` hook.
- The husky `pre-commit` hook runs `yarn test:ci && yarn format`. `yarn format` rewrites files without staging them again, so format before committing.
- Pull requests are squash-merged: the PR title, a Conventional Commit, becomes the commit on `main` and the changelog entry.
- Releases are automated by `semantic-release` in `.github/workflows/publish.yml` on every push to `main` or `beta` (prerelease). Commit types drive the version bump; `chore(force)` releases a patch and `chore(critical)` a major.
- CI runs only `yarn test:ci` and `yarn build`, and only on `main` and `beta`. Nothing checks pull requests or runs `yarn lint`, so run the tests, build and lint locally.
