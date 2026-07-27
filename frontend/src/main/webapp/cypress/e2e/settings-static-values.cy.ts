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

  it('shows an inline input for the amount only, other columns stay read-only', () => {
    cy.byTestId('editStaticValueButton-0').click();

    cy.byTestId('static-values-row-0').find('input[type="number"]').should('have.length', 1);
  });

  it('focuses the amount input when starting an inline edit', () => {
    cy.byTestId('editStaticValueButton-0').click();

    cy.byTestId('staticValueAmountInput-0').should('be.focused');
  });

  it('edits the amount of a static value inline', () => {
    cy.byTestId('editStaticValueButton-0').click();

    cy.byTestId('staticValueAmountInput-0').should('be.visible').clear().type('1500');
    cy.byTestId('saveStaticValueButton-0').click();

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
    cy.byTestId('static-values-row-0').should('contain.text', '1.500,00');
  });

  it('discards changes when cancelling an inline edit', () => {
    cy.byTestId('static-values-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editStaticValueButton-0').click();
      cy.byTestId('staticValueAmountInput-0').clear().type('999999');
      cy.byTestId('cancelStaticValueButton-0').click();

      cy.byTestId('static-values-row-0').should('have.text', originalText);
    });
  });

  it('saves the inline edit when pressing Enter', () => {
    cy.byTestId('editStaticValueButton-0').click();

    cy.byTestId('staticValueAmountInput-0').should('be.visible').clear().type('1600{enter}');

    cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
    cy.byTestId('static-values-row-0').should('contain.text', '1.600,00');
  });

  it('discards changes when pressing Escape', () => {
    cy.byTestId('static-values-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editStaticValueButton-0').click();
      cy.byTestId('staticValueAmountInput-0').clear().type('999999{esc}');

      cy.byTestId('static-values-row-0').should('have.text', originalText);
    });
  });

});
