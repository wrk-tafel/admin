import * as path from 'path';
import {MAIN_CONTENT} from '../support/accessibility';

// "Mein Konto": one page, a tab per topic. What each tab does is covered by its own spec
// (passwordchange.cy.ts, mfa.cy.ts, push-notifications.cy.ts); this one is about the page around them.
// A radio button is picked through its input: the host element spans the whole width, and a click at its centre
// misses the label.
function selectTheme(value: 'light' | 'dark' | 'system') {
  cy.byTestId(`theme-option-${value}`).find('input').click({force: true});
}

describe('Account page', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('opens from the user menu on the password tab', () => {
    cy.visit('/uebersicht');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-account').click();

    cy.url().should('contain', '/konto/passwort');
    cy.byTestId('account-tab-password').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('currentPasswordText').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);
  });

  it('has a tab for every topic, each with an address of its own', () => {
    cy.visit('/konto');
    cy.url().should('contain', '/konto/passwort');

    cy.byTestId('account-tab-mfa').click();
    cy.url().should('contain', '/konto/zwei-faktor');
    cy.byTestId('account-tab-mfa').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('mfaIntro').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('account-tab-notifications').click();
    cy.url().should('contain', '/konto/benachrichtigungen');
    cy.byTestId('push-notifications-unsupported').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('account-tab-theme').click();
    cy.url().should('contain', '/konto/design');
    cy.byTestId('theme-option-system').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('account-tab-privacy').click();
    cy.url().should('contain', '/konto/datenschutz');
    cy.byTestId('privacy-export-button').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

    // the back button leads through the tabs, and a direct link lands on the right one
    cy.go('back');
    cy.url().should('contain', '/konto/design');
    cy.visit('/konto/design');
    cy.byTestId('account-tab-theme').should('have.attr', 'aria-selected', 'true');
  });

  // The GDPR Art. 15/20 data takeout for a staff member's own account (issue #3363).
  it('downloads the caller\'s own data export (GDPR takeout)', () => {
    cy.visit('/konto/datenschutz');
    cy.byTestId('privacy-export-button').should('contain.text', 'Meine Daten exportieren').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'benutzerdaten-e2etest.zip');

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string) => expect(buffer.length).to.be.gt(1000));

    // The export is one of the GDPR-sensitive reads recorded in the audit trail (issue #3180) -
    // proven here against the real backend, not just a mocked unit test.
    cy.visit('/zugriffsprotokoll');
    cy.byTestId('audit-filter-entityType').click();
    cy.get('mat-option').contains('Benutzer').click();

    cy.byTestId('audit-entry-0-operation').should('contain.text', 'Abgerufen');
    cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Benutzer');
  });

  // The Art. 13 GDPR privacy notice for staff (issue #3429) - self-service, generic and no account reference needed.
  it('downloads the staff privacy notice', () => {
    cy.visit('/konto/datenschutz');
    cy.byTestId('privacy-notice-button').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const downloadedFilename = path.join(downloadsFolder, 'datenschutzerklaerung-mitarbeiter.pdf');

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string) => expect(buffer.length).to.be.gt(1000));
  });

  describe('theme', () => {
    // The e2e account is shared by every spec: leaving it on the dark theme would change what all of
    // them render and audit.
    afterEach(() => {
      cy.loginDefault();
      cy.visit('/konto/design');
      selectTheme('system');
      cy.get('html').should('not.have.class', 'dark-theme');
    });

    it('switches to the dark theme, keeps it per user and has no violations', () => {
      cy.visit('/konto/design');
      cy.get('html').should('not.have.class', 'dark-theme');
      cy.byTestId('theme-option-system').should('have.class', 'mat-mdc-radio-checked');
      cy.byTestId('theme-option-dark').should('not.have.class', 'mat-mdc-radio-checked');

      selectTheme('dark');
      cy.get('html').should('have.class', 'dark-theme');

      // Another device knows nothing of this browser's storage: the choice has to come back from
      // the user's account, not from what this browser remembered.
      cy.clearAllLocalStorage();
      cy.reload();
      cy.get('html').should('have.class', 'dark-theme');

      // the shell renders only once the session is known, which is what a reload waits for
      cy.get(MAIN_CONTENT).should('be.visible');
      cy.byTestId('theme-option-dark').should('have.class', 'mat-mdc-radio-checked');
      cy.checkAccessibility(MAIN_CONTENT);

      // The inactive status badges of the two-factor tab sit on a neutral surface that has to keep its contrast here.
      cy.byTestId('account-tab-mfa').click();
      cy.byTestId('mfaTotpStatus').should('contain.text', 'Nicht aktiv');
      cy.checkAccessibility(MAIN_CONTENT);
    });
  });
});
