// Inside cypress/support/index.js or
// Inside cypress/support/indes.ts in this case
/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to execute a login via api using fixed credentials.
     * @example cy.login();
     */
    login();

    /**
     * Custom command to select DOM element by testId attribute.
     * @example cy.byTestId('saveButton');
     */
    byTestId<K extends keyof HTMLElementTagNameMap>(value: string): Chainable<JQuery<HTMLElementTagNameMap[K]>>;
  }
}
