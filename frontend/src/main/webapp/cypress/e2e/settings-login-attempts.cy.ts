import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Login-Versuche', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/einstellungen/login-versuche');
  });

  it('lists login attempts', () => {
    cy.byTestId('login-attempts-table').should('exist');
    cy.byTestId('login-attempts-table').should('contain.text', 'lockeduser');
    cy.byTestId('login-attempts-table').should('contain.text', 'flakyuser');
  });

  it('shows the locked status for a currently locked entry', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'lockeduser')
      .find('[testid^="loginAttemptLocked-"]').should('exist');
  });

  it('shows no locked status for an entry that is not locked', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'flakyuser')
      .find('[testid^="loginAttemptNotLocked-"]').should('exist');
  });

  it('deletes a login attempt after confirming the dialog', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'lockeduser')
      .find('[testid^="deleteLoginAttemptButton-"]').click();

    cy.byTestId('deleteloginattempt-dialog').should('be.visible');
    cy.byTestId('okButton').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gelöscht');
    cy.byTestId('login-attempts-table').should('not.contain.text', 'lockeduser');
  });

  it('keeps the entry when the delete dialog is cancelled', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'flakyuser')
      .find('[testid^="deleteLoginAttemptButton-"]').click();

    cy.byTestId('deleteloginattempt-dialog').should('be.visible');
    cy.byTestId('cancelButton').click();

    cy.byTestId('login-attempts-table').should('contain.text', 'flakyuser');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.reload();

      cy.byTestId('login-attempts-table').should('exist');
      cy.byTestId('login-attempts-table').should('contain.text', 'flakyuser');
    });
  });

});
