describe('TicketScreen', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('start time set and shown correctly', () => {
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.byTestId('show-starttime-button').should('be.visible');

    cy.intercept('POST', '/api/distributions/ticket-screen/show-text').as('showText');
    cy.byTestId('starttime-input').type('12:34');
    cy.byTestId('show-starttime-button').click();
    cy.wait('@showText').its('response.statusCode').should('eq', 200);
  });

  it('monitor opened correctly', () => {
    cy.on('window:before:load', (win) => {
      cy.stub(win, 'open').as('open').callsFake(url => {
        win.location.href = url;
      });
    });

    cy.visit('/#/anmeldung/ticketmonitor-steuerung');
    cy.byTestId('open-screen-button').should('be.visible');

    cy.byTestId('open-screen-button').click();

    cy.get('@open').should('be.called');
    cy.byTestId('title').should('have.text', 'Ticketnummer');
    cy.url().should('eq', Cypress.config().baseUrl + '#/anmeldung/ticketmonitor');
  });

  it('tickets switched successfully', () => {
    // Create test customers
    cy.createDummyCustomer().then(customer1 => {
      cy.createDummyCustomer().then(customer2 => {
        cy.createDummyCustomer().then(customer3 => {
          cy.createDistribution();

          cy.addCustomerToDistribution({customerId: customer1.body.id, ticketNumber: 1, costContributionPaid: false});
          cy.addCustomerToDistribution({customerId: customer2.body.id, ticketNumber: 2, costContributionPaid: false});
          cy.addCustomerToDistribution({customerId: customer3.body.id, ticketNumber: 3, costContributionPaid: false});

          // show-current sets the current ticket to ticket 1
          cy.request('POST', '/api/distributions/ticket-screen/show-current');
          // Navigate to ticket monitor - SSE initial state sends current ticket number
          cy.visit('/#/anmeldung/ticketmonitor');
          cy.byTestId('text').should('have.text', '1');

          // show-next advances to ticket 2
          cy.request('POST', '/api/distributions/ticket-screen/show-next');
          cy.visit('/#/anmeldung/ticketmonitor');
          cy.byTestId('text').should('have.text', '2');

          // show-next advances to ticket 3
          cy.request('POST', '/api/distributions/ticket-screen/show-next');
          cy.visit('/#/anmeldung/ticketmonitor');
          cy.byTestId('text').should('have.text', '3');

          // show-next after last ticket shows '-'
          cy.request('POST', '/api/distributions/ticket-screen/show-next');
          cy.visit('/#/anmeldung/ticketmonitor');
          cy.byTestId('text').should('have.text', '-');

          cy.closeDistribution();
        });
      });
    });
  });

  it('tickets switched by double click', () => {
    // Create test customers
    cy.createDummyCustomer().then(customer1 => {
      cy.createDummyCustomer().then(customer2 => {
        cy.createDummyCustomer().then(customer3 => {
          cy.createDistribution();

          cy.addCustomerToDistribution({customerId: customer1.body.id, ticketNumber: 1, costContributionPaid: false});
          cy.addCustomerToDistribution({customerId: customer2.body.id, ticketNumber: 2, costContributionPaid: false});
          cy.addCustomerToDistribution({customerId: customer3.body.id, ticketNumber: 3, costContributionPaid: false});

          cy.visit('/#/anmeldung/ticketmonitor-steuerung');
          cy.byTestId('show-currentticket-button').should('be.visible');

          cy.intercept('POST', '/api/distributions/ticket-screen/show-current').as('showCurrentTicket');
          cy.byTestId('show-currentticket-button').click();
          cy.wait('@showCurrentTicket');

          // Double-click show-next should advance only one ticket (idempotent)
          cy.intercept('POST', '/api/distributions/ticket-screen/show-next').as('showNextTicket');
          cy.byTestId('show-nextticket-button').dblclick();
          cy.wait('@showNextTicket');

          // Verify via fresh SSE connection that current ticket is 2
          cy.visit('/#/anmeldung/ticketmonitor');
          cy.byTestId('text').should('have.text', '2');

          cy.closeDistribution();
        });
      });
    });
  });

  it('tickets switched by slow double click', () => {
    // Create test customers
    cy.createDummyCustomer().then(customer1 => {
      cy.createDummyCustomer().then(customer2 => {
        cy.createDummyCustomer().then(customer3 => {
          cy.createDistribution();

          cy.addCustomerToDistribution({customerId: customer1.body.id, ticketNumber: 1, costContributionPaid: false});
          cy.addCustomerToDistribution({customerId: customer2.body.id, ticketNumber: 2, costContributionPaid: false});
          cy.addCustomerToDistribution({customerId: customer3.body.id, ticketNumber: 3, costContributionPaid: false});

          cy.visit('/#/anmeldung/ticketmonitor-steuerung');
          cy.byTestId('show-currentticket-button').should('be.visible');

          cy.intercept('POST', '/api/distributions/ticket-screen/show-current').as('showCurrentTicket');
          cy.byTestId('show-currentticket-button').click();
          cy.wait('@showCurrentTicket');

          // Two separate clicks (slow double click) - advances ticket twice
          cy.intercept('POST', '/api/distributions/ticket-screen/show-next').as('showNextTicket1');
          cy.byTestId('show-nextticket-button').click();
          cy.wait('@showNextTicket1');

          cy.intercept('POST', '/api/distributions/ticket-screen/show-next').as('showNextTicket2');
          cy.byTestId('show-nextticket-button').click();
          cy.wait('@showNextTicket2');

          // Verify via fresh SSE connection that current ticket is 3
          cy.visit('/#/anmeldung/ticketmonitor');
          cy.byTestId('text').should('have.text', '3');

          cy.closeDistribution();
        });
      });
    });
  });

});
