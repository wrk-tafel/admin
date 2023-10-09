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

import AddCustomerToDistributionRequest = Cypress.AddCustomerToDistributionRequest;
import CustomerData = Cypress.CustomerData;
import * as moment from "moment/moment";

Cypress.Commands.add('byTestId', (id) => cy.get(`[testid="${id}"]`));

Cypress.Commands.add('loginDefault', () => {
  const username = 'e2etest';
  const password = 'e2etest';

  cy.createLoginRequest(username, password);
});

Cypress.Commands.add('login', (username: string, password: string) => {
  cy.createLoginRequest(username, password);
});

// tslint:disable-next-line:max-line-length
Cypress.Commands.add('createLoginRequest', (username: string, password: string, failOnStatusCode?: boolean): Cypress.Chainable<Cypress.Response<any>> => {
  const encodedCredentials = btoa(username + ':' + password);

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
    url: '/api/distributions/close'
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
  const data: CustomerData = {
    firstname: 'firstname',
    lastname: 'lastname',
    birthDate: moment().toDate(),
    employer: 'Employer 1',
    country: {
      id: 165,
      code: 'AT',
      name: 'Österreich'
    },
    income: 100,
    incomeDue: moment().toDate(),
    address: {
      street: 'street',
      houseNumber: '1A',
      city: 'city',
      postalCode: 1234
    },
    validUntil: moment().toDate()
  };
  return cy.createCustomer(data);
});
