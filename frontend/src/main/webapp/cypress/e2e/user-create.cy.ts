import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('User Create', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('create new user', () => {
    cy.visit('/#/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      const username = 'test-username-' + userRandomId;
      const personnelNumber = 'test-personnelNumber-' + userRandomId;
      fillUserForm(username, personnelNumber);

      cy.byTestId('passwordChangeRequiredInput').click();

      cy.byTestId('permission-checkbox-CHECKIN').click();

      cy.byTestId('permission-checkbox-USER_MANAGEMENT').click();
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail');
      cy.byTestId('usernameText').should('have.text', username);
      cy.byTestId('personnelNumberText').should('have.text', personnelNumber);
    });
  });

  it('create new user which exists already', () => {
    cy.visit('/#/benutzer/erstellen');

    // 1. Intercept the POST request that returns the 400 error
    // Replace '/api/users' with the actual endpoint URL your app uses
    cy.intercept('POST', '/api/users').as('createUserRequest');
    // 1. Suppress uncaught exceptions just for this test
    cy.once('uncaught:exception', (err) => !err.message.includes('400'));

    cy.getAnyRandomNumber().then(() => {
      fillUserForm('e2etest', 'e2etest');

      cy.byTestId('passwordChangeRequiredInput').click();
      cy.byTestId('permission-checkbox-CHECKIN').click();
      cy.byTestId('permission-checkbox-USER_MANAGEMENT').click();

      // 2. Click save - Cypress will no longer fail on the 400 error
      // because we are managing the request via intercept
      cy.byTestId('save-button').click();

      // 3. Wait for the request and verify the status (optional but recommended)
      cy.wait('@createUserRequest').its('response.statusCode').should('eq', 400);

      // 4. Assert the UI feedback
      cy.get('.toast-message')
        .should('be.visible')
        .should('contain.text', 'Benutzer (Benutzername: e2etest) existiert bereits!');
    });
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.visit('/#/benutzer/erstellen');

      cy.byTestId('usernameInput').should('be.visible').type('mobile-test-user');
      cy.byTestId('save-button').should('exist');
    });
  });

  function fillUserForm(username: string, personnelNumber: string) {
    cy.byTestId('usernameInput').type(username);
    cy.byTestId('personnelNumberInput').type(personnelNumber);
    cy.byTestId('lastnameInput').type('test-lastname');
    cy.byTestId('firstnameInput').type('test-firstname');
    cy.byTestId('generate-password-button').click();
  }

});
