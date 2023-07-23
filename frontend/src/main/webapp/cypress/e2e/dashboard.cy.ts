import * as path from 'path';
import * as moment from 'moment';

describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/');
  });

  it('create and stop distribution', () => {
    cy.byTestId('distribution-state-text').should('have.text', 'Inaktiv');

    // create distribution (event) - OPEN
    cy.byTestId('distribution-start-button').click();
    cy.byTestId('distribution-state-text').should('have.text', 'Geöffnet');

    // --> CLOSED
    cy.byTestId('distribution-nextstep-button').click();
    cy.byTestId('distributionstate-next-modal-ok-button').click();
    cy.byTestId('distribution-state-text').should('have.text', 'Inaktiv');
  });

  it('download customer list', () => {
    cy.byTestId('download-customerlist-button').should('not.exist');

    // create distribution (event) --> OPEN
    cy.byTestId('distribution-start-button').click();

    const downloadCustomerListButton = cy.byTestId('download-customerlist-button');
    downloadCustomerListButton.should('be.visible');
    downloadCustomerListButton.click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const formattedDate = moment().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `kundenliste-ausgabe-${formattedDate}.pdf`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(5000));

    // --> CLOSED
    cy.byTestId('distribution-nextstep-button').click();
    cy.byTestId('distributionstate-next-modal-ok-button').click();
  });

});
