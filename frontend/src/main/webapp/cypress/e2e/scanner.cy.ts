describe('Scanner', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.clearLocalStorage('scanner-id');
  });

  it('connection and webcam initialized successfully', () => {
    cy.visit('/#/anmeldung/scanner');

    // to be safe having the sse-connection established and the webcam ready
    cy.wait(5000);

    cy.byTestId('state-camera').should('have.class', 'bg-success');
    cy.byTestId('scanner-id').invoke('text').then((text) => {
      expect(text).not.to.be.empty;
      expect(Number(text)).to.be.greaterThan(0);
    });
  });

});
