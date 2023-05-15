describe('CheckIn', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.createDistribution();
  });

  afterEach(() => {
    cy.finishDistribution();
  });

  it('customer added and counted on dashboard', () => {
    cy.visit('/#/anmeldung/annahme');

    cy.byTestId('customerIdText').type('100');
    cy.byTestId('showCustomerButton').click();

    cy.byTestId('customerDetailPanel').should('be.visible');

    cy.byTestId('ticketNumberInput').type('10');
    cy.byTestId('assignCustomerButton').click();

    cy.byTestId('customerIdText').should('not.have.text');
    cy.byTestId('errorMessage').should('not.exist');
    cy.byTestId('customerDetailPanel').should('not.exist');

    cy.visit('/#/uebersicht');

    cy.byTestId('customers-count').should('have.text', '1');
  });

});
