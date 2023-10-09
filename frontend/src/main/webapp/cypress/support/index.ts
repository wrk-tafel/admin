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
    loginDefault(): void;

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
    byTestId<K extends keyof HTMLElementTagNameMap>(value: string): Chainable<JQuery<HTMLElementTagNameMap[K]>>;

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
    createCustomer(data: CustomerData): Cypress.Chainable<Cypress.Response<CustomerData>>;

    /**
     * Create a test customer with fixed data.
     * @example cy.createDummyCustomer();
     */
    createDummyCustomer(): Cypress.Chainable<Cypress.Response<CustomerData>>;

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
     * Custom command to generate a random number in a given range.
     * @example cy.getRandomNumber(min, max);
     */
    getRandomNumber(min: number, max: number): Chainable<number>;

    /**
     * Custom command to generate any random number in a fixed range of 50_000 to 100_000.
     * @example cy.getAnyRandomNumber();
     */
    getAnyRandomNumber(): Chainable<number>;
  }

  export interface AddCustomerToDistributionRequest {
    customerId: number;
    ticketNumber: number;
  }

  export interface CountryData {
    id: number;
    code: string;
    name: string;
  }

  export interface CustomerData {
    id?: number;
    issuer?: CustomerIssuer;
    issuedAt?: Date;
    firstname: string;
    lastname: string;
    birthDate: Date;
    country?: CountryData;
    address: CustomerAddressData;
    telephoneNumber?: string;
    email?: string;
    employer?: string;
    income?: number;
    incomeDue?: Date;
    validUntil?: Date;
    locked?: boolean;
    lockedAt?: Date;
    lockedBy?: string;
    lockReason?: string;
    additionalPersons?: CustomerAddPersonData[];
  }

  export interface CustomerIssuer {
    personnelNumber: string;
    firstname: string;
    lastname: string;
  }

  export interface CustomerAddressData {
    street: string;
    houseNumber?: string;
    stairway?: string;
    door?: string;
    postalCode?: number;
    city?: string;
  }

  export interface CustomerAddPersonData {
    key: number;
    id: number;
    firstname: string;
    lastname: string;
    birthDate: Date;
    country?: CountryData;
    employer?: string;
    income?: number;
    incomeDue?: Date;
    excludeFromHousehold: boolean;
    receivesFamilyBonus: boolean;
  }

  export interface UserData {
    id?: number;
    personnelNumber: string;
    username: string;
    firstname: string;
    lastname: string;
    enabled: boolean;
    password?: string;
    passwordRepeat?: string;
    passwordChangeRequired: boolean;
    permissions: UserPermission[];
  }

  export interface UserPermission {
    key: string;
    title: string;
  }

}
