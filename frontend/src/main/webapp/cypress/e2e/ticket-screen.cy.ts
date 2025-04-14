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
    cy.byTestId('title').should('have.text', 'Ticketnummer');
    cy.url().should('eq', Cypress.config().baseUrl + '#/anmeldung/ticketmonitor');
  });

  it('tickets switched successfully', () => {
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('title').should('have.text', 'Ticketnummer');
    cy.byTestId('text').should('have.text', '-');

    cy.createDistribution();
    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1});
    cy.addCustomerToDistribution({customerId: 101, ticketNumber: 2});
    cy.addCustomerToDistribution({customerId: 102, ticketNumber: 3});

    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('show-currentticket-button').click();
    cy.byTestId('text').should('have.text', '1');

    cy.byTestId('show-nextticket-button').click();
    cy.byTestId('text').should('have.text', '2');

    cy.byTestId('show-nextticket-button').click();
    cy.byTestId('text').should('have.text', '3');

    cy.byTestId('show-nextticket-button').click();
    cy.byTestId('text').should('have.text', '-');

    cy.closeDistribution();
  });

  it('tickets switched by double click', () => {
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('title').should('have.text', 'Ticketnummer');
    cy.byTestId('text').should('have.text', '-');

    cy.createDistribution();
    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1});
    cy.addCustomerToDistribution({customerId: 101, ticketNumber: 2});
    cy.addCustomerToDistribution({customerId: 102, ticketNumber: 3});

    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('show-currentticket-button').click();
    cy.byTestId('text').should('have.text', '1');

    cy.byTestId('show-nextticket-button').dblclick();
    cy.byTestId('text').should('have.text', '2');

    cy.closeDistribution();
  });

  it('tickets switched by slow double click', () => {
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('title').should('have.text', 'Ticketnummer');
    cy.byTestId('text').should('have.text', '-');

    cy.createDistribution();
    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1});
    cy.addCustomerToDistribution({customerId: 101, ticketNumber: 2});
    cy.addCustomerToDistribution({customerId: 102, ticketNumber: 3});

    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('show-currentticket-button').click();
    cy.byTestId('text').should('have.text', '1');

    cy.byTestId('show-nextticket-button').click();
    cy.byTestId('show-nextticket-button').click();
    cy.byTestId('text').should('have.text', '3');

    cy.closeDistribution();
  });

});
