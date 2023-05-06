import * as path from 'path';
import * as moment from 'moment';

describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/');
  });

  it('step through a complete distribution lifecycle', () => {
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

  it('download customer list', () => {
    cy.byTestId('download-customerlist-button').should('not.exist');

    // create distribution (event) - OPEN
    cy.byTestId('distribution-start-button').click();
    // OPEN --> CHECKIN
    switchToNextStep();

    const downloadCustomerListButton = cy.byTestId('download-customerlist-button');
    downloadCustomerListButton.should('be.visible');
    downloadCustomerListButton.click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const formattedDate = moment().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `kundenliste-ausgabe-${formattedDate}.pdf`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(5000));

    // CHECKIN --> PAUSE
    switchToNextStep();
    // PAUSE --> DISTRIBUTION
    switchToNextStep();
    // DISTRIBUTION --> CLOSED
    switchToNextStep();
  });

  function switchToNextStep() {
    cy.intercept('/api/distributions/states/next').as('switchToNextStep');

    cy.byTestId('distribution-nextstep-button').click();
    cy.byTestId('distributionstate-next-modal-ok-button').click();

    // TODO replace by proper ws testing
    cy.wait(1000);
  }

});
