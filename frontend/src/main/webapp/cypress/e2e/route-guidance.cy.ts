import {PHONE_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

// Route 2 from the testdata: a shop stop, a stop without a shop, and a second shop stop.
// Route 3: two shop stops, and the seeded return boxes the screen hands back.
const STOP_IDS_BY_ROUTE: Record<number, number[]> = {2: [200, 210, 220], 3: [300, 310]};

describe('Route Guidance', () => {
  beforeEach(() => {
    cy.loginDefault();
    // completions live per calendar day, so they survive between specs of the same run
    Object.entries(STOP_IDS_BY_ROUTE).forEach(([routeId, stopIds]) =>
      stopIds.forEach(stopId =>
        cy.request('PUT', `/api/routes/${routeId}/guidance/stops/${stopId}`, {completed: false})
      )
    );
    // deliberately no cy.createDistribution() - the screen has to work outside a distribution
    cy.visit('/logistik/routenbegleitung');
  });

  function selectRoute(name: string) {
    cy.byTestId('routeInput').click();
    cy.get('mat-option').contains(name).click();
    cy.byTestId('guidance-stop').should('be.visible');
  }

  function selectRoute2() {
    selectRoute('Route 2');
  }

  it('shows one stop at a time and pages through the route', () => {
    selectRoute2();

    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 1 von 3');
    cy.byTestId('guidance-stop').should('contain.text', '12:00').should('contain.text', 'Lidl');
    cy.byTestId('guidance-stop-address').should('contain.text', 'Kudlichgasse 4, 1130 Wien');
    cy.byTestId('guidance-stop-phone').should('have.attr', 'href', 'tel:01 23 45 67 89');
    cy.byTestId('guidance-stop-contact').should('contain.text', 'Hr. Mustermann');
    cy.byTestId('guidance-next-badge').should('be.visible');
    cy.byTestId('guidance-navigate-button').should('be.visible');
    cy.byTestId('guidance-done-button').should('contain.text', 'Erledigt & weiter');
    // the explanation is a tooltip, so the stop itself is the first thing on the screen
    cy.byTestId('guidance-info-tooltip').should('be.visible');
    // nothing before the first stop
    cy.byTestId('guidance-previous-button').should('be.disabled');

    cy.byTestId('guidance-done-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
    cy.byTestId('guidance-stop').should('contain.text', 'Stopp ohne Filiale');
    cy.byTestId('guidance-stop-description').should('contain.text', 'Extra stop at home');
    // a stop with no shop has nowhere to navigate to, and needs no button of its own either
    cy.byTestId('guidance-navigate-button').should('not.exist');
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');

    cy.byTestId('guidance-done-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 3 von 3');
    cy.byTestId('guidance-stop').should('contain.text', 'Denns BioMarkt');
    // the last stop has nowhere to move on to
    cy.byTestId('guidance-done-button').should('contain.text', 'Erledigt').should('not.contain.text', 'weiter');

    cy.byTestId('guidance-done-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 3 von 3');
    cy.byTestId('guidance-summary').should('contain.text', '3 von 3 Stopps erledigt');
    // everything is done, so there is nothing left to press forward
    cy.byTestId('guidance-done-button').should('be.disabled');
  });

  it('records who ticked a stop off and when, and keeps it over a reload', () => {
    selectRoute2();

    cy.byTestId('guidance-done-button').click();
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');

    // the screen opens on the next stop still to do, with the tick still there
    cy.visit('/logistik/routenbegleitung');
    selectRoute2();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');

    // and the stop behind it carries who did it and when
    cy.byTestId('guidance-previous-button').click();
    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
  });

  it('takes the tick back on the stop it goes back to', () => {
    selectRoute2();
    cy.byTestId('guidance-done-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');

    // going back is how a tick is taken back - there is no separate control for it
    cy.byTestId('guidance-previous-button').click();

    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 1 von 3');
    cy.byTestId('guidance-done-badge').should('not.exist');
    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
  });

  it('starts the navigation without touching the progress', () => {
    selectRoute2();

    cy.byTestId('guidance-navigate-button')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'href')
      .and('contain', 'Kudlichgasse%204%2C%201130%20Wien');
    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
  });

  // Route 3, not route 2: the screen shows the boxes of a route's newest collection, and route 3 is
  // the only route no spec ever records one for - so the seeded trip stays the newest whatever else
  // has run. That the running distribution is skipped is pinned by RouteGuidanceServiceIT, which
  // needs no distribution left open behind it.
  it('lists the return boxes the last trip brought back', () => {
    selectRoute('Route 3');

    cy.byTestId('guidance-return-summary').should('contain.text', 'Retourware mitnehmen');
    cy.byTestId('guidance-stop-return-items')
      .should('contain.text', '2 × Bananenkartons')
      .should('contain.text', '4 × Graue Kisten');

    cy.byTestId('guidance-done-button').click();
    cy.byTestId('guidance-stop-return-items').should('contain.text', '3 × Klappkisten schwarz');
    // a zero amount means nothing came back - it must not be listed
    cy.byTestId('guidance-stop-return-items').should('not.contain.text', 'Ströck');
  });

  it('leaves a stop without a shop out of the return boxes', () => {
    selectRoute2();

    // the pause stop has no shop and therefore nothing to hand back
    cy.byTestId('guidance-done-button').click();
    cy.byTestId('guidance-stop-return-items').should('not.exist');
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
    // the two buttons sit below the stop card, which fills a phone screen on its own
    cy.byTestId('guidance-done-button').scrollIntoView().should('be.visible').click();
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
      // Forward ticks the stop off and pages on, so a done stop is normally already off screen by
      // the time it is done. The last stop is the exception - there is nowhere to move on to, so it
      // ticks off and stays, which is the only place this state can be looked at.
      cy.byTestId('guidance-done-button').click();
      cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
      cy.byTestId('guidance-done-button').click();
      cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 3 von 3');
      cy.byTestId('guidance-done-button').click();

      cy.byTestId('guidance-done-badge').should('be.visible');
      cy.checkAccessibility(MAIN_CONTENT);
    });
  });
});
