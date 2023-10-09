describe('Customer Search', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/kunden/suchen');
  });

  it('search by customerId', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;

      cy.byTestId('customerIdText').type(customerId.toString());
      cy.byTestId('showcustomer-button').click();

      cy.url().should('include', '/kunden/detail/' + customerId);
    });
  });

  it('search by lastname and firstname', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body;

      cy.byTestId('lastnameText').type(customer.lastname);
      cy.byTestId('firstnameText').type(customer.firstname);
      cy.byTestId('search-button').click();

      cy.byTestId('searchresult-table').should('be.visible');
      cy.byTestId('searchresult-row').should('have.length', 1);

      cy.byTestId('searchresult-showcustomer-button-0').should('be.visible');

      cy.byTestId('searchresult-showcustomer-button-0').click();
      cy.url().should('include', '/kunden/detail/' + customer.id);
    });
  });

  it('search by lastname only', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body;

      cy.byTestId('lastnameText').type(customer.lastname);
      cy.byTestId('search-button').click();

      cy.byTestId('searchresult-table').should('be.visible');
      cy.byTestId('searchresult-row').should('have.length', 1);

      cy.byTestId('searchresult-showcustomer-button-0').should('be.visible');

      cy.byTestId('searchresult-showcustomer-button-0').click();
      cy.url().should('include', '/kunden/detail/' + customer.id);
    });
  });

  it('search by firstname only', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body;

      cy.byTestId('firstnameText').type(customer.firstname);
      cy.byTestId('search-button').click();

      cy.byTestId('searchresult-table').should('be.visible');
      cy.byTestId('searchresult-row').should('have.length', 1);

      cy.byTestId('searchresult-showcustomer-button-0').should('be.visible');

      cy.byTestId('searchresult-showcustomer-button-0').click();
      cy.url().should('include', '/kunden/detail/' + customer.id);
    });
  });

});
