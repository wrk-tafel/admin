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
    cy.byTestId('selectable-shelter-row-0').find('input[type="checkbox"]').click({force: true});
    cy.byTestId('selectable-shelter-row-1').find('input[type="checkbox"]').click({force: true});
    cy.byTestId('selectable-shelter-row-2').find('input[type="checkbox"]').click({force: true});
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

  it('statistic and notes fields keep their label visible once a value is entered', () => {
    cy.createDistribution();

    cy.byTestId('distribution-statistics-employee-count-input')
      .find('.mat-mdc-floating-label')
      .should('be.visible')
      .and('contain.text', 'Anzahl der Mitarbeiter');
    cy.byTestId('distribution-statistics-employee-count-input').type('100');
    cy.byTestId('distribution-statistics-employee-count-input')
      .find('.mat-mdc-floating-label')
      .should('be.visible')
      .and('contain.text', 'Anzahl der Mitarbeiter');

    cy.byTestId('distribution-notes-textarea').type('Test note');
    cy.byTestId('distribution-notes-textarea')
      .parents('mat-form-field')
      .find('.mat-mdc-floating-label')
      .should('be.visible')
      .and('contain.text', 'Notizen zur Ausgabe');

    cy.closeDistribution();
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

    // Generating the Kundenliste is one of the GDPR-sensitive reads recorded in the audit trail
    // (issue #3180) - proven here against the real backend, not just a mocked unit test.
    cy.visit('/zugriffsprotokoll');
    cy.byTestId('audit-filter-entityType').click();
    cy.get('mat-option').contains('Kundenliste (Ausgabe)').click();

    cy.byTestId('audit-entry-0-operation').should('contain.text', 'Abgerufen');
    cy.byTestId('audit-entry-0-entityType').should('contain.text', 'Kundenliste (Ausgabe)');
    cy.byTestId('audit-entry-0-businessKey').should('have.text', formattedDate);

    // --> CLOSED
    cy.closeDistribution();
  });

  it('shows how far each route has got, once a driver has started ticking stops off', () => {
    // route 2 from the testdata, with its three stops - completions live per calendar day, so they
    // survive between specs of the same run and have to be cleared first
    [200, 210, 220].forEach(stopId =>
      cy.request('PUT', `/api/routes/2/guidance/stops/${stopId}`, {completed: false})
    );
    cy.createDistribution();
    cy.visit('/');

    // The route guidance screen is optional, so the panel stays away entirely until somebody has
    // actually used it today - a deployment whose drivers don't use it gets no panel of permanent
    // zeroes on a dashboard that has to fit on one screen.
    cy.byTestId('customers-count').should('be.visible');
    cy.byTestId('route-progress-panel').should('not.exist');

    // a driver ticks the first stop off out on the road
    cy.request('PUT', '/api/routes/2/guidance/stops/200', {completed: true});

    // Reloaded rather than waiting for the push: the panel updates live from the dashboard's SSE
    // stream (that stream is what tests 1 and 4 assert, through the distribution state flipping
    // without a reload), but a push that lands while Cypress's proxy is between connections is not
    // replayed, which made this spec fail about half its runs. What is asserted here is the panel's
    // own rule and content, and both survive a reload.
    cy.reload();

    cy.byTestId('route-progress-entry-2').should('contain.text', 'Route 2');
    cy.byTestId('route-progress-count-2').invoke('text').invoke('trim').should('equal', '1 / 3');
    // one segment per stop of the route, the first of them filled
    cy.byTestId('route-progress-segments-2').should('have.attr', 'aria-valuenow', '1')
      .find('span').should('have.length', 3);
    cy.byTestId('route-progress-segments-2').find('span').eq(0).should('have.class', 'bg-green-700');
    cy.byTestId('route-progress-segments-2').find('span').eq(1).should('not.have.class', 'bg-green-700');

    // every route is listed from then on, including the ones still at zero
    cy.byTestId('route-progress-count-3').invoke('text').invoke('trim').should('equal', '0 / 2');

    cy.request('PUT', '/api/routes/2/guidance/stops/200', {completed: false});
    cy.closeDistribution();
  });

  it('renders ticket/food-collection ratios as progress bars and every active route as a status chip', () => {
    cy.createDistribution();
    // one ticket, still unprocessed - a real total with nothing done yet, which is the case a
    // plain truthiness check on the percentage would render as "no bar at all"
    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1});
    cy.visit('/');

    cy.byTestId('tickets-processed-progress').should('have.attr', 'aria-valuenow', '0');
    cy.byTestId('recorded-food-collections-progress').should('have.attr', 'aria-valuenow', '0');

    // every active route from testdata.sql is rendered as a chip, none of them recorded yet -
    // the outstanding ones are the actionable information here, not just the recorded ones.
    cy.byTestId('recorded-route-chip-0').should('contain.text', 'Route 1').and('not.have.class', 'route-chip-recorded');
    cy.byTestId('recorded-route-chip-4').should('contain.text', 'Route 5').and('not.have.class', 'route-chip-recorded');

    cy.closeDistribution();
  });

  it('shows a summary of the last closed distribution and organization-wide counts once none is active', () => {
    cy.createDistribution();
    // household 100 from the testdata has no additional persons, so registered customers/persons match
    cy.addCustomerToDistribution({customerId: 100, ticketNumber: 1});
    cy.closeDistribution();

    cy.visit('/');

    cy.byTestId('distribution-state-text').should('have.text', 'Geschlossen');
    // the day-specific panels have nothing to show anymore, so they're left out entirely
    cy.byTestId('customers-count').should('not.exist');
    cy.byTestId('distribution-statistics-employee-count-input').should('not.exist');
    cy.byTestId('distribution-notes-textarea').should('not.exist');

    cy.byTestId('last-distribution-customers').should('have.text', '1');
    cy.byTestId('last-distribution-persons').should('have.text', '1');
    // the ticket was registered but never processed via the ticket screen
    cy.byTestId('last-distribution-tickets').should('have.text', '0');
    cy.byTestId('last-distribution-food-amount').invoke('text').invoke('trim').should('equal', '0,00 kg');
    // cy.closeDistribution() always selects shelters 1 and 2 (100 + 50 persons) from the testdata
    cy.byTestId('last-distribution-shelters').should('have.text', '2');
    cy.byTestId('last-distribution-shelter-persons').should('have.text', '150');

    // organization-wide counts, filled from the seeded testdata rather than anything this spec set
    // up itself - just asserted as real (positive) numbers rather than pinned exact values, since
    // other specs sharing this database can add/close households of their own. e2etest (loginDefault)
    // holds every permission, so all eight tiles are visible.
    [
      'active-households-count', 'active-persons-count', 'active-users-count', 'active-cars-count',
      'active-shelters-count', 'active-routes-count', 'active-shops-count', 'employees-count'
    ].forEach(testId => {
      cy.byTestId(testId).invoke('text').should('match', /^\d+$/).and('not.equal', '0');
    });
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
