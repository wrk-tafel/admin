import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/email');
  });

  it('change email recipients', () => {
    cy.byTestId('mailtype-tab-STATISTICS').click();

    // A remove click on an already-persisted address deletes it immediately via a real REST call -
    // there is no "Speichern" step for a deletion, so this needs its own intercept.
    cy.intercept('DELETE', '/api/settings/mail-recipients/*').as('deleteRecipient');
    cy.intercept('PUT', '/api/settings/mail-recipients').as('saveRecipients');
    // Also intercept subsequent GET so we can wait for reload to finish
    cy.intercept('GET', '/api/settings/mail-recipients').as('loadRecipients');

    // Modify
    cy.byTestId('add-recipient-button-STATISTICS-CC').click();

    cy.byTestId('email-input-STATISTICS-CC-0').clear();
    cy.byTestId('email-input-STATISTICS-CC-0').type('test-cc@email.com');

    cy.byTestId('remove-recipient-button-STATISTICS-TO-0').click();
    cy.wait('@deleteRecipient').its('response.statusCode').should('eq', 204);
    cy.byTestId('add-recipient-button-STATISTICS-TO').click();

    cy.byTestId('email-input-STATISTICS-TO-0').clear();
    cy.byTestId('email-input-STATISTICS-TO-0').type('test-to@email.com');

    // Save - verify POST success via intercept
    cy.byTestId('save-button').click();
    cy.wait('@saveRecipients').its('response.statusCode').should('eq', 200);

    cy.reload();
    cy.wait('@loadRecipients');
    cy.byTestId('mailtype-tab-STATISTICS').click();
    cy.byTestId('email-input-STATISTICS-TO-0').should('have.value', 'test-to@email.com');
    cy.byTestId('email-input-STATISTICS-CC-0').should('have.value', 'test-cc@email.com');

    // Reset - both are now persisted, so removing them deletes immediately; no save needed
    cy.byTestId('remove-recipient-button-STATISTICS-CC-0').click();
    cy.wait('@deleteRecipient').its('response.statusCode').should('eq', 204);
  });

  it('recipients stack in a single column with dividers and the add/save flow works on phone', () => {
    cy.viewport(PHONE_VIEWPORT);

    cy.byTestId('mailtype-tab-DAILY_REPORT').click();

    // below the md: breakpoint the recipient groups render in a single column with a divider between them
    // (scoped to the active tab body - other tabs stay mounted off-screen for animation purposes)
    cy.get('.mat-mdc-tab-body-active hr').should('be.visible');

    cy.intercept('DELETE', '/api/settings/mail-recipients/*').as('deleteRecipient');
    cy.intercept('PUT', '/api/settings/mail-recipients').as('saveRecipients');
    cy.intercept('GET', '/api/settings/mail-recipients').as('loadRecipients');

    addRecipientSaveAndAssertPersisted('DAILY_REPORT', 'CC', 'phone-cc@email.com');
  });

  it('recipients render in a multi-column grid without dividers at tablet width', () => {
    cy.viewport(TABLET_VIEWPORT);

    cy.byTestId('mailtype-tab-RETURN_BOXES').click();

    // at/above the md: breakpoint recipients render in a 3-column grid, so no divider is needed
    cy.get('.mat-mdc-tab-body-active hr').should('not.be.visible');

    addAndRemoveRecipient('RETURN_BOXES', 'CC', 'tablet-cc@email.com');
  });

  // Recipient counts per mail type/recipient type are seeded/mutated data, not fixed indices, so
  // resolve the index dynamically instead of assuming a fixed testid suffix like '-0'.
  function addAndRemoveRecipient(mailType: string, recipientType: string, email: string) {
    const inputSelector = `[testid^="email-input-${mailType}-${recipientType}-"]`;

    cy.get('body').then($body => {
      const countBefore = $body.find(inputSelector).length;

      cy.byTestId(`add-recipient-button-${mailType}-${recipientType}`).click();
      cy.get(inputSelector).should('have.length', countBefore + 1);
      cy.get(inputSelector).eq(countBefore).clear().type(email);
      cy.get(inputSelector).eq(countBefore).should('have.value', email);

      cy.byTestId(`remove-recipient-button-${mailType}-${recipientType}-${countBefore}`).click();
      cy.get(inputSelector).should('have.length', countBefore);
    });
  }

  function addRecipientSaveAndAssertPersisted(mailType: string, recipientType: string, email: string) {
    const inputSelector = `[testid^="email-input-${mailType}-${recipientType}-"]`;

    cy.get('body').then($body => {
      const countBefore = $body.find(inputSelector).length;

      cy.byTestId(`add-recipient-button-${mailType}-${recipientType}`).click();
      cy.get(inputSelector).eq(countBefore).clear().type(email);

      cy.byTestId('save-button').click();
      cy.wait('@saveRecipients').its('response.statusCode').should('eq', 200);

      cy.reload();
      cy.wait('@loadRecipients');
      cy.byTestId(`mailtype-tab-${mailType}`).click();
      cy.get(inputSelector).eq(countBefore).should('have.value', email);

      // Reset - the address is now persisted, so removing it deletes immediately; no save needed
      cy.byTestId(`remove-recipient-button-${mailType}-${recipientType}-${countBefore}`).click();
      cy.wait('@deleteRecipient').its('response.statusCode').should('eq', 204);
    });
  }

  // A tab other than the first, and a recipient row that only exists after "hinzufügen", are both
  // states the Lighthouse `pages` sweep never reaches - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations on a tab other than the first, with an added recipient', () => {
      cy.byTestId('mailtype-tab-STATISTICS').click();
      cy.byTestId('add-recipient-button-STATISTICS-CC').click();
      cy.byTestId('email-input-STATISTICS-CC-0').should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });

  });

});
