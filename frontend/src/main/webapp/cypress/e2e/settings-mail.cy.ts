describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/einstellungen/email');
  });

  it('change email recipients', () => {
    cy.byTestId('mailtype-tab-STATISTICS').click();

    // Modify
    cy.byTestId('add-recipient-button-STATISTICS-CC').click();

    cy.byTestId('email-input-STATISTICS-CC-0').clear();
    cy.byTestId('email-input-STATISTICS-CC-0').type('test-cc@email.com');

    cy.byTestId('remove-recipient-button-STATISTICS-TO-0').click();
    cy.byTestId('add-recipient-button-STATISTICS-TO').click();

    cy.byTestId('email-input-STATISTICS-TO-0').clear();
    cy.byTestId('email-input-STATISTICS-TO-0').type('test-to@email.com');

    // Save - verify POST success via intercept
    cy.intercept('POST', '/api/settings/mail-recipients').as('saveRecipients');
    // Also intercept subsequent GET so we can wait for reload to finish
    cy.intercept('GET', '/api/settings/mail-recipients').as('loadRecipients');
    cy.byTestId('save-button').click();
    cy.wait('@saveRecipients').its('response.statusCode').should('eq', 200);

    cy.reload();
    cy.wait('@loadRecipients');
    cy.byTestId('mailtype-tab-STATISTICS').click();
    cy.byTestId('email-input-STATISTICS-TO-0').should('have.value', 'test-to@email.com');
    cy.byTestId('email-input-STATISTICS-CC-0').should('have.value', 'test-cc@email.com');

    // Reset
    cy.byTestId('remove-recipient-button-STATISTICS-CC-0').click();
    cy.byTestId('save-button').click();
  });

});
