import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('CheckIn', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.createDistribution();
    cy.visit('/anmeldung/annahme');
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

    cy.visit('/anmeldung/annahme');
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
    // The delete button is gone once the response has been handled - and that handler is also what
    // moves the focus to the ticket field. Waiting for it here keeps that focus jump from landing
    // in the middle of the next search's typing (see clearCustomerId).
    cy.byTestId('deleteTicketButton').should('not.exist');

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

    cy.visit('/anmeldung/annahme');
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

  // The customer panel - the whole point of this screen - only exists after a search, so the
  // Lighthouse `pages` sweep grades the empty form and nothing else.
  // See cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations once a customer has been looked up', () => {
      searchCustomer(100);
      cy.byTestId('customerDetailPanel').should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });

  });

});

function searchCustomer(customerId: number) {
  clearCustomerId();
  cy.byTestId('customerIdInput').type(customerId.toString());
  cy.byTestId('showCustomerButton').click();
  cy.byTestId('customerDetailPanel').should('be.visible');
}

/**
 * Empties the customer number field, and makes sure it stayed empty.
 *
 * Cypress sends every keystroke to whatever is focused at that moment rather than to the element
 * the command started on, and two of this screen's responses move the focus to another field when
 * they arrive (assigning a ticket, deleting one). One landing between `clear()`'s select-all and
 * its delete leaves the old number sitting in the field - which is what the "expected '' but was
 * '100'" failures were - and nothing clears it again afterwards, so asserting emptiness only
 * reports the problem. Re-clearing is what recovers from it.
 */
function clearCustomerId(attemptsLeft = 3) {
  cy.byTestId('customerIdInput').clear();
  cy.byTestId('customerIdInput').then($input => {
    if ($input.val() !== '' && attemptsLeft > 1) {
      clearCustomerId(attemptsLeft - 1);
    }
  });
  cy.byTestId('customerIdInput').should('have.value', '');
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
  cy.visit('/uebersicht');
  cy.byTestId('customers-count').should('have.text', count.toString());
}
