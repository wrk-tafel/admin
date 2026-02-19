// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

import Chainable = Cypress.Chainable;
import * as moment from 'moment/moment';

Cypress.Commands.add('byTestId', (id) => cy.get(`[testid="${id}"]`));

Cypress.Commands.add('loginDefault', () => {
  const username = 'e2etest';
  const password = 'e2etest';

  cy.createLoginRequest(username, password);
});

Cypress.Commands.add('login', (username: string, password: string) => {
  cy.createLoginRequest(username, password);
});

Cypress.Commands.add('logout', () => {
  cy.request({
    method: 'POST',
    url: '/api/logout',
  });
});

// tslint:disable-next-line:max-line-length
Cypress.Commands.add('createLoginRequest', (username: string, password: string, failOnStatusCode?: boolean): Cypress.Chainable<Cypress.Response<any>> => {
  const encodedCredentials = Buffer.from(username + ':' + password).toString('base64');

  return cy.request({
    method: 'POST',
    url: '/api/login',
    failOnStatusCode: failOnStatusCode,
    headers: {
      'Authorization': 'Basic ' + encodedCredentials
    }
  });
});

Cypress.Commands.add('createDistribution', () => {
  cy.request({
    method: 'POST',
    url: '/api/distributions/new'
  });
});

Cypress.Commands.add('addCustomerToDistribution', (request: AddCustomerToDistributionRequest) => {
  cy.request({
    method: 'POST',
    url: '/api/distributions/customers',
    body: request
  });
});

Cypress.Commands.add('closeDistribution', () => {
  cy.request({
    method: 'POST',
    url: '/api/distributions/statistics',
    body: {employeeCount: 100, selectedShelterIds: [1, 2]}
  });

  cy.request({
    method: 'POST',
    url: '/api/distributions/close?forceClose=true'
  });
});

Cypress.Commands.add('createCustomer', (data: CustomerData): Cypress.Chainable<Cypress.Response<CustomerData>> => {
  return cy.request({
    method: 'POST',
    url: '/api/customers',
    body: data
  });
});

Cypress.Commands.add('createDummyCustomer', (): Cypress.Chainable<Cypress.Response<CustomerData>> => {
  return cy.getAnyRandomNumber().then(randomNumber => {
    const data: CustomerData = {
      firstname: 'firstname-' + randomNumber,
      lastname: 'lastname-' + randomNumber,
      birthDate: moment().toDate(),
      gender: Gender.MALE,
      telephoneNumber: '0123456789',
      email: 'firstname.lastname@test.com',
      employer: 'employer-' + randomNumber,
      country: {
        id: 165,
        code: 'AT',
        name: 'Österreich'
      },
      income: 100,
      incomeDue: moment().toDate(),
      address: {
        street: 'street-' + randomNumber,
        houseNumber: '1A',
        city: 'city-' + randomNumber,
        postalCode: 1234
      },
      validUntil: moment().toDate()
    };
    return cy.createCustomer(data);
  });
});

Cypress.Commands.add('createUser', (data: UserData): Cypress.Chainable<Cypress.Response<UserData>> => {
  return cy.request({
    method: 'POST',
    url: '/api/users',
    body: data
  });
});

Cypress.Commands.add('createDummyUser', (): Cypress.Chainable<Cypress.Response<UserData>> => {
  return cy.getAnyRandomNumber().then(randomNumber => {
    const data: UserData = {
      username: 'username-' + randomNumber,
      personnelNumber: randomNumber.toString(),
      firstname: 'firstname-' + randomNumber,
      lastname: 'lastname-' + randomNumber,
      enabled: true,
      password: 'dummy-pwd-' + randomNumber,
      passwordChangeRequired: false,
      permissions: []
    };
    return cy.createUser(data);
  });
});

Cypress.Commands.add('deleteUser', (userId: number): Cypress.Chainable<Cypress.Response<void>> => {
  return cy.request({
    method: 'DELETE',
    url: '/api/users/' + userId
  });
});

Cypress.Commands.add('getRandomNumber', (min: number, max: number): Chainable<number> => {
  const minCeil = Math.ceil(min);
  const maxFloor = Math.floor(max);
  return cy.wrap(Math.floor(Math.random() * (maxFloor - minCeil + 1)) + minCeil);
});

Cypress.Commands.add('getAnyRandomNumber', (): Chainable<number> => {
  return cy.getRandomNumber(50000, 100000);
});


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
  gender: Gender;
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
  gender: Gender;
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

export enum Gender {
  MALE = 0, FEMALE = 1
}
