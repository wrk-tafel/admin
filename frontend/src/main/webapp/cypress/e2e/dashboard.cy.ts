import * as path from 'path';
import * as moment from 'moment';

describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/');
  });

  it('create and stop distribution', () => {
    // Ensure no distribution is open from previous tests
    cy.request({
      method: 'POST',
      url: '/api/distributions/statistics',
      body: {employeeCount: 1, selectedShelterIds: []},
      failOnStatusCode: false
    });
    cy.request({
      method: 'POST',
      url: '/api/distributions/close?forceClose=true',
      failOnStatusCode: false
    });
    cy.reload();

    cy.byTestId('distribution-state-text').should('have.text', 'Geschlossen');

    // create distribution (event) - OPEN
    cy.intercept('POST', '/api/distributions/new').as('createDistribution');
    cy.byTestId('distribution-start-button').click();
    cy.wait('@createDistribution');
    // Reload to let SSE initial state reflect the new distribution
    cy.reload();
    cy.byTestId('distribution-state-text').should('have.text', 'Geöffnet');

    // fill employee count
    cy.byTestId('distribution-statistics-employee-count-input').type('100');

    // select shelters to calculate person count
    cy.byTestId('dashboard-select-shelters-button').click();
    cy.byTestId('selectable-shelter-row-0').click();
    cy.byTestId('selectable-shelter-row-1').click();
    cy.byTestId('selectable-shelter-row-2').click();
    cy.byTestId('selectshelters-save-button').click();
    cy.byTestId('distribution-statistics-persons-in-shelter-input').should('have.value', '150');

    cy.intercept('POST', '/api/distributions/statistics').as('saveStatistics');
    cy.byTestId('distribution-statistics-save-button').click();
    cy.wait('@saveStatistics');

    // fill notes
    cy.intercept('POST', '/api/distributions/notes').as('saveNotes');
    cy.byTestId('distribution-notes-textarea').type('Test note - everything went well!');
    cy.byTestId('distribution-notes-save-button').click();
    cy.wait('@saveNotes');

    // check if data is filled after reload
    cy.reload();
    cy.byTestId('distribution-statistics-employee-count-input').should('have.value', '100');
    cy.byTestId('distribution-statistics-persons-in-shelter-input').should('have.value', '150');
    cy.byTestId('distribution-notes-textarea').should('have.value', 'Test note - everything went well!');

    // --> CLOSED
    cy.intercept('POST', '/api/distributions/close*').as('closeDistribution');
    cy.byTestId('distribution-close-button').click();
    cy.byTestId('distribution-close-modal-ok-button').click();
    cy.byTestId('distribution-close-validation-modal-ok-button').click();
    cy.wait('@closeDistribution');
    // Reload to let SSE initial state reflect the closed distribution
    cy.reload();
    cy.byTestId('distribution-state-text').should('have.text', 'Geschlossen');
  });

  it('download customer list', () => {
    // Ensure no distribution is open from previous tests
    cy.request({
      method: 'POST',
      url: '/api/distributions/statistics',
      body: {employeeCount: 1, selectedShelterIds: []},
      failOnStatusCode: false
    });
    cy.request({
      method: 'POST',
      url: '/api/distributions/close?forceClose=true',
      failOnStatusCode: false
    });
    cy.reload();

    cy.byTestId('download-customerlist-button').should('not.exist');

    cy.createDistribution();

    // Reload to pick up the new distribution state via SSE
    cy.reload();
    cy.byTestId('distribution-state-text').should('have.text', 'Geöffnet');
    cy.byTestId('download-customerlist-button').should('be.visible');
    cy.byTestId('download-customerlist-button').click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const formattedDate = moment().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `kundenliste-ausgabe-${formattedDate}.pdf`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(5000));

    // --> CLOSED
    cy.closeDistribution();
  });

});
