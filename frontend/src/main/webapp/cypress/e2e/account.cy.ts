import * as path from 'path';
import {MAIN_CONTENT} from '../support/accessibility';

// "Mein Konto": one page, a tab per topic. What each tab does is covered by its own spec
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
    // Wide enough for all six tabs: where they do not fit, the bar scrolls sideways and re-centres the tab that was
    // opened, which moves the next one while a click is on its way.
    cy.viewport(1280, 800);
    cy.loginDefault();
  });

  it('opens from the user menu on the "Meine Daten" tab', () => {
    cy.visit('/uebersicht');

    cy.byTestId('usermenu').click();
    cy.byTestId('usermenu-account').click();

    cy.url().should('contain', '/konto/daten');
    cy.byTestId('account-tab-data').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('account-username').should('have.text', 'e2etest');
    cy.byTestId('account-personnel-number').should('have.text', '00000');
    cy.byTestId('account-firstname').should('have.value', 'E2E');
    cy.byTestId('account-lastname').should('have.value', 'Test');
    cy.checkAccessibility(MAIN_CONTENT);
  });

  it('has a tab for every topic, each with an address of its own', () => {
    cy.visit('/konto');
    cy.url().should('contain', '/konto/daten');

    cy.byTestId('account-tab-password').click();
    cy.url().should('contain', '/konto/passwort');
    cy.byTestId('account-tab-password').should('have.attr', 'aria-selected', 'true');
    cy.byTestId('currentPasswordText').should('be.visible');
    cy.checkAccessibility(MAIN_CONTENT);

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

  describe('own data', () => {
    // The e2e account is shared by every spec, and some assert its name - so it is put back the way it was.
    afterEach(() => {
      cy.loginDefault();
      cy.request({method: 'PUT', url: '/api/users/account', body: {firstname: 'E2E', lastname: 'Test', email: null}});
    });

    it('changes the own name and e-mail, which the two-factor tab then sends its code to', () => {
      cy.visit('/konto/daten');

      // nothing changed, nothing to save
      cy.byTestId('account-save-button').should('be.disabled');

      // no address on record: the two-factor tab points here instead of offering a code by e-mail
      cy.byTestId('account-tab-mfa').click();
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

      cy.byTestId('account-tab-mfa').click();
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

      // The inactive status badges of the two-factor tab sit on a neutral surface that has to keep its contrast here.
      cy.byTestId('account-tab-mfa').click();
      cy.byTestId('mfaTotpStatus').should('contain.text', 'Nicht aktiv');
      cy.checkAccessibility(MAIN_CONTENT);
    });
  });
});
