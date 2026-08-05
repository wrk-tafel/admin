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
