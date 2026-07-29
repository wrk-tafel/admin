import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('TicketScreen', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('start time set and shown correctly', () => {
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('starttime-input').type('12:34');
    cy.byTestId('show-starttime-button').click();

    cy.byTestId('title').should('have.text', 'Startzeit');
    cy.byTestId('text').should('have.text', '12:34');
  });

  it('monitor opened correctly', () => {
    cy.on('window:before:load', (win) => {
      cy.stub(win, 'open').as('open').callsFake(url => {
        win.location.href = url;
      });
    });

    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('open-screen-button').click();

    cy.get('@open').should('be.called');
    cy.byTestId('title').should('have.text', 'Ticket');
    cy.url().should('eq', Cypress.config().baseUrl + '#/anmeldung/ticketmonitor');
  });

  it('fullscreen kiosk display still loads at phone and tablet sizes', () => {
    // No responsive markup on this page - just a smoke check that it still renders at
    // the smaller viewports rather than exercising its layout in detail.
    for (const viewport of [PHONE_VIEWPORT, TABLET_VIEWPORT]) {
      cy.viewport(viewport);
      cy.visit('/#/anmeldung/ticketmonitor');
      cy.byTestId('title').should('exist');
      cy.byTestId('text').should('exist');
    }
  });

  describe('with distribution and tickets', () => {

    beforeEach(() => {
      createDistributionWithTickets();
      cy.visit('/#/anmeldung/ticketmonitor-steuerung');
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
    });

  });

  function createDistributionWithTickets() {
    cy.createDistribution();
    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1});
    cy.addCustomerToDistribution({customerId: 101, ticketNumber: 2});
    cy.addCustomerToDistribution({customerId: 102, ticketNumber: 3});
  }

  function assertTicketText(expected: string) {
    cy.byTestId('text').should('have.text', expected);
  }

});
