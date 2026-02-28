describe('CheckIn', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.createDistribution();
    cy.visit('/#/anmeldung/annahme');
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('customer added, counted on dashboard and deleted again', () => {
    searchCustomer(100);
    cy.byTestId('customerDetailPanel').should('be.visible');

    assignTicket(10);
    assertFormReset();

    assertDashboardCustomerCount(1);

    cy.visit('/#/anmeldung/annahme');
    searchCustomer(100);

    cy.byTestId('ticketNumberInput').should('have.value', '10');
    cy.byTestId('deleteTicketButton').click();

    assertDashboardCustomerCount(0);
  });

  it('customer added and ticket updated', () => {
    searchCustomer(100);
    cy.byTestId('customerDetailPanel').should('be.visible');

    assignTicket(10);
    assertFormReset();

    // recheck ticket
    searchCustomer(100);
    cy.byTestId('ticketNumberInput').should('have.value', '10');

    // update ticket
    cy.byTestId('ticketNumberInput').clear();
    assignTicket(20);
    assertFormReset();

    // verify updated ticket
    searchCustomer(100);
    cy.byTestId('ticketNumberInput').should('have.value', '20');
  });

  it('ticket deleted and customer has no ticket afterwards', () => {
    searchCustomer(100);

    assignTicket(10);
    assertFormReset();

    // delete ticket
    searchCustomer(100);
    cy.byTestId('ticketNumberInput').should('have.value', '10');
    cy.byTestId('deleteTicketButton').click();

    // verify ticket is empty
    searchCustomer(100);
    cy.byTestId('ticketNumberInput').should('have.value', '');
  });

});

function searchCustomer(customerId: number) {
  cy.byTestId('customerIdInput').clear();
  cy.byTestId('customerIdInput').type(customerId.toString());
  cy.byTestId('showCustomerButton').click();
  cy.byTestId('customerDetailPanel').should('be.visible');
}

function assignTicket(ticketNumber: number) {
  cy.byTestId('ticketNumberInput').type(ticketNumber.toString());
  cy.byTestId('assignCustomerButton').click();
}

function assertFormReset() {
  cy.byTestId('customerIdInput').should('not.have.text');
  cy.byTestId('errorMessage').should('not.exist');
  cy.byTestId('customerDetailPanel').should('not.exist');
}

function assertDashboardCustomerCount(count: number) {
  cy.visit('/#/uebersicht');
  cy.byTestId('customers-count').should('have.text', count.toString());
}
