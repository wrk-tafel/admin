describe('Customer Edit', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('customerId correct', () => {
    cy.visit('/#/kunden/bearbeiten/102');
    cy.byTestId('customerIdInput').should('have.value', '102');
  });

  it('customer updated', () => {
    cy.visit('/#/kunden/bearbeiten/102');
    cy.byTestId('save-button').click();

    cy.url().should('contain', '/kunden/detail/102');

    // TODO change actual data (but for that create a new dedicated customer beforehand)
  });

});
