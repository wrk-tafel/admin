// Inside cypress/support/index.js or
// Inside cypress/support/indes.ts in this case
/// <reference types="cypress" />

import {AddCustomerToDistributionRequest, CustomerCreationResponse, CustomerData, UserData} from './commands';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Cypress's documented pattern for augmenting Chainable
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to execute a login via api using fixed credentials.
       * @example cy.login();
       */
      createLoginRequest(username: string, password: string, failOnStatusCode?: boolean): Cypress.Chainable<Cypress.Response<any>>;

      /**
       * Custom command to execute a login via api using fixed credentials.
       * @example cy.loginDefault();
       */
      loginDefault(): void;

      /**
       * Custom command to execute a login via api using fixed credentials (user e2etest2).
       * @example cy.loginE2ETest2();
       */
      loginE2ETest2(): void;

      /**
       * Custom command to execute a login via api using fixed credentials.
       * Second testuser.
       * @example cy.login();
       */
      login(username: string, password: string): void;

      /**
       * Custom command to logout.
       * @example cy.logout();
       */
      logout(): void;

      /**
       * Custom command to select DOM element by testId attribute.
       * @example cy.byTestId('saveButton');
       */
      byTestId<K extends keyof HTMLElementTagNameMap>(
        value: string,
        options?: Partial<Loggable & Timeoutable & Withinable & Shadow>
      ): Chainable<JQuery<HTMLElementTagNameMap[K]>>;

      /**
       * Filters a previously-queried set down to elements that are currently CSS-displayed
       * (offsetParent !== null), ignoring scroll-clipping - use to disambiguate a testid that
       * appears in both a `hidden md:block` and a `block md:hidden` responsive branch.
       * @example cy.byTestId('foo').filterDisplayed().click();
       */
      filterDisplayed(): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to create a distribution.
       * @example cy.createDistribution();
       */
      createDistribution(): void;

      /**
       * Custom command to add a customer to an existing distribution.
       * @example cy.addCustomerToDistribution(request);
       */
      addCustomerToDistribution(request: AddCustomerToDistributionRequest): void;

      /**
       * Custom command to create a new customer.
       * @example cy.createCustomer(customerData);
       */
      createCustomer(data: CustomerData, force?: boolean): Cypress.Chainable<Cypress.Response<CustomerCreationResponse>>;

      /**
       * Create a test customer with fixed data.
       * @example cy.createDummyCustomer(1000);
       */
      createDummyCustomer(income?: number, force?: boolean): Cypress.Chainable<Cypress.Response<CustomerCreationResponse>>;

      /**
       * Custom command to add a note to an existing customer.
       * @example cy.createCustomerNote(customerId, 'some note');
       */
      createCustomerNote(customerId: number, note: string): Cypress.Chainable<Cypress.Response<any>>;

      /**
       * Custom command to create a new user.
       * @example cy.createUser(userData);
       */
      createUser(data: UserData): Cypress.Chainable<Cypress.Response<UserData>>;

      /**
       * Create a test user with fixed data.
       * @example cy.createDummyUser();
       */
      createDummyUser(): Cypress.Chainable<Cypress.Response<UserData>>;

      /**
       * Delete a user with a certain id.
       * @example cy.deleteUser(userId);
       */
      deleteUser(userId: number): Cypress.Chainable<Cypress.Response<void>>;

      /**
       * Custom command to close a distribution.
       * @example cy.closeDistribution();
       */
      closeDistribution(): void;

      /**
       * Marks a household's only distribution ticket as "not paid", closes the distribution and
       * waits until the resulting Unkostenbeitrag debt has actually been accrued on the household
       * (runs asynchronously right after the distribution closes).
       * @example cy.accrueCostContributionDebt(customerId);
       */
      accrueCostContributionDebt(customerId: number): void;

      /**
       * Custom command to generate a random number in a given range.
       * @example cy.getRandomNumber(min, max);
       */
      getRandomNumber(min: number, max: number): Chainable<number>;

      /**
       * Custom command to generate an ~11-digit number that's effectively unique across the whole
       * e2e run (derived from the current timestamp plus a random suffix), for test data (e.g.
       * usernames) that must not collide with data created by other specs in the same run.
       * @example cy.getAnyRandomNumber();
       */
      getAnyRandomNumber(): Chainable<number>;
    }
  }
}
