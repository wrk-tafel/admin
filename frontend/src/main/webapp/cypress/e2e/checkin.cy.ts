describe('CheckIn', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.createDistribution();
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('customer added, counted on dashboard and deleted again', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.id;

      cy.visit('/#/anmeldung/annahme');

      cy.intercept('GET', '/api/customers/*').as('getCustomer');
      cy.byTestId('customerIdInput').type(customerId.toString());
      cy.byTestId('showCustomerButton').click();
      cy.wait('@getCustomer');

      cy.byTestId('customerDetailPanel').should('be.visible');

      cy.intercept('POST', '/api/distributions/customers').as('assignCustomer');
      cy.byTestId('ticketNumberInput').type('10');
      cy.byTestId('assignCustomerButton').click();
      cy.wait('@assignCustomer');

      cy.byTestId('customerIdInput').should('not.have.text');
      cy.byTestId('errorMessage').should('not.exist');
      cy.byTestId('customerDetailPanel').should('not.exist');

      cy.visit('/#/uebersicht');
      cy.byTestId('customers-count').should('have.text', '1');

      cy.visit('/#/anmeldung/annahme');

      cy.intercept('GET', '/api/customers/*').as('getCustomer2');
      cy.byTestId('customerIdInput').type(customerId.toString());
      cy.byTestId('showCustomerButton').click();
      cy.wait('@getCustomer2');

      cy.byTestId('ticketNumberInput').should('have.value', '10');

      cy.intercept('DELETE', '/api/distributions/tickets/customers/*').as('deleteCustomer');
      cy.byTestId('deleteTicketButton').click();
      cy.wait('@deleteCustomer');

      cy.visit('/#/uebersicht');
      cy.byTestId('customers-count').should('have.text', '0');
    });
  });

});
