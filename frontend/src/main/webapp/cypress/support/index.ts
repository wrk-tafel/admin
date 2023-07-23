// Inside cypress/support/index.js or
// Inside cypress/support/indes.ts in this case
/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to execute a login via api using fixed credentials.
     * @example cy.login();
     */
    createLoginRequest(username: string, password: string, failOnStatusCode?: boolean): Cypress.Chainable<Cypress.Response<any>>;

    /**
     * Custom command to execute a login via api using fixed credentials.
     * @example cy.login();
     */
    loginDefault();

    /**
     * Custom command to execute a login via api using fixed credentials.
     * Second testuser.
     * @example cy.login();
     */
    login(username: string, password: string);

    /**
     * Custom command to select DOM element by testId attribute.
     * @example cy.byTestId('saveButton');
     */
    byTestId<K extends keyof HTMLElementTagNameMap>(value: string): Chainable<JQuery<HTMLElementTagNameMap[K]>>;

    /**
     * Custom command to create a distribution.
     * @example cy.createDistribution();
     */
    createDistribution();

    /**
     * Custom command to add a customer to an existing distribution.
     * @example cy.addCustomerToDistribution();
     */
    addCustomerToDistribution(request: AddCustomerToDistributionRequest);

    /**
     * Custom command to close a distribution.
     * @example cy.closeDistribution();
     */
    closeDistribution();
  }

  export interface AddCustomerToDistributionRequest {
    customerId: number;
    ticketNumber: number;
  }

}
