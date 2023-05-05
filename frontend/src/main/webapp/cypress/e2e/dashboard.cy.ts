describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/');
  });

  it('step through a complete distribution lifecycle', () => {
    // create distribution (event) - OPEN
    cy.byTestId('distribution-start-button').click();
    // OPEN --> CHECKIN
    switchToNextStep();

    cy.byTestId('');

    // CHECKIN --> PAUSE
    switchToNextStep();
    // PAUSE --> DISTRIBUTION
    switchToNextStep();
    // DISTRIBUTION --> CLOSED
    switchToNextStep();
  });

  it('download customer list', () => {
    // create distribution (event) - OPEN
    cy.byTestId('distribution-start-button').click();
    // OPEN --> CHECKIN
    switchToNextStep();

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
    cy.wait(1000);
  }

});
