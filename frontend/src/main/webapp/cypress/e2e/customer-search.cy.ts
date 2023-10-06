describe('Customer Search', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/kunden/suchen');
  });

  it('search by customerId', () => {
    cy.byTestId('customerIdText').type('100');
    cy.byTestId('showcustomer-button').click();

    cy.url().should('include', '/kunden/detail/100');
  });

  it('search by lastname and firstname', () => {
    cy.byTestId('lastnameText').type('endtoend-test-search');
    cy.byTestId('firstnameText').type('1');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 1);

    cy.byTestId('searchresult-showcustomer-button-0').should('be.visible');

    cy.byTestId('searchresult-showcustomer-button-0').click();
    cy.url().should('include', '/kunden/detail/201');
  });

  it('search by lastname only', () => {
    cy.byTestId('lastnameText').type('endtoend-test-search');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 2);

    cy.byTestId('searchresult-showcustomer-button-0').should('be.visible');

    cy.byTestId('searchresult-showcustomer-button-0').click();
    cy.url().should('include', '/kunden/detail/201');
  });

  it('search by firstname only', () => {
    cy.byTestId('firstnameText').type('2');
    cy.byTestId('search-button').click();

    cy.byTestId('searchresult-table').should('be.visible');
    cy.byTestId('searchresult-row').should('have.length', 1);

    cy.byTestId('searchresult-showcustomer-button-0').should('be.visible');

    cy.byTestId('searchresult-showcustomer-button-0').click();
    cy.url().should('include', '/kunden/detail/202');
  });

});
