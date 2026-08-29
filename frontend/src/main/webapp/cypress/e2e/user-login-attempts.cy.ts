import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Benutzer - Anmelde-Versuche', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/benutzer/anmelde-versuche');
  });

  it('lists login attempts, the locked ones first', () => {
    cy.byTestId('login-attempts-table').should('exist');
    cy.byTestId('login-attempts-table').should('contain.text', 'gesperrt1');
    cy.byTestId('login-attempts-table').should('contain.text', 'fehlversuch1');

    // the only locked entry, and therefore the row an operator is called about
    cy.byTestId('login-attempts-row-0').should('contain.text', 'gesperrt1');
  });

  it('sorts by clicking a column header, replacing the locked-first default', () => {
    cy.intercept('GET', /\/api\/users\/login-attempts(\?|$)/).as('sortedLoginAttempts');
    cy.contains('th', 'Benutzername').click();
    cy.wait('@sortedLoginAttempts').its('request.url').should('include', 'sortBy=username').and('include', 'sortDirection=asc');

    cy.contains('th', 'Benutzername').click();
    cy.wait('@sortedLoginAttempts').its('request.url').should('include', 'sortBy=username').and('include', 'sortDirection=desc');

    // still present after sorting - it is a reorder of the same filtered result, not a new search
    cy.byTestId('login-attempts-table').should('contain.text', 'gesperrt1').and('contain.text', 'fehlversuch1');
  });

  it('shows a paginator above and below the table', () => {
    cy.get('.tafel-paginator-responsive').should('have.length', 2);
    cy.byTestId('login-attempts-paginator').should('exist');
  });

  // The threshold comes from the backend's configuration, which a unit spec with a mocked service
  // cannot tell apart from a hard-coded number.
  it('states the configured lockout rule', () => {
    cy.byTestId('login-attempts-lockout-rule')
      .should('contain.text', 'Sperre nach 10 Fehlversuchen')
      .and('contain.text', '5 Minuten');
  });

  it('shows how much of the lock is left', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'gesperrt1')
      .find('[testid^="loginAttemptLocked-"]')
      .should('contain.text', 'Gesperrt bis')
      .and('contain.text', 'noch ');
  });

  it('shows no lock for an entry that is not locked', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'fehlversuch1')
      .find('[testid^="loginAttemptNotLocked-"]').should('exist');
  });

  it('links a username that has an account to that account, and marks one that has none', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'fehlversuch1')
      .find('[testid^="loginAttemptNoUser-"]').should('exist');

    cy.byTestId('login-attempts-table').contains('tr', 'testuser')
      .find('[testid^="loginAttemptUserLink-"]').click();

    cy.url().should('contain', '/benutzer/detail/');
  });

  it('searches by username', () => {
    cy.byTestId('loginAttemptSearchInput').type('gesperrt');

    cy.byTestId('login-attempts-table').should('contain.text', 'gesperrt1');
    cy.byTestId('login-attempts-table').should('not.contain.text', 'fehlversuch1');
  });

  it('shows an empty state for a search nothing matches', () => {
    cy.byTestId('loginAttemptSearchInput').type('gibtsnicht');

    cy.byTestId('login-attempts-empty').should('be.visible').and('contain.text', 'gibtsnicht');
  });

  it('filters down to the currently locked entries', () => {
    cy.byTestId('login-attempts-filter-locked').click();

    cy.byTestId('login-attempts-table').should('contain.text', 'gesperrt1');
    cy.byTestId('login-attempts-table').should('not.contain.text', 'fehlversuch1');
  });

  it('refreshes the list on demand', () => {
    cy.byTestId('refreshLoginAttemptsButton').click();

    cy.byTestId('login-attempts-updated-at').should('be.visible').and('contain.text', 'Stand');
    cy.byTestId('login-attempts-table').should('contain.text', 'gesperrt1');
  });

  it('keeps the entry when the reset dialog is cancelled', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'fehlversuch1')
      .find('[testid^="resetLoginAttemptButton-"]').click();

    cy.byTestId('resetloginattempt-dialog').should('be.visible').and('contain.text', 'fehlversuch1');
    // the dialog exists only after this click, so no other accessibility gate sees it -
    // see cypress/support/accessibility.ts
    cy.checkDialogAccessibility();

    cy.byTestId('cancelButton').click();

    cy.byTestId('login-attempts-table').should('contain.text', 'fehlversuch1');
  });

  it('lifts a lock without asking first', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'gesperrt1')
      .find('[testid^="unlockLoginAttemptButton-"]').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'Sperre für gesperrt1 aufgehoben');
    cy.byTestId('login-attempts-table').should('not.contain.text', 'gesperrt1');
  });

  it('resets an entry that is not locked after confirming the dialog', () => {
    cy.byTestId('login-attempts-table').contains('tr', 'fehlversuch1')
      .find('[testid^="resetLoginAttemptButton-"]').click();

    cy.byTestId('resetloginattempt-dialog').should('be.visible');
    cy.byTestId('okButton').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'zurückgesetzt');
    cy.byTestId('login-attempts-table').should('not.contain.text', 'fehlversuch1');
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('login-attempts-table').should('not.be.visible');
    // 'gesperrt1' and 'fehlversuch1' are gone by now - the tests above removed them, and e2e tests
    // share a persistent DB within a spec run.
    cy.byTestId('login-attempts-cards').should('be.visible').and('contain.text', 'testuser');

    cy.byTestId('login-attempts-cards').contains('mat-card', 'testuser')
      .find('[testid^="resetLoginAttemptButtonMobile-"]').click();

    cy.byTestId('resetloginattempt-dialog').should('be.visible');
    cy.byTestId('okButton').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'zurückgesetzt');
    cy.byTestId('login-attempts-cards').should('not.contain.text', 'testuser');
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('login-attempts-table').should('be.visible');
    cy.byTestId('login-attempts-cards').should('not.be.visible');
  });

});
