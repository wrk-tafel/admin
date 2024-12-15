import * as path from 'path';
import * as moment from 'moment';

describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/');
  });

  it('create and stop distribution', () => {
    cy.byTestId('distribution-state-text').should('have.text', 'Geschlossen');

    // create distribution (event) - OPEN
    cy.byTestId('distribution-start-button').click();
    cy.byTestId('distribution-state-text').should('have.text', 'Geöffnet');

    // fill statistics
    cy.byTestId('distribution-statistics-employee-count-input').type('100');
    cy.byTestId('distribution-statistics-persons-in-shelter-input').type('200');
    cy.byTestId('distribution-statistics-save-button').click();

    // --> CLOSED
    cy.byTestId('distribution-close-button').click();
    cy.byTestId('distribution-close-modal-ok-button').click();
    cy.byTestId('distribution-state-text').should('have.text', 'Geschlossen');
  });

  it('download customer list', () => {
    cy.byTestId('download-customerlist-button').should('not.exist');
    cy.createDistribution();

    const downloadCustomerListButton = cy.byTestId('download-customerlist-button');
    downloadCustomerListButton.should('be.visible');
    downloadCustomerListButton.click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const formattedDate = moment().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `kundenliste-ausgabe-${formattedDate}.pdf`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(5000));

    // --> CLOSED
    cy.closeDistribution();
  });

});
