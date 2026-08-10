import * as path from 'path';
import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/');
  });

  it('create and stop distribution', () => {
    cy.byTestId('distribution-state-text').should('have.text', 'Geschlossen');

    // create distribution (event) - OPEN
    cy.byTestId('distribution-start-button').click();
    cy.byTestId('distribution-state-text').should('have.text', 'Geöffnet');

    // fill employee count
    cy.byTestId('distribution-statistics-employee-count-input').type('100');

    // select shelters to calculate person count
    cy.byTestId('dashboard-select-shelters-button').click();
    cy.byTestId('selectable-shelter-row-0').click();
    cy.byTestId('selectable-shelter-row-1').click();
    cy.byTestId('selectable-shelter-row-2').click();
    cy.byTestId('selectshelters-save-button').click();
    cy.byTestId('distribution-statistics-persons-in-shelter-input')
      .find('input')
      .should('have.value', '150');

    cy.byTestId('distribution-statistics-save-button').click();

    // fill notes
    cy.byTestId('distribution-notes-textarea').type('Test note - everything went well!');
    cy.byTestId('distribution-notes-save-button').click();

    // check if data is filled after reload
    cy.reload();
    cy.byTestId('distribution-statistics-employee-count-input')
      .find('input')
      .should('have.value', '100');
    cy.byTestId('distribution-statistics-persons-in-shelter-input')
      .find('input')
      .should('have.value', '150');
    cy.byTestId('distribution-notes-textarea').should('have.value', 'Test note - everything went well!');

    // --> CLOSED
    cy.byTestId('distribution-close-button').click();
    cy.byTestId('distribution-close-dialog-ok-button').click();
    cy.byTestId('distribution-close-validation-dialog-ok-button').click();
    cy.byTestId('distribution-state-text').should('have.text', 'Geschlossen');
  });

  it('download customer list', () => {
    cy.byTestId('download-customerlist-button').should('not.exist');
    cy.createDistribution();

    const downloadCustomerListButton = cy.byTestId('download-customerlist-button');
    downloadCustomerListButton.should('be.visible');
    downloadCustomerListButton.click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const formattedDate = dayjs().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `kundenliste-ausgabe-${formattedDate}.pdf`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(5000));

    // --> CLOSED
    cy.closeDistribution();
  });

  it('shows how far each route has got, and follows the drivers along', () => {
    // route 2 from the testdata, with its three stops - completions live per calendar day, so they
    // survive between specs of the same run and have to be cleared first
    [200, 210, 220].forEach(stopId =>
      cy.request('PUT', `/api/routes/2/guidance/stops/${stopId}`, {completed: false})
    );
    cy.createDistribution();
    cy.visit('/');

    cy.byTestId('route-progress-entry-2').should('contain.text', 'Route 2');
    cy.byTestId('route-progress-count-2').invoke('text').invoke('trim').should('equal', '0 / 3');

    // a driver ticks the first stop off out on the road
    cy.request('PUT', '/api/routes/2/guidance/stops/200', {completed: true});

    // the dashboard follows without a reload - the completion wakes its SSE stream
    cy.byTestId('route-progress-count-2').invoke('text').invoke('trim').should('equal', '1 / 3');

    cy.request('PUT', '/api/routes/2/guidance/stops/200', {completed: false});
    cy.closeDistribution();
  });

  it('dashboard content and actions usable on phone', () => {
    // Both grids collapse to a single column below the lg: (1024px) breakpoint - same
    // arrangement as tablet, but still worth verifying the mobile nav chrome doesn't break it.
    cy.viewport(PHONE_VIEWPORT);

    cy.byTestId('distribution-state-text').should('have.text', 'Geschlossen');

    cy.byTestId('distribution-start-button').click();
    cy.byTestId('distribution-state-text').should('have.text', 'Geöffnet');

    cy.byTestId('distribution-statistics-employee-count-input').type('100');
    cy.byTestId('distribution-statistics-save-button').click();

    cy.byTestId('distribution-notes-textarea').type('Test note - everything went well!');
    cy.byTestId('distribution-notes-save-button').click();

    // check if data is filled after reload
    cy.reload();
    cy.byTestId('distribution-statistics-employee-count-input')
      .find('input')
      .should('have.value', '100');
    cy.byTestId('distribution-notes-textarea').should('have.value', 'Test note - everything went well!');

    cy.closeDistribution();
  });

  it('dashboard content renders and download works at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);

    cy.byTestId('distribution-state-text').should('have.text', 'Geschlossen');
    cy.byTestId('download-customerlist-button').should('not.exist');

    cy.createDistribution();

    const downloadCustomerListButton = cy.byTestId('download-customerlist-button');
    downloadCustomerListButton.should('be.visible');
    downloadCustomerListButton.click();

    const downloadsFolder = Cypress.config('downloadsFolder');
    const formattedDate = dayjs().format('DD.MM.YYYY');
    const downloadedFilename = path.join(downloadsFolder, `kundenliste-ausgabe-${formattedDate}.pdf`);

    cy.readFile(downloadedFilename, 'binary', {timeout: 15000})
      .should((buffer: string | any[]) => expect(buffer.length).to.be.gt(5000));

    cy.closeDistribution();
  });

  // The dialogs below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    afterEach(() => {
      cy.closeDistribution();
    });

    it('has no violations in the shelter selection dialog', () => {
      cy.createDistribution();
      cy.reload();

      cy.byTestId('dashboard-select-shelters-button').click();
      cy.byTestId('selectable-shelter-row-0').should('be.visible');

      cy.checkDialogAccessibility();
    });

    it('has no violations in the two dialogs that close the distribution', () => {
      cy.createDistribution();
      cy.reload();

      cy.byTestId('distribution-close-button').click();
      cy.checkDialogAccessibility();

      // No statistics were entered for this distribution, so the close is refused with an error
      // rather than a warning - and "Trotzdem beenden", which only an overridable warning offers,
      // is not rendered. Cancel is the button this dialog always has.
      cy.byTestId('distribution-close-dialog-ok-button').click();
      cy.byTestId('distribution-close-validation-dialog-cancel-button').should('be.visible');
      cy.checkDialogAccessibility();
    });

  });

});
