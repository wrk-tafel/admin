// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.ts using ES2015 syntax:
import './commands';
import './accessibility';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Ignore ResizeObserver errors that are common with Angular
Cypress.on('uncaught:exception', (err) => {
  // Ignore ResizeObserver loop errors - these are benign and common with Angular Material components
  if (err.message.includes('ResizeObserver loop')) {
    return false;
  }
  // Let other errors fail the test
  return true;
});

// cy.viewport() persists across tests and even across spec files (Cypress does not auto-reset it) -
// specs that switch to PHONE_VIEWPORT/TABLET_VIEWPORT (see cypress/support/viewports.ts) would
// otherwise leak that size into the next spec's first tests, causing unrelated failures that only
// reproduce depending on run order.
afterEach(() => {
  cy.viewport(Cypress.config('viewportWidth'), Cypress.config('viewportHeight'));
});
