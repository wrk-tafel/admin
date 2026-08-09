# ADR-0038: Post-interaction accessibility is asserted by axe inside the e2e suite

**Status:** accepted · **Recorded:** 2026-08-09

## Context

The application had two accessibility gates, and both were blind to the same thing.

`eslint.config.js` extends `angular.configs.templateAccessibility` over `**/*.html`, so
`lint-frontend` reads every template of every component, whether or not a route renders it. What it
reads is markup: it has no browser, no CSS and no accessibility tree, so it cannot compute an
accessible name. An `<input>` with neither a label nor an `aria-label` is not an error to it.

The `lighthouse` job's `pages` sweep ([ADR-0036](0036-page-performance-index-in-the-pipeline.md))
runs axe at `minScore: 1` over every route in its matrix, desktop and mobile, against a real backend
with the e2e fixtures. It computes real accessible names — but only over what a route renders **on
load**. It opens no dialog, expands no panel, switches no tab and selects no route.
`lighthouserc.pages.cjs` says so in as many words.

A control that exists only after an interaction therefore fell between the two, and that is not a
narrow gap in this application: the inline row editing on five settings screens, the food-collection
item matrix (which does not exist at all until a route is picked), three of the four statistics
date-range modes, 26 dialogs, the expanded body of the two accordion screens, and the non-default
tabs of the customer detail page. The audit in
[#3132](https://github.com/wrk-tafel/admin/issues/3132) found unnamed form controls in most of
those, on routes that score 100 in the sweep.

## Decision

**axe runs inside the Cypress suite, at the states the specs already navigate to.**
`cypress/support/accessibility.ts` wires up `cypress-axe` and adds three commands:
`cy.checkAccessibility(context?)` for a page region, `cy.checkDialogAccessibility()` for the open
`mat-dialog-container`, and `cy.checkMenuAccessibility()` for the open menu panel. Each fails the
test on any violation and prints the rule, its help URL and the offending selectors to the run's
terminal output through a `log` task, because the Cypress command log only survives in the video.

Three properties of the setup are deliberate:

- **Assertions are scoped to the fragment the interaction produced**, not to the whole document — an
  overlay, a table, an expanded panel body, or `MAIN_CONTENT` (`#hauptinhalt`, the route's own
  content without the shell). A failure then names the control it came from, and a defect in the
  initial render stays the sweep's to report rather than being re-reported here per spec. The
  `region` rule, which is a property of a whole page, is switched off for a scoped assertion and
  left on for an unscoped one.
- **Rules are selected by tag** (`wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`,
  `best-practice`), so a new axe-core version's rules are picked up rather than silently ignored.
- **An overlay is waited out before axe runs.** Cypress considers a dialog visible while it is still
  fading in, and axe's colour-contrast rule reads computed colours, so an assertion that fires
  during the enter animation fails on a half-transparent panel. The commands wait on the
  component's animation-state class (`mdc-dialog--opening`, `mat-menu-panel-animating`) instead.

This is a third layer, not a replacement. The sweep remains the only gate that grades a route the
way a browser loads it, and it covers routes no spec visits.

## Consequences

The whole class of "unnamed control behind a click" is now caught, and caught on the branch that
introduces it. Adding the assertions immediately surfaced the findings of
[#3133](https://github.com/wrk-tafel/admin/issues/3133) — inline-edit inputs on five settings
screens, every cell of both food-collection matrices, and the statistics date-range controls — which
this decision's own PR had to fix to land green.

What it costs:

- **Nothing derives the states.** A new dialog, inline-edit state, non-default tab or expanded panel
  needs someone to add an assertion, the same way a new route has to be added to the Lighthouse
  matrix by hand. A screen with no e2e spec gets no coverage from this layer at all.
- **e2e runtime grows.** Each assertion injects axe once per page load and runs it over its
  fragment — on the order of a second per call, on a suite that already takes minutes.
- **A third place to look.** A contributor now has to know which of three gates would have caught a
  given defect, and the answer is not always obvious: the `nested-interactive` compromise in the
  accordion headers ([#3137](https://github.com/wrk-tafel/admin/issues/3137)) is present in the
  initial render, so it ought to be the sweep's, but Lighthouse's axe subset does not include that
  rule and it surfaced here instead.
- **Scoping is a judgement call**, and a wrong one hides things: scope too tightly and a violation
  just outside the context goes unreported.

## Alternatives considered

**Widen the Lighthouse `pages` sweep to reach these states.** lhci drives a page through a
`puppeteerScript` hook, which the sweep already uses for its session cookie, so a script could click
its way into a dialog before the audit. It loses on maintenance: every state would be described
twice, once as a Cypress spec and once as a puppeteer script, against selectors that are already in
the spec. The sweep would also grade the whole document per state, at one Lighthouse run each.

**A global `afterEach` that audits whatever the DOM happens to hold.** Free coverage of every state
any spec ends in, with no per-state code. Rejected because what it audits is incidental — it depends
on where each test happens to stop, a failure is attributed to a test that was not about that
control, and the same shell violation would be re-reported by every spec in the suite.

**Vitest component tests with axe instead of e2e.** Faster and closer to the component, and the
project already runs component specs in a real browser. Rejected because the states in question are
reached through the real screen: an unnamed input in a table cell is only a defect in the presence
of the table around it, and the fixtures a component test would need to build are exactly what the
e2e specs already have.

**Fix the findings and leave the gates as they are.** The cheapest option, and the reason it lost is
[#3132](https://github.com/wrk-tafel/admin/issues/3132) itself: the same class of defect had already
been fixed twice ([#3084](https://github.com/wrk-tafel/admin/issues/3084),
[#3128](https://github.com/wrk-tafel/admin/issues/3128)) and came back, because nothing was watching
the states it lives in.

## References

- [#3132](https://github.com/wrk-tafel/admin/issues/3132) — the gap, and the list of states worth covering
- [#3133](https://github.com/wrk-tafel/admin/issues/3133) — the unnamed controls this layer found
- [#3137](https://github.com/wrk-tafel/admin/issues/3137) — the accordion headers' `nested-interactive` compromise, which this layer put a number on
- `frontend/src/main/webapp/cypress/support/accessibility.ts` — the commands and their rule set
- `frontend/src/main/webapp/lighthouserc.pages.cjs` — the sweep, and its own note about what it never reaches
- [ADR-0036](0036-page-performance-index-in-the-pipeline.md) — the Lighthouse gate this sits beside
