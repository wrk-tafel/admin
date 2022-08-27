describe('Customer Search', () => {

  beforeEach(() => {
    cy.login();
    cy.visit('/#/kunden/suchen');
  });

  it('buttons disabled by default', () => {
    cy.byTestId('showcustomer-button').should('be.disabled');
    cy.byTestId('search-button').should('be.disabled');
  });

  it('search with customerId', () => {
    cy.byTestId('customerIdText').type('100');
    cy.byTestId('showcustomer-button').click();

    cy.url().should('include', '/kunden/detail/100');
  });

  it('search with lastname and firstname', () => {
    cy.byTestId('lastnameText').type('e2esearch');
    cy.byTestId('firstnameText').type('1');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 2);

    cy.byTestId('searchresult-showcustomer-button-0').should('be.visible');

    cy.byTestId('searchresult-showcustomer-button-0').click();
    cy.url().should('include', '/kunden/detail/201');
  });

  it('search with lastname only', () => {
    cy.byTestId('lastnameText').type('e2esearch');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 2);

    cy.byTestId('searchresult-showcustomer-button-0').should('be.visible');

    cy.byTestId('searchresult-showcustomer-button-0').click();
    cy.url().should('include', '/kunden/detail/201');
  });

  it('search with firstname only', () => {
    cy.byTestId('firstnameText').type('2');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 1);

    cy.byTestId('searchresult-showcustomer-button-0').should('be.visible');

    cy.byTestId('searchresult-showcustomer-button-0').click();
    cy.url().should('include', '/kunden/detail/202');
  });

});
