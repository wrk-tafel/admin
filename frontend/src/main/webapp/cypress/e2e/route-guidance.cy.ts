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
    cy.byTestId('guidance-stops').should('be.visible');
  }

  it('lists the stops of a route in driving order with the shop details', () => {
    selectRoute2();

    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');

    cy.byTestId('guidance-stop-0').should('contain.text', '12:00').should('contain.text', 'Lidl');
    cy.byTestId('guidance-stop-address-0').should('contain.text', 'Kudlichgasse 4, 1130 Wien');
    cy.byTestId('guidance-stop-phone-0').should('have.attr', 'href', 'tel:01 23 45 67 89');
    cy.byTestId('guidance-stop-contact-0').should('contain.text', 'Hr. Mustermann');
    cy.byTestId('guidance-stop-0').should('contain.text', 'Einheit: Kisten');
    // the first open stop is the one the driver is heading for
    cy.byTestId('guidance-stop-0').find('[testid="guidance-next-badge"]').should('be.visible');

    // a stop without a shop stays in the list - it is part of the route
    cy.byTestId('guidance-stop-1').should('contain.text', '12:30').should('contain.text', 'Stopp ohne Filiale');
    cy.byTestId('guidance-stop-description-1').should('contain.text', 'Extra stop at home');
    cy.byTestId('guidance-navigate-button-1').should('not.exist');

    cy.byTestId('guidance-stop-2').should('contain.text', 'Denns BioMarkt').should('contain.text', 'Einheit: Kilogramm');
  });

  it('lists the return boxes the last trip brought back', () => {
    selectRoute2();

    // seeded on the previous distribution's collection for route 2
    cy.byTestId('guidance-return-summary').should('contain.text', 'Retourware mitnehmen');
    cy.byTestId('guidance-stop-return-items-0')
      .should('contain.text', '2 × Bananenkartons')
      .should('contain.text', '4 × Graue Kisten');
    cy.byTestId('guidance-stop-return-items-2').should('contain.text', '3 × Klappkisten schwarz');
    // a zero amount means nothing came back - it must not be listed
    cy.byTestId('guidance-stop-return-items-2').should('not.contain.text', 'Ströck');
    // the pause stop has no shop and therefore nothing to hand back
    cy.byTestId('guidance-stop-return-items-1').should('not.exist');

    // ticking a stop off must not make its return boxes disappear
    cy.byTestId('guidance-toggle-button-0').click();
    cy.byTestId('guidance-completed-label-0').should('be.visible');
    cy.byTestId('guidance-stop-return-items-0').should('contain.text', '4 × Graue Kisten');
  });

  it('offers a map link per stop and one for the rest of the route', () => {
    selectRoute2();

    cy.byTestId('guidance-navigate-button-0')
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

  it('keeps a ticked stop after a reload and lets it be undone', () => {
    selectRoute2();

    cy.byTestId('guidance-toggle-button-0').click();
    // the time comes straight from the tick's own response, so a missing timestamp shows up here
    cy.byTestId('guidance-completed-label-0').invoke('text').invoke('trim')
      .should('match', /^Erledigt um \d{2}:\d{2} von E2E Test$/);
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');
    // the next open stop moves on
    cy.byTestId('guidance-stop-1').find('[testid="guidance-next-badge"]').should('be.visible');
    // and so does the start of the remaining route
    cy.byTestId('guidance-whole-route-button')
      .should('have.attr', 'href')
      .and('not.contain', 'Kudlichgasse');

    cy.reload();
    selectRoute2();
    cy.byTestId('guidance-completed-label-0').should('contain.text', 'Erledigt');
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');

    cy.byTestId('guidance-toggle-button-0').click();
    cy.byTestId('guidance-completed-label-0').should('not.exist');
    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
  });

  it('works on a phone screen', () => {
    cy.viewport(PHONE_VIEWPORT);
    selectRoute2();

    cy.byTestId('guidance-stop-0').should('be.visible');
    cy.byTestId('guidance-toggle-button-0').click();
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');
  });

  describe('accessibility', () => {
    it('has no violations before a route is picked', () => {
      cy.byTestId('routeInput').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations on the stop list of a selected route', () => {
      selectRoute2();
      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations once a stop is ticked off', () => {
      selectRoute2();
      cy.byTestId('guidance-toggle-button-0').click();
      cy.byTestId('guidance-completed-label-0').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });
  });
});
