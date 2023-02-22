describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/');
  });

  it('start and stop distribution', () => {
    cy.byTestId('distribtion-state-text').should('have.text', 'INAKTIV');

    cy.byTestId('distribution-start-button').click();

    cy.byTestId('distribtion-state-text').should('have.text', 'AKTIV');

    cy.byTestId('distribution-stop-button').click();

    cy.byTestId('distribution-stop-modal-cancel-button').click();

    cy.byTestId('distribution-stop-button').click();

    cy.byTestId('distribution-stop-modal-ok-button').click();

    cy.byTestId('distribtion-state-text').should('have.text', 'INAKTIV');
  });

});
