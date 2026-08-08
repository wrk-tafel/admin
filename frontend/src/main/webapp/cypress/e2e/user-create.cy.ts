import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('User Create', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('create new user', () => {
    cy.visit('/benutzer/erstellen');

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
    cy.visit('/benutzer/erstellen');

    // 1. Intercept the POST request that returns the 409 error
    // Replace '/api/users' with the actual endpoint URL your app uses
    cy.intercept('POST', '/api/users').as('createUserRequest');
    // 1. Suppress uncaught exceptions just for this test
    cy.once('uncaught:exception', (err) => !err.message.includes('409'));

    cy.getAnyRandomNumber().then(() => {
      fillUserForm('e2etest', 'e2etest');

      cy.byTestId('passwordChangeRequiredInput').click();
      cy.byTestId('permission-checkbox-CHECKIN').click();
      cy.byTestId('permission-checkbox-USER_MANAGEMENT').click();

      // 2. Click save - Cypress will no longer fail on the 409 error
      // because we are managing the request via intercept
      cy.byTestId('save-button').click();

      // 3. Wait for the request and verify the status (optional but recommended)
      cy.wait('@createUserRequest').its('response.statusCode').should('eq', 409);

      // 4. Assert the UI feedback
      cy.get('.toast-message')
        .should('be.visible')
        .should('contain.text', 'Benutzer (Benutzername: e2etest) existiert bereits!');
    });
  });

  it('permissions are grouped by category with a working select-all toggle', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      const username = 'test-username-' + userRandomId;
      const personnelNumber = 'test-personnelNumber-' + userRandomId;
      fillUserForm(username, personnelNumber);

      cy.byTestId('permissionsSelectedCount').should('contain.text', '0 von 13 ausgewählt');
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').should('contain.text', 'Alle auswählen').click();

      cy.byTestId('permission-checkbox-CHECKIN').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-DISTRIBUTION_LCM').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-CUSTOMER').find('input').should('be.checked');
      cy.byTestId('permission-checkbox-SCANNER').find('input').should('be.checked');
      cy.byTestId('permissionsSelectedCount').should('contain.text', '4 von 13 ausgewählt');
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').should('contain.text', 'Alle abwählen');

      // toggling again deselects the whole group
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').click();
      cy.byTestId('permission-checkbox-CHECKIN').find('input').should('not.be.checked');
      cy.byTestId('permissionsSelectedCount').should('contain.text', '0 von 13 ausgewählt');

      // re-select the group so the created user has permissions to verify on the detail page
      cy.byTestId('permission-group-toggle-Ausgabe & Betrieb').click();
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail');
      cy.byTestId('permission-group-Ausgabe & Betrieb').within(() => {
        cy.byTestId('permission-chip-CHECKIN').should('contain.text', 'Anmeldung');
        cy.byTestId('permission-chip-DISTRIBUTION_LCM').should('contain.text', 'Ausgabe-Ablauf');
        cy.byTestId('permission-chip-CUSTOMER').should('contain.text', 'Kundenverwaltung');
        cy.byTestId('permission-chip-SCANNER').should('contain.text', 'Scanner');
      });
    });
  });

  it('password is required', () => {
    cy.visit('/benutzer/erstellen');

    cy.getAnyRandomNumber().then((userRandomId) => {
      cy.byTestId('usernameInput').type('test-username-' + userRandomId);
      cy.byTestId('personnelNumberInput').type('test-personnelNumber-' + userRandomId);
      cy.byTestId('lastnameInput').type('test-lastname');
      cy.byTestId('firstnameInput').type('test-firstname');

      // leaving the password fields empty blocks saving and shows the validation message
      cy.byTestId('passwordInput').click();
      cy.byTestId('passwordRepeatInput').click().blur();

      cy.contains('mat-error', 'Pflichtfeld').should('be.visible');
      cy.byTestId('save-button').should('be.disabled');

      // filling the password enables saving again
      cy.byTestId('generate-password-button').click();
      cy.byTestId('save-button').should('be.enabled').click();

      cy.url().should('contain', '/benutzer/detail');
    });
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.visit('/benutzer/erstellen');

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
