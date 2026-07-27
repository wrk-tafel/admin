describe('Settings - Static Values', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/einstellungen/statische-werte');
  });

  it('lists static values', () => {
    cy.byTestId('static-values-table').should('exist');
    cy.byTestId('static-values-row-0').should('contain.text', 'Einkommensgrenze');
  });

  it('has no button to add a new static value', () => {
    cy.byTestId('addStaticValueButton').should('not.exist');
  });

  it('shows type/dates/counts as read-only and only allows changing the amount', () => {
    cy.get('[testid^="editStaticValueButton-"]').first().click();

    cy.byTestId('static-value-readonly-fields').should('contain.text', 'Einkommensgrenze');
    cy.get('input[formControlName]').should('have.length', 1);
    cy.get('input[formControlName="amount"]').should('be.visible');
  });

  it('edits the amount of a static value', () => {
    cy.get('[testid^="editStaticValueButton-"]').first().click();

    cy.byTestId('staticValueAmountInput').should('be.visible').clear().type('1500');
    cy.byTestId('static-value-save-button').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
    cy.byTestId('static-values-row-0').should('contain.text', '1500');
  });

});
