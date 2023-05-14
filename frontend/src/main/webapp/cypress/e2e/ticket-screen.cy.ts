describe('TicketScreen', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('start time set and shown correctly', () => {
    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('starttime-input').type('12:34');
    cy.byTestId('show-starttime-button').click();

    cy.byTestId('title').should('have.text', 'Startzeit');
    cy.byTestId('starttime-text').should('have.text', '12:34');
  });

  it('monitor opened correctly', () => {
    cy.on('window:before:load', (win) => {
      cy.stub(win, 'open', url => {
        win.location.href = url;
      }).as('open');
    });

    cy.visit('/#/anmeldung/ticketmonitor-steuerung');

    cy.byTestId('open-screen-button').click();

    cy.get('@open').should('be.called');
    cy.url().should('eq', Cypress.config().baseUrl + '#/anmeldung/ticketmonitor');
  });

});
