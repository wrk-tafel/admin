describe('Customer Edit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('customerId correct', () => {
    cy.visit('/#/kunden/bearbeiten/101');
    cy.byTestId('customerIdInput').should('have.value', '101');
  });

  it('customer updated', () => {
    cy.visit('/#/kunden/bearbeiten/101');
    cy.byTestId('save-button').click();

    cy.url().should('contain', '/kunden/detail/101');

    // TODO change actual data (but for that create a new dedicated customer beforehand)
  });

});
