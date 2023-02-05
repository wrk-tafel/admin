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

import { addStreamCommands } from '@lensesio/cypress-websocket-testing';
addStreamCommands();

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
