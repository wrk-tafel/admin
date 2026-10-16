import * as path from 'path';
import {expectAnimationsSettled, MAIN_CONTENT} from '../support/accessibility';

// "Mein Konto": a page per topic, listed in the sidebar. What each topic does is covered by its own spec
// (passwordchange.cy.ts, mfa.cy.ts, push-notifications.cy.ts); this one is about the page around them.
// A radio button is picked through its input: the host element spans the whole width, and a click at its centre
// misses the label.
function selectTheme(value: 'light' | 'dark' | 'system') {
  cy.byTestId(`theme-option-${value}`).find('input').click({force: true});
}

// An error message fades in - opacity and colour both - and axe measures the colour it has at that moment, which
// is nearly white while the animation runs. Nothing in the DOM says when it is done, so it is given the time.
function errorsShown(...messages: string[]) {
  messages.forEach(message => cy.get('mat-error').contains(message).should('be.visible'));
  cy.wait(1000);
}

describe('Account page', () => {

  beforeEach(() => {
    cy.viewport(1280, 800);
    cy.loginDefault();
  });

  it('opens from the user menu on the own data', () => {
    cy.visit('/uebersicht');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-account').click();

    cy.url().should('contain', '/konto/daten');
    cy.byTestId('account-nav-data').should('have.attr', 'aria-current', 'page');
    cy.byTestId('account-username').should('have.text', 'e2etest');
    cy.byTestId('account-personnel-number').should('have.text', '00000');
    cy.byTestId('account-firstname').should('have.value', 'E2E');
    cy.byTestId('account-lastname').should('have.value', 'Test');
    cy.checkAccessibility(MAIN_CONTENT);
  });

  it('shows the topics in the sidebar in three groups, each topic with an address of its own', () => {
    cy.visit('/konto');
    cy.url().should('contain', '/konto/daten');
    // the sidebar shows the account's menu instead of the main one
    cy.byTestId('main-nav').should('not.exist');
    cy.byTestId('account-nav').within(() => {
      cy.contains('Profil').should('be.visible');
      cy.contains('Sicherheit').should('be.visible');
      cy.contains('Einstellungen').should('be.visible');
    });
    cy.checkAccessibility('nav[testid="account-nav"]');

    cy.byTestId('account-nav-password').click();
    cy.url().should('contain', '/konto/passwort');
    cy.byTestId('account-nav-password').should('have.attr', 'aria-current', 'page');
    cy.byTestId('currentPasswordText').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('account-nav-mfa').click();
    cy.url().should('contain', '/konto/zwei-faktor');
    cy.byTestId('account-nav-mfa').should('have.attr', 'aria-current', 'page');
    cy.byTestId('mfaIntro').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('account-nav-notifications').click();
    cy.url().should('contain', '/konto/benachrichtigungen');
    cy.byTestId('push-notifications-unsupported').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('account-nav-theme').click();
    cy.url().should('contain', '/konto/design');
    cy.byTestId('theme-option-system').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

    cy.byTestId('account-nav-privacy').click();
    cy.url().should('contain', '/konto/datenschutz');
    cy.byTestId('privacy-export-button').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

    // the back button leads through the topics, and a direct link lands on the right one
    cy.go('back');
    cy.url().should('contain', '/konto/design');
    cy.visit('/konto/design');
    cy.byTestId('account-nav-theme').should('have.attr', 'aria-current', 'page');
  });

  // On a phone the account's menu is the drawer, like the main menu - and the way back leads to the application.
  it('on a phone, lists the topics in the drawer, and leads back to the application', () => {
    cy.viewport('iphone-x');
    cy.visit('/konto');
    cy.url().should('contain', '/konto/daten');

    cy.get('button[aria-label="Menü ein-/ausklappen"]').filter(':visible').first().click();
    cy.byTestId('account-nav').should('be.visible');
    cy.get('mat-sidenav').should(expectAnimationsSettled);
    cy.checkAccessibility('mat-sidenav');
    cy.byTestId('account-nav-password').click();
    cy.url().should('contain', '/konto/passwort');
    cy.byTestId('currentPasswordText').should('be.visible');

    cy.get('button[aria-label="Menü ein-/ausklappen"]').filter(':visible').first().click();
    cy.byTestId('account-nav-back').click();
    cy.url().should('contain', '/uebersicht');
    cy.get('button[aria-label="Menü ein-/ausklappen"]').filter(':visible').first().click();
    cy.byTestId('main-nav').should('be.visible');
  });

  describe('own data', () => {
    // The e2e account is shared by every spec, and some assert its name - so it is put back the way it was.
    afterEach(() => {
      cy.loginDefault();
      cy.request({method: 'PUT', url: '/api/users/account', body: {firstname: 'E2E', lastname: 'Test', email: null}});
    });

    it('changes the own name and e-mail, which the two-factor topic then sends its code to', () => {
      cy.visit('/konto/daten');

      // nothing changed, nothing to save
      cy.byTestId('account-save-button').should('be.disabled');

      // no address on record: the two-factor topic points here instead of offering a code by e-mail
      cy.byTestId('account-nav-mfa').click();
      cy.byTestId('mfaEmailNoAddress').should('be.visible').and('contain.text', 'keine E-Mail-Adresse hinterlegt');
      cy.byTestId('mfaEmailSetupButton').should('not.exist');
      cy.checkAccessibility(MAIN_CONTENT);
      cy.byTestId('mfaEmailNoAddress').find('a').click();
      cy.url().should('contain', '/konto/daten');

      cy.byTestId('account-firstname').clear().type('Erika');
      cy.byTestId('account-lastname').clear().type('Muster');
      cy.byTestId('account-email').type('erika.muster@example.org');
      cy.byTestId('account-save-button').should('be.enabled').click();

      cy.byTestId('account-save-button').should('be.disabled');

      // the change is on the account, not just on the screen
      cy.reload();
      cy.byTestId('account-firstname').should('have.value', 'Erika');
      cy.byTestId('account-lastname').should('have.value', 'Muster');
      cy.byTestId('account-email').should('have.value', 'erika.muster@example.org');
      // what the administrator assigns is not touched
      cy.byTestId('account-username').should('have.text', 'e2etest');
      cy.byTestId('account-personnel-number').should('have.text', '00000');

      cy.byTestId('account-nav-mfa').click();
      cy.byTestId('mfaEmailNoAddress').should('not.exist');
      cy.byTestId('mfaEmailAddress').should('contain.text', 'erika.muster@example.org');
      cy.byTestId('mfaEmailSetupButton').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('refuses an empty name and a malformed address, and discards changes on request', () => {
      cy.visit('/konto/daten');

      cy.byTestId('account-lastname').clear();
      cy.byTestId('account-email').type('not-an-address');
      cy.byTestId('account-save-button').click();
      errorsShown('Pflichtfeld', 'E-Mail-Format ungültig');
      cy.checkAccessibility(MAIN_CONTENT);

      cy.byTestId('account-discard-button').click();
      cy.byTestId('account-lastname').should('have.value', 'Test');
      cy.byTestId('account-email').should('have.value', '');
      cy.byTestId('account-save-button').should('be.disabled');
    });
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

      // The inactive status badges of the two-factor topic sit on a neutral surface that has to keep its contrast here.
      cy.byTestId('account-nav-mfa').click();
      cy.byTestId('mfaTotpStatus').should('contain.text', 'Nicht aktiv');
      cy.checkAccessibility(MAIN_CONTENT);
    });
  });
});
