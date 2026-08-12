import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('Settings - E-Mail', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/email');
  });

  // The chips are the stored addresses; the input next to them is what turns typed text into one.
  const chipsOf = (mailType: string, recipientType: string) =>
    `[testid="email-chip-${mailType}-${recipientType}"]`;

  it('adds a recipient as a chip and persists it', () => {
    cy.intercept('PUT', '/api/settings/mail-recipients').as('saveRecipients');
    cy.intercept('GET', '/api/settings/mail-recipients').as('loadRecipients');

    cy.byTestId('mailtype-tab-STATISTICS').click();
    cy.byTestId('email-input-STATISTICS-CC').type('test-cc@email.com{enter}');
    cy.get(chipsOf('STATISTICS', 'CC')).should('contain.text', 'test-cc@email.com');

    // the screen says so while the change is only in the browser
    cy.byTestId('unsaved-changes-indicator').should('be.visible');

    cy.byTestId('save-button').click();
    cy.wait('@saveRecipients').its('response.statusCode').should('eq', 200);
    cy.byTestId('unsaved-changes-indicator').should('not.exist');

    cy.reload();
    cy.wait('@loadRecipients');
    cy.byTestId('mailtype-tab-STATISTICS').click();
    cy.get(chipsOf('STATISTICS', 'CC')).should('contain.text', 'test-cc@email.com');

    // Reset
    cy.byTestId('remove-recipient-button-STATISTICS-CC-0').click();
    cy.byTestId('save-button').click();
    cy.wait('@saveRecipients');
    cy.get(chipsOf('STATISTICS', 'CC')).should('not.exist');
  });

  it('rejects an invalid address instead of adding it', () => {
    cy.byTestId('mailtype-tab-STATISTICS').click();
    cy.byTestId('email-input-STATISTICS-CC').type('kein-mail{enter}');

    cy.byTestId('email-error-STATISTICS-CC').should('contain.text', 'Ungültige E-Mail Adresse');
    cy.get(chipsOf('STATISTICS', 'CC')).should('not.exist');
    // the typed text stays so it can be corrected rather than retyped
    cy.byTestId('email-input-STATISTICS-CC').should('have.value', 'kein-mail');
    cy.byTestId('unsaved-changes-indicator').should('not.exist');
  });

  it('rejects an address that is already in the same slot', () => {
    cy.byTestId('mailtype-tab-DAILY_REPORT').click();

    cy.get(chipsOf('DAILY_REPORT', 'TO')).first().invoke('text').then(text => {
      cy.byTestId('email-input-DAILY_REPORT-TO').type(`${text.trim()}{enter}`);
      cy.byTestId('email-error-DAILY_REPORT-TO').should('contain.text', 'bereits hinterlegt');
    });
  });

  it('explains each mail type and reports how its last mail ended', () => {
    cy.byTestId('mailtype-description-DAILY_REPORT').should('contain.text', 'Tagesreport');
    cy.byTestId('mail-status-DAILY_REPORT').should('be.visible');

    cy.byTestId('mailtype-tab-RETURN_BOXES').click();
    cy.byTestId('mailtype-description-RETURN_BOXES').should('contain.text', 'Kisten');
  });

  // Removing a chip re-renders the list, so the buttons cannot be collected up front and clicked
  // one after another - every one of them but the first would be detached by then.
  function removeAllChips(mailType: string, recipientType: string) {
    cy.get('body').then($body => {
      if ($body.find(chipsOf(mailType, recipientType)).length === 0) {
        return;
      }
      cy.byTestId(`remove-recipient-button-${mailType}-${recipientType}-0`).click();
      removeAllChips(mailType, recipientType);
    });
  }

  it('warns about a mail type that would be delivered to nobody', () => {
    cy.byTestId('mailtype-tab-DAILY_REPORT').click();
    cy.get(chipsOf('DAILY_REPORT', 'TO')).should('exist');

    // taking every TO address away is what leaves the mail with nobody to go to - only in the
    // browser, since nothing is saved here
    removeAllChips('DAILY_REPORT', 'TO');

    cy.byTestId('no-recipients-warning-DAILY_REPORT')
      .should('contain.text', 'wird an niemanden versendet');
    // and it is visible from the other tabs too, on the tab header
    cy.byTestId('mailtype-tab-STATISTICS').click();
    cy.byTestId('mailtype-tab-warning-DAILY_REPORT').should('be.visible');
  });

  it('asks before leaving the page with unsaved changes', () => {
    cy.byTestId('mailtype-tab-STATISTICS').click();
    cy.byTestId('email-input-STATISTICS-CC').type('unsaved@email.com{enter}');

    cy.contains('a', 'Übersicht').should('be.visible').click();

    cy.byTestId('unsaved-changes-dialog').should('be.visible');
    cy.byTestId('cancelButton').click();
    cy.url().should('include', '/einstellungen/email');
    cy.get(chipsOf('STATISTICS', 'CC')).should('contain.text', 'unsaved@email.com');

    cy.contains('a', 'Übersicht').click();
    cy.byTestId('confirmButton').click();
    cy.url().should('include', '/uebersicht');
  });

  it('confirms a resend and reports its outcome', () => {
    cy.intercept('POST', '/api/distributions/*/send-mails').as('sendMails');

    cy.byTestId('send-mails-button').click();

    cy.byTestId('send-mails-dialog').should('be.visible');
    cy.byTestId('send-mails-distribution').should('not.be.empty');
    cy.byTestId('send-mails-recipients-DAILY_REPORT').should('be.visible');

    cy.byTestId('cancelButton').click();
    cy.byTestId('send-mails-dialog').should('not.exist');
    cy.get('@sendMails.all').should('have.length', 0);

    cy.byTestId('send-mails-button').click();
    cy.byTestId('confirmButton').click();
    cy.wait('@sendMails').its('response.statusCode').should('eq', 200);

    // the e2e backend has no mail server, so nothing is queued - which is exactly what is reported
    cy.get('.toast-message').should('be.visible').and('contain.text', 'keine E-Mail eingereiht');
  });

  it('recipient slots stack in a single column on phone and add a chip there', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.intercept('PUT', '/api/settings/mail-recipients').as('saveRecipients');

    cy.byTestId('mailtype-tab-RETURN_BOXES').click();
    cy.byTestId('email-input-RETURN_BOXES-CC').type('phone-cc@email.com{enter}');
    cy.get(chipsOf('RETURN_BOXES', 'CC')).should('contain.text', 'phone-cc@email.com');

    cy.byTestId('save-button').click();
    cy.wait('@saveRecipients').its('response.statusCode').should('eq', 200);

    // Reset
    cy.byTestId('remove-recipient-button-RETURN_BOXES-CC-0').click();
    cy.byTestId('save-button').click();
    cy.wait('@saveRecipients');
  });

  it('recipient slots render side by side at tablet width', () => {
    cy.viewport(TABLET_VIEWPORT);

    cy.byTestId('mailtype-tab-RETURN_BOXES').click();
    cy.byTestId('email-input-RETURN_BOXES-TO').should('be.visible');
    cy.byTestId('email-input-RETURN_BOXES-BCC').should('be.visible');
  });

  // A tab other than the first, an added chip, and both dialogs are states the Lighthouse `pages`
  // sweep never reaches - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations on a tab other than the first, with an added chip', () => {
      cy.byTestId('mailtype-tab-STATISTICS').click();
      cy.byTestId('email-input-STATISTICS-CC').type('a11y-cc@email.com{enter}');
      cy.get(chipsOf('STATISTICS', 'CC')).should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations on the resend confirmation', () => {
      cy.byTestId('send-mails-button').click();

      cy.checkDialogAccessibility();
    });

    it('has no violations on the unsaved-changes confirmation', () => {
      cy.byTestId('mailtype-tab-STATISTICS').click();
      cy.byTestId('email-input-STATISTICS-CC').type('a11y-unsaved@email.com{enter}');
      cy.contains('a', 'Übersicht').should('be.visible').click();

      cy.checkDialogAccessibility();
    });

  });

});
