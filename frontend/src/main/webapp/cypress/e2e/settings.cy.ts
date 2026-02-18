describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/einstellungen');
  });

  it('change email recipients', () => {
    cy.byTestId('mailtype-tab-STATISTICS').click();

    // Remove any existing recipients first to ensure clean state
    cy.get('body').then(($body) => {
      const ccButtons = $body.find('[testid^="remove-recipient-button-STATISTICS-CC-"]');
      const toButtons = $body.find('[testid^="remove-recipient-button-STATISTICS-TO-"]');
      ccButtons.each(function () { Cypress.$(this).trigger('click'); });
      toButtons.each(function () { Cypress.$(this).trigger('click'); });
    });

    // Add CC recipient
    cy.byTestId('add-recipient-button-STATISTICS-CC').click();
    cy.byTestId('email-input-STATISTICS-CC-0').clear();
    cy.byTestId('email-input-STATISTICS-CC-0').type('test-cc@email.com');

    // Add TO recipient
    cy.byTestId('add-recipient-button-STATISTICS-TO').click();
    cy.byTestId('email-input-STATISTICS-TO-0').clear();
    cy.byTestId('email-input-STATISTICS-TO-0').type('test-to@email.com');

    // Save
    cy.intercept('POST', '/api/settings/mail-recipients').as('saveSettings');
    cy.byTestId('save-button').click();
    cy.wait('@saveSettings');
    cy.byTestId('tafel-toast-header')
      .should('be.visible')
      .within(() => {
        cy.byTestId('title').should('have.text', 'Einstellungen gespeichert!');
      });

    cy.reload();
    cy.byTestId('mailtype-tab-STATISTICS').click();
    cy.byTestId('email-input-STATISTICS-TO-0').should('have.value', 'test-to@email.com');
    cy.byTestId('email-input-STATISTICS-CC-0').should('have.value', 'test-cc@email.com');

    // Reset
    cy.intercept('POST', '/api/settings/mail-recipients').as('saveSettings2');
    cy.byTestId('remove-recipient-button-STATISTICS-CC-0').click();
    cy.byTestId('save-button').click();
    cy.wait('@saveSettings2');
  });

});
