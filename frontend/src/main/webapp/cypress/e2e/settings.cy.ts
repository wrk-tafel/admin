describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/einstellungen');
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

    // Save
    cy.byTestId('save-button').click();
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
    cy.byTestId('remove-recipient-button-STATISTICS-CC-0').click();
    cy.byTestId('save-button').click();
  });

});
