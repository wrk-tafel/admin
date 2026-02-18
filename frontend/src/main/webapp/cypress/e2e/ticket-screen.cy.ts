describe('TicketScreen', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('start time set and shown correctly', () => {
    cy.intercept('GET', '/api/sse/distributions/ticket-screen/current').as('ticketScreenSSE');
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.wait('@ticketScreenSSE');

    cy.intercept('POST', '/api/distributions/ticket-screen/text').as('showText');
    cy.byTestId('starttime-input').type('12:34');
    cy.byTestId('show-starttime-button').click();
    cy.wait('@showText');

    cy.byTestId('title').should('have.text', 'Startzeit');
    cy.byTestId('text').should('have.text', '12:34');
  });

  it('monitor opened correctly', () => {
    cy.on('window:before:load', (win) => {
      cy.stub(win, 'open').as('open').callsFake(url => {
        win.location.href = url;
      });
    });

    cy.intercept('GET', '/api/sse/distributions/ticket-screen/current').as('ticketScreenSSE');
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.wait('@ticketScreenSSE');

    cy.byTestId('open-screen-button').click();

    cy.get('@open').should('be.called');
    cy.byTestId('title').should('have.text', 'Ticketnummer');
    cy.url().should('eq', Cypress.config().baseUrl + '#/anmeldung/ticketmonitor');
  });

  it('tickets switched successfully', () => {
    cy.intercept('GET', '/api/sse/distributions/ticket-screen/current').as('ticketScreenSSE');
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.wait('@ticketScreenSSE');

    cy.byTestId('title').should('have.text', 'Ticketnummer');
    cy.byTestId('text').should('have.text', '-');

    // Ensure no distribution is open from previous tests
    cy.request({
      method: 'POST',
      url: '/api/distributions/close?forceClose=true',
      failOnStatusCode: false
    });

    cy.intercept('POST', '/api/distributions/new').as('createDistribution');
    cy.createDistribution();
    cy.wait('@createDistribution');

    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1, costContributionPaid: false});
    cy.addCustomerToDistribution({customerId: 101, ticketNumber: 2, costContributionPaid: false});
    cy.addCustomerToDistribution({customerId: 102, ticketNumber: 3, costContributionPaid: false});

    cy.intercept('GET', '/api/sse/distributions/ticket-screen/current').as('ticketScreenSSEReload');
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.wait('@ticketScreenSSEReload');

    cy.intercept('POST', '/api/distributions/ticket-screen/current-ticket').as('showCurrentTicket');
    cy.byTestId('show-currentticket-button').click();
    cy.wait('@showCurrentTicket');
    cy.byTestId('text').should('have.text', '1');

    cy.intercept('POST', '/api/distributions/ticket-screen/next-ticket').as('showNextTicket1');
    cy.byTestId('show-nextticket-button').click();
    cy.wait('@showNextTicket1');
    cy.byTestId('text').should('have.text', '2');

    cy.intercept('POST', '/api/distributions/ticket-screen/next-ticket').as('showNextTicket2');
    cy.byTestId('show-nextticket-button').click();
    cy.wait('@showNextTicket2');
    cy.byTestId('text').should('have.text', '3');

    cy.intercept('POST', '/api/distributions/ticket-screen/next-ticket').as('showNextTicket3');
    cy.byTestId('show-nextticket-button').click();
    cy.wait('@showNextTicket3');
    cy.byTestId('text').should('have.text', '-');

    cy.closeDistribution();
  });

  it('tickets switched by double click', () => {
    cy.intercept('GET', '/api/sse/distributions/ticket-screen/current').as('ticketScreenSSE');
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.wait('@ticketScreenSSE');

    cy.byTestId('title').should('have.text', 'Ticketnummer');
    cy.byTestId('text').should('have.text', '-');

    // Ensure no distribution is open from previous tests
    cy.request({
      method: 'POST',
      url: '/api/distributions/close?forceClose=true',
      failOnStatusCode: false
    });

    cy.intercept('POST', '/api/distributions/new').as('createDistribution');
    cy.createDistribution();
    cy.wait('@createDistribution');

    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1, costContributionPaid: false});
    cy.addCustomerToDistribution({customerId: 101, ticketNumber: 2, costContributionPaid: false});
    cy.addCustomerToDistribution({customerId: 102, ticketNumber: 3, costContributionPaid: false});

    cy.intercept('GET', '/api/sse/distributions/ticket-screen/current').as('ticketScreenSSEReload');
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.wait('@ticketScreenSSEReload');

    cy.intercept('POST', '/api/distributions/ticket-screen/current-ticket').as('showCurrentTicket');
    cy.byTestId('show-currentticket-button').click();
    cy.wait('@showCurrentTicket');
    cy.byTestId('text').should('have.text', '1');

    cy.intercept('POST', '/api/distributions/ticket-screen/next-ticket').as('showNextTicket');
    cy.byTestId('show-nextticket-button').dblclick();
    cy.wait('@showNextTicket');
    cy.byTestId('text').should('have.text', '2');

    cy.closeDistribution();
  });

  it('tickets switched by slow double click', () => {
    cy.intercept('GET', '/api/sse/distributions/ticket-screen/current').as('ticketScreenSSE');
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.wait('@ticketScreenSSE');

    cy.byTestId('title').should('have.text', 'Ticketnummer');
    cy.byTestId('text').should('have.text', '-');

    // Ensure no distribution is open from previous tests
    cy.request({
      method: 'POST',
      url: '/api/distributions/close?forceClose=true',
      failOnStatusCode: false
    });

    cy.intercept('POST', '/api/distributions/new').as('createDistribution');
    cy.createDistribution();
    cy.wait('@createDistribution');

    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1, costContributionPaid: false});
    cy.addCustomerToDistribution({customerId: 101, ticketNumber: 2, costContributionPaid: false});
    cy.addCustomerToDistribution({customerId: 102, ticketNumber: 3, costContributionPaid: false});

    cy.intercept('GET', '/api/sse/distributions/ticket-screen/current').as('ticketScreenSSEReload');
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.wait('@ticketScreenSSEReload');

    cy.intercept('POST', '/api/distributions/ticket-screen/current-ticket').as('showCurrentTicket');
    cy.byTestId('show-currentticket-button').click();
    cy.wait('@showCurrentTicket');
    cy.byTestId('text').should('have.text', '1');

    cy.intercept('POST', '/api/distributions/ticket-screen/next-ticket').as('showNextTicket1');
    cy.byTestId('show-nextticket-button').click();
    cy.wait('@showNextTicket1');

    cy.intercept('POST', '/api/distributions/ticket-screen/next-ticket').as('showNextTicket2');
    cy.byTestId('show-nextticket-button').click();
    cy.wait('@showNextTicket2');
    cy.byTestId('text').should('have.text', '3');

    cy.closeDistribution();
  });

});
