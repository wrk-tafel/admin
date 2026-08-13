import * as path from 'path';
import dayjs from 'dayjs';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Dashboard', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/');
  });

  it('create and stop distribution', () => {
    cy.byTestId('distribution-state-text').should('have.text', 'Keine Verteilung aktiv');
    // "Tag starten"/"Tag beenden" are the two most consequential clicks in the app, so they carry
    // a colour rather than looking like any other raised button.
    cy.byTestId('distribution-start-button').should('have.class', 'button-success');

    // create distribution (event) - OPEN
    cy.byTestId('distribution-start-button').click();
    cy.byTestId('distribution-state-text').should('have.text', 'Geöffnet');
    cy.byTestId('distribution-close-button').should('have.class', 'button-danger');

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
    cy.byTestId('distribution-state-text').should('have.text', 'Keine Verteilung aktiv');
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

  it('shows a big idle state with the day-start action, and hides the all-zero glance panels', () => {
    cy.byTestId('distribution-state-text').should('have.text', 'Keine Verteilung aktiv');
    cy.byTestId('distribution-start-button').should('be.visible');

    // Outside a distribution almost every glance figure would just be a dash, so the whole grid is
    // left out entirely rather than rendered full of them - see dashboard.component.html.
    cy.byTestId('customers-count').should('not.exist');
    cy.byTestId('tickets-processed-count').should('not.exist');
    cy.byTestId('dashboard-input-section-header').should('not.exist');

    cy.byTestId('distribution-start-button').click();

    cy.byTestId('customers-count').should('be.visible');
    // The two data-entry panels get a section header of their own, separating them from the
    // read-only glance panels above.
    cy.byTestId('dashboard-input-section-header').should('contain.text', 'Eingabe');

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
    cy.byTestId('recorded-route-chip-0').should('contain.text', 'Route 1').and('not.have.class', '!bg-green-700');
    cy.byTestId('recorded-route-chip-4').should('contain.text', 'Route 5').and('not.have.class', '!bg-green-700');

    cy.closeDistribution();
  });

  /**
   * The dashboard is read from across the room, so a dropped `/sse/dashboard` stream has to be
   * obvious without anyone walking up to check the small connection badge in the header. This has
   * to be an e2e case: it exercises the real `EventSource` reconnect behaviour in `SseService`,
   * which a unit spec with a mocked `SseService` never runs at all - see logout.cy.ts for the same
   * `EventSource` interception pattern applied to the other SSE stream.
   */
  it('dims the panels and overlays a message when the dashboard stream drops, then recovers', () => {
    cy.createDistribution();

    const streams: EventSource[] = [];
    cy.visit('/', {
      onBeforeLoad(win) {
        const nativeEventSource = win.EventSource;
        win.EventSource = class extends nativeEventSource {
          constructor(url: string | URL, eventSourceInitDict?: EventSourceInit) {
            super(url, eventSourceInitDict);
            streams.push(this);
          }
        };
      }
    });

    cy.byTestId('customers-count').should('be.visible');
    cy.byTestId('dashboard-stale-overlay').should('not.exist');

    const currentDashboardStream = () => {
      // The last captured instance, not the first: `SseService` may already have reconnected by
      // now (a dropped connection leaves its dead instance in `streams`), and its error handler
      // ignores an event when the stream it currently holds is still open.
      const dashboardStreams = streams.filter(
        stream => new URL(stream.url).pathname.endsWith('/api/sse/dashboard')
      );
      return dashboardStreams[dashboardStreams.length - 1];
    };

    // The stream has to have actually OPENED before it is killed: during page load the SSE request
    // can sit queued behind the browser's per-origin connection budget for seconds, and killing a
    // still-connecting stream exercises the initial-connect path - which the overlay deliberately
    // ignores (`hasConnectedEver` exists exactly so the overlay doesn't flash before first connect).
    cy.wrap(null, {timeout: 15000}).should(() => {
      const stream = currentDashboardStream();
      expect(stream, 'a dashboard stream').to.not.eq(undefined);
      expect(stream!.readyState, 'dashboard stream open').to.eq(1);
    });

    cy.then(() => {
      const dashboardStream = currentDashboardStream()!;
      // `EventSource.close()` alone fires no event - `SseService` reacts to `onerror` seeing
      // `readyState === CLOSED`, so both are driven by hand to simulate the drop it would see.
      dashboardStream.close();
      dashboardStream.onerror?.(new Event('error'));
    });

    cy.byTestId('dashboard-stale-overlay').should('be.visible').and('contain.text', 'Live-Verbindung unterbrochen');

    // `SseService` reconnects on its own backoff (1s, then 2s, ...) - the overlay has to clear
    // once the stream is actually back, not just after some fixed delay. The generous timeout is
    // headroom for that backoff plus the reconnect round trip, not a fixed wait.
    cy.byTestId('dashboard-stale-overlay', {timeout: 10000}).should('not.exist');

    cy.closeDistribution();
  });

  it('dashboard content and actions usable on phone', () => {
    // Both grids collapse to a single column below the lg: (1024px) breakpoint - same
    // arrangement as tablet, but still worth verifying the mobile nav chrome doesn't break it.
    cy.viewport(PHONE_VIEWPORT);

    cy.byTestId('distribution-state-text').should('have.text', 'Keine Verteilung aktiv');

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

    cy.byTestId('distribution-state-text').should('have.text', 'Keine Verteilung aktiv');
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
