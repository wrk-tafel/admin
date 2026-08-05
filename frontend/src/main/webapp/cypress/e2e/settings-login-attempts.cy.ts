import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Anmelde-Versuche', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/anmelde-versuche');
  });

  it('lists login attempts', () => {
    cy.byTestId('login-attempts-table').should('exist');
    cy.byTestId('login-attempts-table').should('contain.text', 'gesperrt1');
    cy.byTestId('login-attempts-table').should('contain.text', 'fehlversuch1');
  });

  it('shows a paginator above and below the table', () => {
    cy.get('.tafel-paginator-responsive').should('have.length', 2);
    cy.byTestId('login-attempts-paginator').should('exist');
  });

  it('shows the locked status for a currently locked entry', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'gesperrt1')
      .find('[testid^="loginAttemptLocked-"]').should('exist');
  });

  it('shows no locked status for an entry that is not locked', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'fehlversuch1')
      .find('[testid^="loginAttemptNotLocked-"]').should('exist');
  });

  it('deletes a login attempt after confirming the dialog', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'gesperrt1')
      .find('[testid^="deleteLoginAttemptButton-"]').click();

    cy.byTestId('deleteloginattempt-dialog').should('be.visible');
    cy.byTestId('okButton').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gelöscht');
    cy.byTestId('login-attempts-table').should('not.contain.text', 'gesperrt1');
  });

  it('keeps the entry when the delete dialog is cancelled', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'fehlversuch1')
      .find('[testid^="deleteLoginAttemptButton-"]').click();

    cy.byTestId('deleteloginattempt-dialog').should('be.visible');
    cy.byTestId('cancelButton').click();

    cy.byTestId('login-attempts-table').should('contain.text', 'fehlversuch1');
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('login-attempts-table').should('not.be.visible');
    cy.byTestId('login-attempts-cards').should('be.visible').and('contain.text', 'fehlversuch1');

    // 'gesperrt1' was already deleted by the 'deletes a login attempt' test above (e2e tests share
    // a persistent DB within a spec run) - use 'fehlversuch1' here instead, which is only
    // cancel-tested elsewhere in this file and so is still guaranteed to exist.
    cy.byTestId('login-attempts-cards').contains('mat-card', 'fehlversuch1')
      .find('[testid^="loginAttemptNotLockedMobile-"]').should('exist');

    cy.byTestId('login-attempts-cards').contains('mat-card', 'fehlversuch1')
      .find('[testid^="deleteLoginAttemptButtonMobile-"]').click();

    cy.byTestId('deleteloginattempt-dialog').should('be.visible');
    cy.byTestId('okButton').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gelöscht');
    cy.byTestId('login-attempts-cards').should('not.contain.text', 'fehlversuch1');
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('login-attempts-table').should('be.visible');
    cy.byTestId('login-attempts-cards').should('not.be.visible');
  });

});
