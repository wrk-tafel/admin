import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';
import {Gender} from '../support/commands';

const AUSTRIA = {id: 165, code: 'AT', name: 'Österreich'};

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

  it('persons of the household counted on the dashboard, excluded persons left out', () => {
    // household 101: main person + 3 additional persons, one of them excluded ("Nicht im Haushalt")
    searchCustomer(101);
    cy.byTestId('customerDetailPanel').should('be.visible');

    assignTicket(10);
    assertFormReset();

    assertDashboardCustomerCount(1);
    assertDashboardPersonCount(3);

    cy.visit('/anmeldung/annahme');
    searchCustomer(101);
    cy.byTestId('deleteTicketButton').click();
    cy.get('.toast-message').should('be.visible').should('contain.text', 'Ticket-Nummer gelöscht!');

    assertDashboardPersonCount(0);
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

  it('stacks the header on phone: scanner toolbar above the customer-number input, button beside it', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.visit('/anmeldung/annahme');

    // scanner toolbar renders above the customer-number row
    cy.byTestId('scannerToolbar').then(($toolbar) => {
      cy.byTestId('customerIdInput').then(($input) => {
        expect($toolbar[0].getBoundingClientRect().bottom).to.be.at.most($input[0].getBoundingClientRect().top);
      });
    });
    // the Anzeigen button sits beside the input, not below it
    cy.byTestId('customerIdInput').then(($input) => {
      cy.byTestId('showCustomerButton').then(($button) => {
        const inputRect = $input[0].getBoundingClientRect();
        const buttonRect = $button[0].getBoundingClientRect();
        expect(buttonRect.left).to.be.at.least(inputRect.right);
        expect(buttonRect.top).to.be.below(inputRect.bottom);
      });
    });
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

  it('shows the full-width verdict banner with the decisive validity date', () => {
    cy.createDummyCustomer().then((response) => {
      const customer = response.body.data;

      searchCustomer(customer.id!);

      cy.byTestId('verdictBanner').should('be.visible').should('contain.text', 'GÜLTIG');
      cy.byTestId('verdictDateDetail')
        .should('contain.text', 'bis')
        .should('contain.text', dayjs(customer.validUntil).format('DD.MM.YYYY'));
      cy.byTestId('verdictLockReason').should('not.exist');
    });
  });

  it('shows the lock reason inside the verdict banner for a locked household', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      const lockReason = 'Testgrund-' + randomNumber;

      cy.createCustomer({
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        birthDate: dayjs().subtract(25, 'year').toDate(),
        gender: Gender.MALE,
        country: AUSTRIA,
        validUntil: dayjs().add(1, 'year').toDate(),
        locked: true,
        lockReason,
        address: {
          street: 'street-' + randomNumber,
          houseNumber: '1A',
          city: 'city-' + randomNumber,
          postalCode: 1234
        }
      }).then((response) => {
        searchCustomer(response.body.data.id!);

        cy.byTestId('verdictBanner').should('contain.text', 'GESPERRT');
        cy.byTestId('verdictLockReason').should('be.visible').should('contain.text', lockReason);
        cy.byTestId('assignCustomerButton').should('be.disabled');
      });
    });
  });

  it('shows household size and infants under 3 as big stat chips', () => {
    cy.getAnyRandomNumber().then(randomNumber => {
      cy.createCustomer({
        firstname: 'firstname-' + randomNumber,
        lastname: 'lastname-' + randomNumber,
        birthDate: dayjs().subtract(25, 'year').toDate(),
        gender: Gender.MALE,
        country: AUSTRIA,
        validUntil: dayjs().add(1, 'year').toDate(),
        address: {
          street: 'street-' + randomNumber,
          houseNumber: '1A',
          city: 'city-' + randomNumber,
          postalCode: 1234
        },
        additionalPersons: [
          {
            id: 0,
            key: 0,
            firstname: 'infant-firstname-' + randomNumber,
            lastname: 'infant-lastname-' + randomNumber,
            birthDate: dayjs().subtract(1, 'year').toDate(),
            gender: Gender.FEMALE,
            country: AUSTRIA,
            excludeFromHousehold: false,
            receivesFamilyAllowance: false
          },
          {
            id: 0,
            key: 0,
            firstname: 'child-firstname-' + randomNumber,
            lastname: 'child-lastname-' + randomNumber,
            birthDate: dayjs().subtract(10, 'year').toDate(),
            gender: Gender.MALE,
            country: AUSTRIA,
            excludeFromHousehold: false,
            receivesFamilyAllowance: false
          },
          {
            id: 0,
            key: 0,
            firstname: 'excluded-firstname-' + randomNumber,
            lastname: 'excluded-lastname-' + randomNumber,
            birthDate: dayjs().subtract(30, 'year').toDate(),
            gender: Gender.FEMALE,
            country: AUSTRIA,
            excludeFromHousehold: true,
            receivesFamilyAllowance: false
          }
        ]
      }).then((response) => {
        searchCustomer(response.body.data.id!);

        // the excluded person is listed and marked, but doesn't count towards the household size
        cy.byTestId('householdSizeChip').should('contain.text', '3');
        cy.byTestId('infantCountChip').should('contain.text', '1');

        // identity header and the compact persons list render right away - no tab to open
        cy.byTestId('addressText').should('contain.text', 'street-' + randomNumber);
        cy.byTestId('mainPersonBirthDateAgeText').should('be.visible');
        cy.byTestId('personsPanel')
          .should('contain.text', 'infant-lastname-' + randomNumber)
          .should('contain.text', 'child-lastname-' + randomNumber)
          .should('contain.text', 'excluded-lastname-' + randomNumber);
        cy.byTestId('personsPanel').find('[testid$="-excludeFromHouseholdText"]')
          .should('have.length', 1)
          .should('be.visible').should('contain.text', 'Nicht im Haushalt');
      });
    });
  });

  it('undo the last check-in from the confirmation toast', () => {
    searchCustomer(100);
    assignTicket(10);
    assertFormReset();

    cy.get('.toast-message').should('be.visible').should('contain.text', 'Ticket 10 angenommen');
    cy.byTestId('toast-action-button').should('contain.text', 'Rückgängig').click();

    cy.get('.toast-message').should('be.visible').should('contain.text', 'wurde rückgängig gemacht');
    assertDashboardCustomerCount(0);
  });

  it('undo the last check-in from the persistent "zuletzt angenommen" line', () => {
    searchCustomer(100);
    assignTicket(10);
    assertFormReset();

    cy.byTestId('lastAcceptedCheckin').should('be.visible').should('contain.text', 'Ticket 10');
    cy.byTestId('undoLastCheckinButton').click();

    cy.get('.toast-message').should('be.visible').should('contain.text', 'wurde rückgängig gemacht');
    assertDashboardCustomerCount(0);
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

    it('has no violations with the persistent "zuletzt angenommen" line visible', () => {
      searchCustomer(100);
      assignTicket(10);
      assertFormReset();

      cy.byTestId('lastAcceptedCheckin').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });

  });

});

// Accruing cost contribution debt requires closing a distribution of its own (see
// cy.accrueCostContributionDebt), which would wipe the outer describe's already-active
// distribution - runs its own lifecycle instead, the same way ticket-screen.cy.ts's equivalent
// block does.
describe('CheckIn - pending cost contribution', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('shows the pending cost contribution as a chip inside the verdict banner', () => {
    cy.createDummyCustomer().then((response) => {
      const customerId = response.body.data.id!;
      cy.accrueCostContributionDebt(customerId);

      cy.createDistribution();
      cy.visit('/anmeldung/annahme');
      searchCustomer(customerId);

      cy.byTestId('pendingCostContributionChip').should('be.visible')
        .should('contain.text', 'Unkostenbeitrag offen');
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

function assertDashboardPersonCount(count: number) {
  cy.visit('/uebersicht');
  cy.byTestId('persons-count').should('have.text', count.toString());
}
