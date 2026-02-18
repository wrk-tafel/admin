describe('CheckIn', () => {

  beforeEach(() => {
    cy.loginDefault();

    // Ensure no distribution is open from previous tests
    cy.request({
      method: 'POST',
      url: '/api/distributions/close?forceClose=true',
      failOnStatusCode: false
    });

    cy.intercept('POST', '/api/distributions/new').as('createDistribution');
    cy.createDistribution();
    cy.wait('@createDistribution');
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('customer added, counted on dashboard and deleted again', () => {
    cy.visit('/#/anmeldung/annahme');

    cy.intercept('GET', '/api/customers/*').as('getCustomer');
    cy.byTestId('customerIdInput').type('100');
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

    cy.intercept('GET', '/api/sse/dashboard').as('dashboardSSE');
    cy.visit('/#/uebersicht');
    cy.wait('@dashboardSSE');

    cy.byTestId('customers-count').should('have.text', '1');

    cy.visit('/#/anmeldung/annahme');

    cy.intercept('GET', '/api/customers/*').as('getCustomer2');
    cy.byTestId('customerIdInput').type('100');
    cy.byTestId('showCustomerButton').click();
    cy.wait('@getCustomer2');

    cy.byTestId('ticketNumberInput').should('have.value', '10');

    cy.intercept('DELETE', '/api/distributions/customers/*').as('deleteCustomer');
    cy.byTestId('deleteTicketButton').click();
    cy.wait('@deleteCustomer');

    cy.intercept('GET', '/api/sse/dashboard').as('dashboardSSE2');
    cy.visit('/#/uebersicht');
    cy.wait('@dashboardSSE2');

    cy.byTestId('customers-count').should('have.text', '0');
  });

});
