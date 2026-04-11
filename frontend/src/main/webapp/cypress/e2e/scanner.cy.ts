describe('Scanner', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.clearLocalStorage('scanner-id');
  });

  it('connection and webcam initialized successfully', () => {
    cy.visit('/#/anmeldung/scanner');

    // Wait for effects to complete and webcam to initialize
    cy.wait(5000);

    // Check that the scanner ID is displayed
    cy.byTestId('scanner-id').should('be.visible').invoke('text').then((text) => {
      expect(text).not.to.be.empty;
      expect(Number(text)).to.be.greaterThan(0);
    });

    // Check that the scanner is ready
    cy.byTestId('state-camera').should('be.visible').invoke('text').then((text) => {
      expect(text).to.equal('Bereit');
    });
  });

});
