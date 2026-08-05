import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('TicketScreen', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('start time set and shown correctly', () => {
    cy.visit('/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('starttime-input').type('12:34');
    cy.byTestId('show-starttime-button').click();

    cy.byTestId('title').should('have.text', 'Startzeit');
    cy.byTestId('text').should('have.text', '12:34');
  });

  it('monitor opened correctly', () => {
    // Stubbed without a fake implementation that redirects the current window: the target URL is
    // now a real path rather than a hash fragment, so setting location.href to it (as this test
    // used to, to simulate "opening" the monitor without a real new tab) triggers a genuine page
    // reload - which wipes the stub before Cypress can assert it was called. Asserting on the call
    // itself is enough; that the target URL actually renders the ticket monitor is already covered
    // by the tests below that visit it directly.
    cy.on('window:before:load', (win) => {
      cy.stub(win, 'open').as('open');
    });

    cy.visit('/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('open-screen-button').click();

    cy.get('@open').should('have.been.calledWith', Cypress.config().baseUrl + 'anmeldung/ticketmonitor', '_blank');
  });

  it('fullscreen kiosk display still loads at phone and tablet sizes', () => {
    // No responsive markup on this page - just a smoke check that it still renders at
    // the smaller viewports rather than exercising its layout in detail.
    for (const viewport of [PHONE_VIEWPORT, TABLET_VIEWPORT]) {
      cy.viewport(viewport);
      cy.visit('/anmeldung/ticketmonitor');
      cy.byTestId('title').should('exist');
      cy.byTestId('text').should('exist');
    }
  });

  it('does not show the disconnected indicator while the SSE connection is up', () => {
    // This fullscreen kiosk display has no header/badge like the rest of the app (see
    // sse.service.spec.ts / ticket-screen.component.ts), so its own indicator must stay hidden
    // on a healthy connection - otherwise it would falsely look "disconnected" all the time.
    cy.visit('/anmeldung/ticketmonitor');
    cy.byTestId('title').should('exist');
    cy.byTestId('connectionState').should('not.exist');
  });

  describe('with distribution and tickets', () => {

    beforeEach(() => {
      createDistributionWithTickets();
      cy.visit('/anmeldung/ticketmonitor-steuerung');
    });

    afterEach(() => {
      cy.closeDistribution();
    });

    it('tickets switched successfully', () => {
      cy.byTestId('show-currentticket-button').click();
      assertTicketText('1');

      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('2');

      cy.byTestId('show-previousticket-button').click();
      assertTicketText('1');
      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('2');

      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('3');

      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('-');
    });

    it('tickets switched by double click', () => {
      cy.byTestId('show-currentticket-button').click();
      assertTicketText('1');

      cy.byTestId('costcontribution-paid-yes-button').dblclick();
      assertTicketText('2');
    });

    it('tickets switched by slow double click', () => {
      cy.byTestId('show-currentticket-button').click();
      assertTicketText('1');

      cy.byTestId('costcontribution-paid-yes-button').click();
      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('3');
    });

    it('tickets switched successfully on phone', () => {
      // Below lg: (1024px) the control form and live-view preview stack into a single
      // column, and below sm: (640px) the paid/not-paid buttons stack too - verify the flow
      // still works fully stacked.
      cy.viewport(PHONE_VIEWPORT);

      cy.byTestId('show-currentticket-button').click();
      assertTicketText('1');

      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('2');
    });

  });

  // Split out from the "with distribution and tickets" block above because marking a ticket "not
  // paid" turns into real pendingCostContribution debt only once the distribution is closed and
  // MissingCostContributionService has processed DistributionEndedEvent asynchronously - the
  // shared afterEach's plain cy.closeDistribution() doesn't wait for that, so cleaning up would
  // race the async accrual. This test closes and waits for the debt itself before resetting it.
  describe('with distribution and tickets - not-paid ticket', () => {

    beforeEach(() => {
      createDistributionWithTickets();
      cy.visit('/anmeldung/ticketmonitor-steuerung');
    });

    it('tickets switched successfully at tablet breakpoint (sm: button row)', () => {
      // At 768px the sidenav is still in mobile ("over") mode and the lg: grid is still
      // single-column, but the sm: paid/not-paid button row is already side-by-side - verify
      // that combination renders and the flow still works.
      cy.viewport(TABLET_VIEWPORT);

      cy.byTestId('show-currentticket-button').click();
      assertTicketText('1');

      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('2');

      cy.byTestId('costcontribution-paid-no-button').click();
      assertTicketText('3');

      cy.closeDistribution();

      // customer 101's ticket was left "not paid" above, so closing the distribution accrues
      // real debt on it once the async post-processor runs - wait for that, then reset it so it
      // doesn't leak into other specs (e.g. customer-search.cy.ts's "search by cost
      // contribution", which counts customers with debt)
      waitForPendingCostContributionThenReset(101);
    });

  });

  // Accruing debt requires closing a distribution (see cy.accrueCostContributionDebt), which would
  // wipe the ticket state the outer describe above already visits the page under - so this runs
  // its own distribution lifecycle: accrue the debt first in a throwaway distribution, then start
  // a fresh one before visiting the control page.
  describe('cost contribution debt of the current ticket holder', () => {

    afterEach(() => {
      cy.closeDistribution();
    });

    it('shows the current ticket-holder\'s debt on page load, without clicking "Aktuelles Ticket"', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id!;
        cy.accrueCostContributionDebt(customerId);

        cy.createDistribution();
        cy.addCustomerToDistribution({customerId, ticketNumber: 1});
        cy.visit('/anmeldung/ticketmonitor-steuerung');

        // deliberately no click on "Aktuelles Ticket" here
        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.be.greaterThan(0);
        });

        cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
      });
    });

    it('pay off the full pending debt at once', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id!;
        cy.accrueCostContributionDebt(customerId);

        cy.createDistribution();
        cy.addCustomerToDistribution({customerId, ticketNumber: 1});
        cy.visit('/anmeldung/ticketmonitor-steuerung');

        cy.byTestId('show-currentticket-button').click();
        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.be.greaterThan(0);
        });

        cy.byTestId('payCostContributionAllButton').click();

        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.equal(0);
        });
        cy.byTestId('payCostContributionAllButton').should('not.exist');
        cy.byTestId('payCostContributionAmountButton').should('not.exist');
        cy.byTestId('editCostContributionButton').should('be.visible');
      });
    });

    it('pay off a specific amount of the pending debt', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id!;
        cy.accrueCostContributionDebt(customerId);

        cy.createDistribution();
        cy.addCustomerToDistribution({customerId, ticketNumber: 1});
        cy.visit('/anmeldung/ticketmonitor-steuerung');

        cy.byTestId('show-currentticket-button').click();
        cy.byTestId('pendingCostContributionText').invoke('text').then(parseCurrencyText).then((initialAmount) => {
          cy.byTestId('payCostContributionAmountButton').click();
          cy.byTestId('pay-cost-contribution-dialog').should('be.visible').within(() => {
            cy.byTestId('amount-input').type('1');
            cy.byTestId('okButton').click();
          });

          cy.byTestId('pendingCostContributionText').should(($el) => {
            expect(parseCurrencyText($el.text())).to.be.closeTo(initialAmount - 1, 0.01);
          });
          cy.byTestId('payCostContributionAllButton').should('be.visible');

          // clear the remainder via the API (rather than another UI round-trip) - other specs
          // (e.g. customer-search.cy.ts's "search by cost contribution") assert on the total
          // count of customers with pending debt, so a dummy customer left with a nonzero
          // balance here would leak into and break that assertion
          cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
        });
      });
    });

    it('edit the pending debt to an arbitrary amount', () => {
      cy.createDummyCustomer().then((response) => {
        const customerId = response.body.data.id!;

        cy.createDistribution();
        cy.addCustomerToDistribution({customerId, ticketNumber: 1});
        cy.visit('/anmeldung/ticketmonitor-steuerung');

        cy.byTestId('show-currentticket-button').click();
        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.equal(0);
        });

        cy.byTestId('editCostContributionButton').click();
        cy.byTestId('edit-cost-contribution-dialog').should('be.visible').within(() => {
          cy.byTestId('amount-input').clear().type('75');
          cy.byTestId('okButton').click();
        });

        cy.byTestId('pendingCostContributionText').should(($el) => {
          expect(parseCurrencyText($el.text())).to.equal(75);
        });

        // reset back to zero via the API - see the note above about customer-search.cy.ts
        cy.request('PUT', `/api/households/${customerId}/cost-contribution`, {amount: 0});
      });
    });

  });

  function createDistributionWithTickets() {
    cy.createDistribution();
    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1});
    cy.addCustomerToDistribution({customerId: 101, ticketNumber: 2});
    cy.addCustomerToDistribution({customerId: 102, ticketNumber: 3});
  }

  // Mirrors cy.accrueCostContributionDebt's own polling (see cypress/support/commands.ts) - the
  // debt only appears once DistributionEndedEvent has been processed asynchronously after the
  // close request returns, so this needs to poll rather than reset immediately.
  function waitForPendingCostContributionThenReset(householdId: number, attemptsLeft = 20): void {
    cy.request('GET', `/api/households/${householdId}`).then((response) => {
      if ((response.body.pendingCostContribution ?? 0) > 0) {
        cy.request('PUT', `/api/households/${householdId}/cost-contribution`, {amount: 0});
        return;
      }
      if (attemptsLeft <= 1) {
        throw new Error(`Timed out waiting for household ${householdId} to accrue cost contribution debt`);
      }
      cy.wait(500);
      waitForPendingCostContributionThenReset(householdId, attemptsLeft - 1);
    });
  }

  function assertTicketText(expected: string) {
    cy.byTestId('text').should('have.text', expected);
  }

  function parseCurrencyText(text: string): number {
    const match = text.replace(/\./g, '').match(/-?\d+,\d+/);
    return match ? parseFloat(match[0].replace(',', '.')) : NaN;
  }

});
