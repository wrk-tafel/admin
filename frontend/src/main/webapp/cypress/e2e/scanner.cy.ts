describe('Scanner', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('connection and webcam initialized successfully', () => {
    cy.visit('/#/anmeldung/scanner');

    // to be safe having the sse-connection established and the webcam ready
    cy.wait(2000);

    cy.byTestId('state-camera').should('have.class', 'bg-success');
    cy.byTestId('scanner-id').should('have.text', '1');
  });

});
