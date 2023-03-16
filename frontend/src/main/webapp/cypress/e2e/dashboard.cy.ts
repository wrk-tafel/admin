describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/');
  });

  it('step through a complete distribution lifecycle', () => {
    // TODO replace by proper ws testing
    cy.wait(2000);

    cy.byTestId('distribution-state-text').should('have.text', 'Inaktiv');

    // create distribution (event) - OPEN
    cy.byTestId('distribution-start-button').click();
    cy.byTestId('distribution-state-text').should('have.text', 'Geöffnet');

    // OPEN --> CHECKIN
    switchToNextStep();
    cy.byTestId('distribution-state-text').should('have.text', 'Anmeldung läuft');

    // validate modal hide
    cy.byTestId('distribution-nextstep-button').click();
    cy.byTestId('distributionstate-next-modal').should('be.visible');
    cy.byTestId('distributionstate-next-modal-cancel-button').click();
    cy.byTestId('distributionstate-next-modal').should('not.be.visible');

    // CHECKIN --> PAUSE
    switchToNextStep();
    cy.byTestId('distribution-state-text').should('have.text', 'Pausiert');

    // PAUSE --> DISTRIBUTION
    switchToNextStep();
    cy.byTestId('distribution-state-text').should('have.text', 'Verteilung läuft');

    // DISTRIBUTION --> CLOSED
    switchToNextStep();
    cy.byTestId('distribution-state-text').should('have.text', 'Inaktiv');
  });

  function switchToNextStep() {
    cy.intercept('/api/distributions/states/next').as('switchToNextStep');

    cy.byTestId('distribution-nextstep-button').click();
    cy.byTestId('distributionstate-next-modal-ok-button').click();

    // TODO replace by proper ws testing
    cy.wait(2000);
  }

});
