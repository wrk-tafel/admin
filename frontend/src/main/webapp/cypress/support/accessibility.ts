// axe-core assertions for the states the e2e specs navigate to.
//
// This is the third of the project's three accessibility gates, and the only one that ever sees a
// control which exists solely after an interaction:
//   - `angular.configs.templateAccessibility` (eslint.config.js) reads every template of every
//     component, but computes no accessible names - an input with neither a label nor an
//     `aria-label` is not an error to it.
//   - the `lighthouse` job's `pages` sweep computes real accessible names against a real backend,
//     but only grades a route's *initial* render: it opens no dialog, expands no panel, selects
//     no route and switches no tab.
// Anything behind a click therefore falls between those two, which is exactly what these
// assertions cover. Neither existing gate is replaced: the sweep still grades routes no spec
// visits, the way a browser actually loads them.

import 'cypress-axe';
import type {ElementContext, Result} from 'axe-core';
import type {Options} from 'cypress-axe';

// The conformance target, plus axe's `best-practice` set, which is what carries the structural
// rules an application this form-heavy benefits from (heading-order, list nesting, duplicate ids,
// landmark uniqueness). Kept as tags rather than a rule list so a new axe-core version's rules are
// picked up instead of silently ignored.
const RULE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

// `region` requires every piece of content to sit inside a landmark. That is a property of a whole
// page, not of the overlay/panel/table fragment a scoped assertion audits, which would be reported
// as broken purely because its landmark ancestor sits outside the audited context. It stays on for
// an unscoped assertion, and the `pages` Lighthouse sweep grades whole documents anyway.
const RULES_NOT_APPLICABLE_TO_FRAGMENTS: Options['rules'] = {
  region: {enabled: false}
};

// The application's `<main>`: the route's own content without the shell around it, which every
// screen shares and the Lighthouse sweep already grades on every route.
export const MAIN_CONTENT = '#hauptinhalt';

// axe lives in the application's window, so it is gone after every load - re-inject rather than
// requiring each spec to remember where its navigations happen.
function injectAxeIfMissing(): void {
  cy.window({log: false}).then((win) => {
    if (!win.axe) {
      // Passing the path explicitly: cypress-axe's default resolves it via `require.resolve`,
      // which is not the browser bundle's to answer. It is read by cy.readFile, i.e. relative to
      // the Cypress project root.
      cy.injectAxe({axeCorePath: 'node_modules/axe-core/axe.min.js'});
    }
  });
}

// cypress-axe's own failure message is a bare violation count, and its per-violation detail only
// reaches the Cypress command log - which in CI exists only inside the recorded video. Print the
// same detail to the terminal so a red run can be read from its log.
function reportViolations(violations: Result[]): void {
  const report = violations
    .map((violation) => {
      const nodes = violation.nodes
        .map((node) => {
          // axe's per-node summary carries what the rule actually measured (e.g. the two colours
          // and the contrast ratio it computed), which is what makes a failure fixable from the log
          const summary = (node.failureSummary ?? '').split('\n').map((line) => `        ${line}`).join('\n');
          return `      - ${node.target.join(' ')}\n${summary}`;
        })
        .join('\n');
      return `  [${violation.impact}] ${violation.id}: ${violation.help}\n    ${violation.helpUrl}\n${nodes}`;
    })
    .join('\n');

  cy.task('log', `\naxe found ${violations.length} accessibility violation(s):\n${report}\n`, {log: false});
}

Cypress.Commands.add('checkAccessibility', (context?: ElementContext, options?: Options) => {
  injectAxeIfMissing();
  cy.checkA11y(
    context,
    {
      runOnly: {type: 'tag', values: RULE_TAGS},
      ...(context ? {rules: RULES_NOT_APPLICABLE_TO_FRAGMENTS} : {}),
      ...options
    },
    reportViolations
  );
});

// axe's colour-contrast rule reads computed colours, so it must not run while an overlay is still
// fading in - a half-transparent panel measures as too little contrast and fails for as long as the
// animation lasts. Cypress' own visibility rules are satisfied well before that, so what an overlay
// animates is what has to be waited on: the opacity reaching 1 is the one signal that says the
// fade-in is *over*.
//
// Its animation-state class cannot say that on its own, because Angular Material adds that class a
// frame after the overlay is in the DOM (`MatDialogContainer` sets it from a `requestAnimationFrame`,
// `MatMenu` from the `animationstart` event). "Does not have the animating class" is therefore also
// true in the window before the animation begins, which is exactly the window a `cy.get()` right
// after the click lands in.
function expectFadedIn($elements: JQuery<HTMLElement>): void {
  $elements.each((_, element) => {
    expect(Number(getComputedStyle(element).opacity)).to.equal(1);
  });
}

Cypress.Commands.add('checkDialogAccessibility', (options?: Options) => {
  // Scoped to the dialog itself: while it is open the rest of the document is inert, and a
  // violation reported against the whole page would not say which of the two it came from.
  //
  // `mdc-dialog--open` is required of *every* open container rather than just one, which also keeps
  // a dialog that is still fading out of the audit: Material drops that class the moment closing
  // starts, so a lingering predecessor holds this assertion until it is gone.
  cy.get('mat-dialog-container').should('be.visible').and('have.class', 'mdc-dialog--open');
  cy.get('mat-dialog-container .mat-mdc-dialog-inner-container').should(expectFadedIn);
  cy.checkAccessibility('mat-dialog-container', options);
});

Cypress.Commands.add('checkMenuAccessibility', (options?: Options) => {
  cy.get('.mat-mdc-menu-panel').should('be.visible').and(expectFadedIn);
  cy.checkAccessibility('.mat-mdc-menu-panel', options);
});

Cypress.Commands.add('checkSelectAccessibility', (options?: Options) => {
  cy.get('.mat-mdc-select-panel').should('be.visible').and(expectFadedIn);
  cy.checkAccessibility('.mat-mdc-select-panel', options);
});
