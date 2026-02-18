describe('Scanner', () => {

  beforeEach(() => {
    cy.loginDefault();
  });

  it('connection and webcam initialized successfully', () => {
    cy.intercept('POST', '/api/scanners/register').as('registerScanner');
    cy.visit('/#/anmeldung/scanner');

    // Wait for scanner registration API call
    cy.wait('@registerScanner');

    // Wait for camera to be ready (the component sets the state)
    cy.byTestId('state-camera').should('have.class', 'bg-success', {timeout: 10000});
    cy.byTestId('scanner-id').invoke('text').then((text) => {
      expect(Number(text.trim())).to.be.greaterThan(0);
    });
  });

});
