describe('CheckIn', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('connection and webcam initialized successfully', () => {
    cy.visit('/#/anmeldung/annahme');

    cy.byTestId('customerIdText').type('100');
    cy.byTestId('showCustomerButton').click();

    cy.byTestId('customerDetailPanel').should('be.visible');
  });

});
