import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('User Edit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('edit user', () => {
    cy.createDummyUser().then(response => {
      const user = response.body;

      cy.visit('/benutzer/detail/' + user.id);
      cy.byTestId('permissionsText').should('not.contain.text', 'Anmeldung');

      cy.visit('/benutzer/bearbeiten/' + user.id);

      // Wait for form to be fully loaded with user data
      cy.byTestId('firstnameInput').should('have.value', user.firstname);

      cy.byTestId('firstnameInput').click();
      cy.byTestId('firstnameInput').clear();
      cy.byTestId('firstnameInput').type(`${user.firstname} updated`);

      cy.byTestId('permission-checkbox-CHECKIN').click();
      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail/' + user.id);

      cy.byTestId('permissionsText').should('contain.text', 'Anmeldung');
      cy.byTestId('nameText').should('contain.text', 'updated');
    });
  });

  it('the employee already linked to the account is resolved on load', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);

      cy.byTestId('personnelNumberInput').should('not.exist');
      cy.byTestId('selectedEmployeeDescription')
        .should('have.text', `${user.personnelNumber} ${user.firstname} ${user.lastname}`);
    });
  });

  it('password fields sit behind a collapsed reset section, and leaving it closed keeps the password', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('firstnameInput').should('have.value', user.firstname);

      cy.byTestId('password-reset-toggle').should('be.visible').and('have.attr', 'aria-expanded', 'false');
      cy.byTestId('passwordInput').should('not.be.visible');

      cy.byTestId('password-reset-toggle').click();
      cy.byTestId('password-reset-toggle').should('have.attr', 'aria-expanded', 'true');
      cy.byTestId('passwordInput').should('be.visible');
      cy.byTestId('password-rules').should('be.visible');

      // leaving the revealed fields empty and saving must not touch the existing password
      cy.intercept('PUT', '/api/users/*').as('updateUser');
      cy.byTestId('save-button').click();

      cy.wait('@updateUser').then((interception) => {
        expect(interception.request.body.password).to.eq(undefined);
        expect(interception.request.body.passwordRepeat).to.eq(undefined);
      });
      cy.url().should('contain', '/benutzer/detail/' + user.id);
    });
  });

  it('warns before leaving the page with unsaved changes', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('firstnameInput').should('have.value', user.firstname);
      cy.byTestId('firstnameInput').clear().type('changed');

      // an in-app navigation is what the CanDeactivate guard actually sees - a full page load
      // bypasses Angular's router entirely
      cy.get('a[routerLink="/uebersicht"]').first().click();

      cy.byTestId('unsavedchanges-dialog').should('be.visible');
      cy.url().should('contain', '/benutzer/bearbeiten/' + user.id);

      // cancelling keeps the edit and stays on the form
      cy.byTestId('cancelButton').click();
      cy.byTestId('unsavedchanges-dialog').should('not.exist');
      cy.byTestId('firstnameInput').should('have.value', 'changed');

      // confirming actually leaves, discarding the change
      cy.get('a[routerLink="/uebersicht"]').first().click();
      cy.byTestId('okButton').click();
      cy.url().should('contain', '/uebersicht');
    });
  });

  it('does not warn again right after a successful save', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      cy.visit('/benutzer/bearbeiten/' + user.id);
      cy.byTestId('firstnameInput').should('have.value', user.firstname);
      cy.byTestId('firstnameInput').clear().type('changed-and-saved');

      cy.byTestId('save-button').click();

      cy.url().should('contain', '/benutzer/detail/' + user.id);
      cy.byTestId('unsavedchanges-dialog').should('not.exist');
    });
  });

  it('remains usable on mobile viewports', () => {
    cy.createDummyUser().then((response) => {
      const user = response.body;

      [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
        cy.viewport(viewport);
        cy.visit('/benutzer/bearbeiten/' + user.id);

        cy.byTestId('firstnameInput').should('be.visible').and('have.value', user.firstname);
        cy.byTestId('save-button').should('exist');
      });
    });
  });

});
