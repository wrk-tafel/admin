import {PHONE_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

// Route 2 from the testdata: a shop stop, a stop without a shop, and a second shop stop.
const ROUTE_ID = 2;
const STOP_IDS = [200, 210, 220];

describe('Route Guidance', () => {
  beforeEach(() => {
    cy.loginDefault();
    // completions live per calendar day, so they survive between specs of the same run
    STOP_IDS.forEach(stopId =>
      cy.request('PUT', `/api/routes/${ROUTE_ID}/guidance/stops/${stopId}`, {completed: false})
    );
    // deliberately no cy.createDistribution() - the screen has to work outside a distribution
    cy.visit('/logistik/routenbegleitung');
  });

  function selectRoute2() {
    cy.byTestId('routeInput').click();
    cy.get('mat-option').contains('Route 2').click();
    cy.byTestId('guidance-stop').should('be.visible');
  }

  it('shows one stop at a time and pages through the route', () => {
    selectRoute2();

    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 1 von 3');
    cy.byTestId('guidance-stop').should('contain.text', '12:00').should('contain.text', 'Lidl');
    cy.byTestId('guidance-stop-address').should('contain.text', 'Kudlichgasse 4, 1130 Wien');
    cy.byTestId('guidance-stop-phone').should('have.attr', 'href', 'tel:01 23 45 67 89');
    cy.byTestId('guidance-stop-contact').should('contain.text', 'Hr. Mustermann');
    cy.byTestId('guidance-stop').should('contain.text', 'Einheit: Kisten');
    cy.byTestId('guidance-next-badge').should('be.visible');
    // a shop stop offers both: the navigation and a plain tick that opens no map app
    cy.byTestId('guidance-navigate-button').should('be.visible');
    cy.byTestId('guidance-done-button').should('be.visible');
    // nothing before the first stop
    cy.byTestId('guidance-previous-button').should('be.disabled');

    cy.byTestId('guidance-next-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
    cy.byTestId('guidance-stop').should('contain.text', 'Stopp ohne Filiale');
    cy.byTestId('guidance-stop-description').should('contain.text', 'Extra stop at home');
    // a stop with no shop has nowhere to navigate to, so it keeps a button of its own
    cy.byTestId('guidance-navigate-button').should('not.exist');
    cy.byTestId('guidance-done-button').should('be.visible');

    cy.byTestId('guidance-next-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 3 von 3');
    cy.byTestId('guidance-stop').should('contain.text', 'Denns BioMarkt').should('contain.text', 'Kilogramm');
    cy.byTestId('guidance-next-button').should('be.disabled');

    cy.byTestId('guidance-previous-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
  });

  it('marks a stop as done when the navigation is started, without a second tap', () => {
    selectRoute2();

    // the real link opens the map app in a new tab - swallow the navigation so the run stays put,
    // while Angular's own click handler (which records the stop) still fires
    cy.byTestId('guidance-navigate-button').then($link => $link.on('click', e => e.preventDefault()));
    cy.byTestId('guidance-navigate-button').click();

    cy.byTestId('guidance-done-badge').should('be.visible');
    cy.byTestId('guidance-completed-label').invoke('text').invoke('trim')
      .should('match', /^Erledigt um \d{2}:\d{2} von E2E Test$/);
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');

    // it survives a reload and the screen opens on the next stop still to do
    cy.visit('/logistik/routenbegleitung');
    selectRoute2();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');

    // and can be taken back
    cy.byTestId('guidance-previous-button').click();
    cy.byTestId('guidance-undo-button').click();
    cy.byTestId('guidance-done-badge').should('not.exist');
    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
  });

  it('ticks a shop stop off and on again without ever opening the map app', () => {
    selectRoute2();

    cy.byTestId('guidance-done-button').click();
    cy.byTestId('guidance-done-badge').should('be.visible');
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');

    // and back: an undone stop has to be markable again without going through the navigation
    cy.byTestId('guidance-undo-button').click();
    cy.byTestId('guidance-done-badge').should('not.exist');
    cy.byTestId('guidance-done-button').should('be.visible').click();
    cy.byTestId('guidance-done-badge').should('be.visible');
  });

  it('marks a stop without a shop as done explicitly', () => {
    selectRoute2();
    cy.byTestId('guidance-next-button').click();

    cy.byTestId('guidance-done-button').click();

    cy.byTestId('guidance-done-badge').should('be.visible');
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');
  });

  describe('return boxes', () => {
    beforeEach(() => {
      // The screen shows the boxes of route 2's newest collection outside the running distribution,
      // so this spec records that trip itself instead of relying on the seeded one: any earlier
      // spec recording route 2 (food-collection-recording does) leaves a newer collection behind.
      cy.createDistribution();
      cy.request('POST', `/api/food-collections/routes/${ROUTE_ID}/return-items`, {
        returnItems: [
          {shopId: 20, description: 'Graue Kisten', amount: 4},
          {shopId: 20, description: 'Bananenkartons', amount: 2},
          {shopId: 21, description: 'Klappkisten schwarz', amount: 3},
          {shopId: 21, description: 'Ströck Kisten', amount: 0}
        ]
      });
      cy.closeDistribution();
      cy.visit('/logistik/routenbegleitung');
    });

    afterEach(() => {
      // a test that fails before the close above would leave the distribution open for every
      // later spec, so close it again - tolerating the "nothing is running" answer
      cy.request({method: 'POST', url: '/api/distributions/close?forceClose=true', failOnStatusCode: false});
    });

    it('lists the return boxes the last trip brought back', () => {
      selectRoute2();

      cy.byTestId('guidance-return-summary').should('contain.text', 'Retourware mitnehmen');
      cy.byTestId('guidance-stop-return-items')
        .should('contain.text', '2 × Bananenkartons')
        .should('contain.text', '4 × Graue Kisten');

      // the pause stop has no shop and therefore nothing to hand back
      cy.byTestId('guidance-next-button').click();
      cy.byTestId('guidance-stop-return-items').should('not.exist');

      cy.byTestId('guidance-next-button').click();
      cy.byTestId('guidance-stop-return-items').should('contain.text', '3 × Klappkisten schwarz');
      // a zero amount means nothing came back - it must not be listed
      cy.byTestId('guidance-stop-return-items').should('not.contain.text', 'Ströck');
    });
  });

  it('offers a map link per stop and one for the rest of the route', () => {
    selectRoute2();

    cy.byTestId('guidance-navigate-button')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'href')
      .and('contain', 'https://www.google.com/maps/dir/?api=1&destination=')
      .and('contain', 'Kudlichgasse%204%2C%201130%20Wien');

    cy.byTestId('guidance-whole-route-button')
      .should('have.attr', 'href')
      .and('contain', 'destination=Simmeringer%20Hauptstra%C3%9Fe%205%2C%201140%20Wien')
      .and('contain', 'waypoints=Kudlichgasse%204%2C%201130%20Wien');

    // only three stops, so nothing is cut off
    cy.byTestId('guidance-whole-route-truncated').should('not.exist');
  });

  it('works on a phone screen', () => {
    cy.viewport(PHONE_VIEWPORT);
    selectRoute2();

    cy.byTestId('guidance-stop').should('be.visible');
    // the paging buttons sit below the stop card, which fills a phone screen on its own
    cy.byTestId('guidance-next-button').scrollIntoView().should('be.visible').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
  });

  describe('accessibility', () => {
    it('has no violations before a route is picked', () => {
      cy.byTestId('routeInput').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations on the current stop of a selected route', () => {
      selectRoute2();
      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations on a stop that is done', () => {
      selectRoute2();
      cy.byTestId('guidance-next-button').click();
      cy.byTestId('guidance-done-button').click();
      cy.byTestId('guidance-done-badge').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });
  });
});
