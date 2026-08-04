import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

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

    cy.get('.toast-message').should('be.visible').should('contain.text', 'Ticket-Nummer gelöscht!');

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

  it('customer added, counted on dashboard and deleted again on phone', () => {
    // Below md: (768px) everything stacks into a single column (form rows, detail
    // panel, address/ticket rows) - verify the full flow still works stacked.
    cy.viewport(PHONE_VIEWPORT);

    searchCustomer(100);
    cy.byTestId('customerDetailPanel').should('be.visible');

    assignTicket(10);
    assertFormReset();

    assertDashboardCustomerCount(1);

    cy.visit('/#/anmeldung/annahme');
    searchCustomer(100);

    cy.byTestId('ticketNumberInput').should('have.value', '10');
    cy.byTestId('deleteTicketButton').click();

    cy.get('.toast-message').should('be.visible').should('contain.text', 'Ticket-Nummer gelöscht!');

    assertDashboardCustomerCount(0);
  });

  it('customer accepted with desktop-style form grid at tablet breakpoint', () => {
    // At 768px the sidenav is still in mobile ("over") mode, but the page's own md: content
    // grid (form rows, detail panel columns, address rows) already switches to its desktop
    // arrangement - verify that combination renders and one flow still works.
    cy.viewport(TABLET_VIEWPORT);

    searchCustomer(100);
    cy.byTestId('customerDetailPanel').should('be.visible');

    assignTicket(10);
    assertFormReset();

    assertDashboardCustomerCount(1);
  });

});

// Accruing debt requires closing a distribution (see cy.accrueCostContributionDebt), which would
// redirect away from the checkin page if it were the same distribution the outer describe above
// already visits it under - so this runs its own distribution lifecycle: accrue the debt first in
// a throwaway distribution, then start a fresh one before visiting the checkin page.
describe('CheckIn - cost contribution debt', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('pay off the full pending debt at once', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id!;
      cy.accrueCostContributionDebt(customerId);

      cy.createDistribution();
      cy.visit('/#/anmeldung/annahme');
      searchCustomer(customerId);

      cy.byTestId('payCostContributionAllButton').should('be.visible').click();

      cy.byTestId('payCostContributionAllButton').should('not.exist');
      cy.byTestId('payCostContributionAmountButton').should('not.exist');

      // belt-and-suspenders: make sure this dummy customer ends the test with zero debt (see the
      // "pay off a specific amount" test below for why this matters for other specs)
      cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
    });
  });

  it('pay off a specific amount of the pending debt', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id!;
      cy.accrueCostContributionDebt(customerId);

      cy.createDistribution();
      cy.visit('/#/anmeldung/annahme');
      searchCustomer(customerId);

      cy.byTestId('payCostContributionAmountButton').click();
      cy.byTestId('pay-cost-contribution-dialog').should('be.visible').within(() => {
        cy.byTestId('amount-input').type('1');
        cy.byTestId('okButton').click();
      });

      // still owes the remainder, so both actions stay available
      cy.byTestId('payCostContributionAllButton').should('be.visible');
      cy.byTestId('payCostContributionAmountButton').should('be.visible');

      // clear the remainder via the API (rather than another UI round-trip) - other specs (e.g.
      // customer-search.cy.ts's "search by cost contribution") assert on the total count of
      // customers with pending debt, so a dummy customer left with a nonzero balance here would
      // leak into and break that assertion
      cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
    });
  });

});

function searchCustomer(customerId: number) {
  cy.byTestId('customerIdInput').clear();
  // guard against a race where the form's async reset (after the previous search) overwrites
  // the field right after clear() - retry until it's genuinely empty before typing into it
  cy.byTestId('customerIdInput').should('have.value', '');
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
