describe('Customer Search', () => {

  beforeEach(() => {
    cy.login();
    cy.visit('/#/kunden/suchen');
  });

  it('button disabled by default', () => {
    cy.byTestId('search-button').should('be.disabled');
  });

  it('search with customerId', () => {
    cy.byTestId('customerIdText').type('100');
    cy.byTestId('search-button').click();

    cy.url().should('include', '/kunden/detail/100');
  });

  it('search with lastname and firstname', () => {
    cy.byTestId('lastnameText').type('Muster');
    cy.byTestId('firstnameText').type('Eva');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('showcustomer-button-0').should('be.visible');

    cy.byTestId('showcustomer-button-0').click();
    cy.url().should('include', '/kunden/detail');
  });

});
