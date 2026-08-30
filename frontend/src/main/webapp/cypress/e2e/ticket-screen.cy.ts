import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('TicketScreen', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('start time set and shown correctly', () => {
    cy.visit('/anmeldung/ticketmonitor-steuerung');

    // The start-time field only appears once that segment of "Monitor zeigt" is picked - see the
    // segmented control test below for the full switching behavior.
    cy.byTestId('show-starttime-toggle').click();
    cy.byTestId('starttime-input').type('12:34');
    cy.byTestId('show-starttime-button').click();

    cy.byTestId('title').should('have.text', 'Startzeit');
    cy.byTestId('text').should('have.text', '12:34');
  });

  it('a start time set before the monitor is opened is what a fresh monitor connection shows', () => {
    cy.visit('/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('show-starttime-toggle').click();
    // Enter in the field triggers the form's implicit submission (the same handler as the
    // "Anzeigen" submit button) - Cypress cannot send extra keystrokes into an <input type="time">,
    // so submit the form directly instead.
    cy.byTestId('starttime-input').type('11:30');
    cy.byTestId('starttime-input').parents('form').submit();
    cy.byTestId('title').should('have.text', 'Startzeit');

    // A monitor opened only now - a brand-new SSE connection - must replay that start time as its
    // initial state instead of synthesizing the current ticket (which nobody put on the screen).
    cy.visit('/anmeldung/ticketmonitor');
    cy.byTestId('title').should('have.text', 'Startzeit');
    cy.byTestId('text').should('have.text', '11:30');

    // Re-opening the control page must not hijack the monitor either: its on-load fetch of the
    // current ticket (for the ticket card and cost-contribution panel) is a read, not a broadcast,
    // so the live preview still shows the start time.
    cy.visit('/anmeldung/ticketmonitor-steuerung');
    cy.byTestId('title').should('have.text', 'Startzeit');
    cy.byTestId('text').should('have.text', '11:30');
  });

  it('"Monitor zeigt" segmented control mirrors the monitor\'s current mode', () => {
    createDistributionWithTickets();
    cy.visit('/anmeldung/ticketmonitor-steuerung');

    // Defaults to "Aktuelles Ticket" - the ticket already fetched automatically on load.
    cy.byTestId('show-currentticket-button').should('have.class', 'mat-button-toggle-checked');
    cy.byTestId('starttime-input').should('not.exist');

    cy.byTestId('show-starttime-toggle').click();
    cy.byTestId('show-starttime-toggle').should('have.class', 'mat-button-toggle-checked');
    cy.byTestId('starttime-input').should('be.visible');

    // Advancing the loop (not touching the segmented control) switches it back to "Aktuelles Ticket".
    cy.byTestId('costcontribution-paid-yes-button').click();
    cy.byTestId('show-currentticket-button').should('have.class', 'mat-button-toggle-checked');

    // Going back through the queue is not a display mode: the reopened ticket is the current one
    // again, so the segmented control stays on "Aktuelles Ticket".
    cy.byTestId('show-starttime-toggle').click();
    cy.byTestId('show-previousticket-button').click();
    cy.byTestId('show-currentticket-button').should('have.class', 'mat-button-toggle-checked');
    cy.byTestId('starttime-input').should('not.exist');

    cy.closeDistribution();
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

  it('offers a one-click fullscreen entry that fades out once used', () => {
    cy.visit('/anmeldung/ticketmonitor');

    cy.byTestId('fullscreen-button').should('be.visible').click();

    // jsdom/Cypress can't grant a real fullscreen context, so the Fullscreen API call itself
    // rejects here - what matters for this test is that the button still reacts to being clicked
    // at all. Actually entering fullscreen needs manual verification (see #3216).
    cy.byTestId('fullscreen-button').should('exist');
  });

  it('shows a large, centered disconnected state and recovers automatically once the stream comes back', () => {
    // Overriding EventSource (same technique as logout.cy.ts) to simulate a dropped connection
    // right after the initial ticket-screen state has been received. Calling the real close()
    // gives a genuine CLOSED readyState (rather than faking the getter), and dispatching 'error'
    // afterwards is what tells SseService the drop was permanent (see sse.service.ts's onerror) -
    // the service then reconnects on its own backoff, and the real backend resends the current
    // state on every fresh connection, so the display should recover without any user interaction.
    let dropped = false;
    cy.visit('/anmeldung/ticketmonitor', {
      onBeforeLoad(win) {
        const nativeEventSource = win.EventSource;
        win.EventSource = class extends nativeEventSource {
          constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
            super(url, eventSourceInitDict);
            this.addEventListener('message', () => {
              if (dropped) {
                return;
              }
              dropped = true;
              setTimeout(() => {
                this.close();
                this.dispatchEvent(new Event('error'));
              }, 50);
            });
          }
        };
      }
    });

    cy.byTestId('connectionState').should('be.visible').and('contain.text', 'Verbindung getrennt');
    cy.byTestId('lastUpdateText').should('be.visible');

    // The reconnect backoff starts at 1s (see sse.service.ts) - give it comfortable room to
    // reconnect and receive the resent initial state again.
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

      // Nothing processed yet and nothing reopened yet - both arrows have nowhere to go.
      cy.byTestId('show-previousticket-button').should('be.disabled');
      cy.byTestId('show-forwardticket-button').should('be.disabled');

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

    it('the forward arrow only re-advances over tickets the back arrow reopened', () => {
      cy.byTestId('show-currentticket-button').click();
      assertTicketText('1');

      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('2');
      cy.byTestId('show-forwardticket-button').should('be.disabled');

      cy.byTestId('show-previousticket-button').click();
      assertTicketText('1');

      // Forward re-closes the reopened ticket with the decision it was originally processed
      // with - no new paid/unpaid choice - and disarms itself again at the front of the queue.
      cy.byTestId('show-forwardticket-button').click();
      assertTicketText('2');
      cy.byTestId('show-forwardticket-button').should('be.disabled');
    });

    it('shows the previously called ticket number once the ticket advances', () => {
      cy.byTestId('show-currentticket-button').click();
      assertTicketText('1');
      cy.byTestId('previousTicket').should('not.exist');

      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('2');
      cy.byTestId('previousTicket').should('have.text', 'Zuvor: 1');

      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('3');
      cy.byTestId('previousTicket').should('have.text', 'Zuvor: 2');
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

    it('shows queue context (processed/remaining) next to the current ticket', () => {
      cy.byTestId('show-currentticket-button').click();
      cy.byTestId('ticket-queue-context').should('contain.text', '0 / 3').and('contain.text', '3');

      cy.byTestId('costcontribution-paid-yes-button').click();
      cy.byTestId('ticket-queue-context').should('contain.text', '1 / 3').and('contain.text', '2');
    });

    it('advances the ticket via keyboard shortcuts (Enter = bezahlt, N = nicht bezahlt)', () => {
      cy.byTestId('show-currentticket-button').click();
      assertTicketText('1');

      cy.get('body').type('{enter}');
      assertTicketText('2');

      cy.get('body').type('n');
      assertTicketText('3');
    });

    // Regression test for #3563: Enter on a focused button used to be hijacked as the "Weiter
    // (bezahlt)" shortcut instead of activating that button, so tabbing to e.g. "Ticket zurück"
    // and pressing Enter closed the current ticket as paid and skipped ahead instead of going back.
    it('Enter on a focused button activates that button instead of the "Weiter (bezahlt)" shortcut', () => {
      cy.byTestId('show-currentticket-button').click();
      assertTicketText('1');

      cy.byTestId('costcontribution-paid-yes-button').click();
      assertTicketText('2');

      cy.byTestId('show-previousticket-button').focus().type('{enter}');
      assertTicketText('1');
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
        cy.byTestId('edit-cost-contribution-dialog').should('be.visible');
        // the dialog exists only after this click, so no other accessibility gate sees it -
        // see cypress/support/accessibility.ts
        cy.checkDialogAccessibility();

        cy.byTestId('edit-cost-contribution-dialog').within(() => {
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
