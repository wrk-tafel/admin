import {PHONE_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

// Route 2 from the testdata: a shop stop, a stop without a shop, and a second shop stop.
// Route 3: two shop stops, and the seeded return boxes the screen hands back.
// Route 1: fifteen shop stops - the one route long enough to exercise chunked map links.
const STOP_IDS_BY_ROUTE: Record<number, number[]> = {
  1: Array.from({length: 15}, (_, index) => index + 1),
  2: [200, 210, 220],
  3: [300, 310]
};

const SELECTED_ROUTE_STORAGE_KEY = 'tafel.routeGuidance.selectedRouteId';

describe('Route Guidance', () => {
  beforeEach(() => {
    cy.loginDefault();
    // completions live per calendar day, so they survive between specs of the same run
    Object.entries(STOP_IDS_BY_ROUTE).forEach(([routeId, stopIds]) =>
      stopIds.forEach(stopId =>
        cy.request('PUT', `/api/routes/${routeId}/guidance/stops/${stopId}`, {completed: false})
      )
    );
    // a leftover "remembered route" from another spec would silently preselect on visit and break
    // the assumption every test starts from the picker itself
    cy.window().then(win => win.localStorage.removeItem(SELECTED_ROUTE_STORAGE_KEY));
    // deliberately no cy.createDistribution() - the screen has to work outside a distribution
    cy.visit('/logistik/routen-navi');
  });

  function selectRoute(name: string) {
    cy.byTestId('routeInput').click();
    cy.get('mat-option').contains(name).click();
    cy.byTestId('guidance-stop').should('be.visible');
  }

  function selectRoute2() {
    selectRoute('Route 2');
  }

  function goOffline() {
    cy.window().then(win => win.dispatchEvent(new Event('offline')));
  }

  function goOnline() {
    cy.window().then(win => win.dispatchEvent(new Event('online')));
  }

  it('shows one stop at a time and pages through the route without recording anything', () => {
    selectRoute2();

    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
    cy.byTestId('guidance-progress').should('have.attr', 'aria-valuenow', '0');
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 1 von 3');
    cy.byTestId('guidance-stop').should('contain.text', '12:00').should('contain.text', 'Lidl');
    cy.byTestId('guidance-stop-address').should('contain.text', 'Kudlichgasse 4, 1130 Wien');
    cy.byTestId('guidance-stop-phone').should('have.attr', 'href', 'tel:01 23 45 67 89');
    cy.byTestId('guidance-stop-contact').should('contain.text', 'Hr. Mustermann');
    cy.byTestId('guidance-next-badge').should('be.visible');
    cy.byTestId('guidance-navigate-button').should('be.visible');
    cy.byTestId('guidance-complete-button').should('contain.text', 'Stopp erledigt');
    // the explanation is a tooltip, so the stop itself is the first thing on the screen
    cy.byTestId('guidance-info-tooltip').should('be.visible');
    // nothing before the first stop, and paging never touches completion
    cy.byTestId('guidance-previous-button').should('be.disabled');

    cy.byTestId('guidance-next-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
    cy.byTestId('guidance-stop').should('contain.text', 'Stopp ohne Filiale');
    cy.byTestId('guidance-stop-description').should('contain.text', 'Extra stop at home');
    // a stop with no shop has nowhere to navigate to, and needs no button of its own either
    cy.byTestId('guidance-navigate-button').should('not.exist');
    // paging alone recorded nothing
    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');

    cy.byTestId('guidance-next-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 3 von 3');
    cy.byTestId('guidance-stop').should('contain.text', 'Denns BioMarkt');
    cy.byTestId('guidance-next-button').should('be.disabled');

    cy.byTestId('guidance-previous-button').click();
    cy.byTestId('guidance-previous-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 1 von 3');
    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
  });

  it('completes a stop and advances to the next one; undo is explicit and stays put', () => {
    selectRoute2();

    cy.byTestId('guidance-complete-button').click();
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');
    // ticking a stop off also pages to the one after it
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');

    // paging back to the completed stop shows the tick is still there
    cy.byTestId('guidance-previous-button').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 1 von 3');
    cy.byTestId('guidance-done-badge').should('be.visible');
    cy.byTestId('guidance-completed-label').should('contain.text', 'Erledigt');
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');

    // explicit undo, on the stop actually shown - and it does not page
    cy.byTestId('guidance-undo-button').click();
    cy.byTestId('guidance-done-badge').should('not.exist');
    cy.byTestId('guidance-complete-button').should('be.visible');
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 1 von 3');
    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
  });

  it('keeps a completion over a reload, with who did it and when', () => {
    selectRoute2();

    cy.byTestId('guidance-complete-button').click();
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');
    cy.byTestId('guidance-previous-button').click();
    cy.byTestId('guidance-completed-label').should('contain.text', 'von').and('not.contain.text', 'Ausstehend');

    // the screen remembers the route and re-opens on the next stop still to do, with the tick intact
    cy.visit('/logistik/routen-navi');
    cy.byTestId('guidance-stop').should('be.visible');
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
    cy.byTestId('guidance-summary').should('contain.text', '1 von 3 Stopps erledigt');
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

    cy.byTestId('guidance-return-summary')
      .invoke('text').invoke('replace', /\s+/g, ' ')
      .should('match', /Retourware mitnehmen: \d+ Kisten vom \d{2}\.\d{2}\.\d{4} gehen heute zurück\./);
    cy.byTestId('guidance-stop-return-items')
      .should('contain.text', '2 × Bananenkartons')
      .should('contain.text', '4 × Graue Kisten');

    // completing the first stop of route 3 already pages to its second and last one
    cy.byTestId('guidance-complete-button').click();
    cy.byTestId('guidance-stop-return-items').should('contain.text', '3 × Klappkisten schwarz');
    // a zero amount means nothing came back - it must not be listed
    cy.byTestId('guidance-stop-return-items').should('not.contain.text', 'Ströck');
  });

  it('leaves a stop without a shop out of the return boxes', () => {
    selectRoute2();

    // the pause stop has no shop and therefore nothing to hand back
    cy.byTestId('guidance-next-button').click();
    cy.byTestId('guidance-stop-return-items').should('not.exist');
  });

  it('offers a map link per stop, in Google and Apple Maps, and one for the rest of the route', () => {
    selectRoute2();

    cy.byTestId('guidance-navigate-button')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'href')
      .and('contain', 'https://www.google.com/maps/dir/?api=1&destination=')
      .and('contain', 'Kudlichgasse%204%2C%201130%20Wien');
    cy.byTestId('guidance-navigate-apple-button')
      .should('have.attr', 'target', '_blank')
      .should('have.attr', 'href')
      .and('contain', 'https://maps.apple.com/?daddr=')
      .and('contain', 'Kudlichgasse%204%2C%201130%20Wien');

    cy.byTestId('guidance-whole-route-button')
      .should('have.length', 1)
      .should('contain.text', 'Restliche Route in Karte öffnen')
      .should('have.attr', 'href')
      .and('contain', 'destination=Simmeringer%20Hauptstra%C3%9Fe%205%2C%201140%20Wien')
      .and('contain', 'waypoints=Kudlichgasse%204%2C%201130%20Wien');

    // only three stops, so nothing is chunked
    cy.byTestId('guidance-whole-route-chunked-hint').should('not.exist');
  });

  it('chunks the remaining-route link into groups of ten stops for a route with more than that many open', () => {
    selectRoute('Route 1');

    cy.byTestId('guidance-whole-route-button').should('have.length', 2);
    cy.byTestId('guidance-whole-route-button').eq(0)
      .should('contain.text', 'Stopps 1–10 in Karte öffnen')
      .should('have.attr', 'href')
      .and('contain', 'https://www.google.com/maps/dir/?api=1&destination=');
    cy.byTestId('guidance-whole-route-button').eq(1)
      .should('contain.text', 'Stopps 11–15 in Karte öffnen')
      .should('have.attr', 'href')
      .and('contain', 'https://www.google.com/maps/dir/?api=1&destination=');
    cy.byTestId('guidance-whole-route-chunked-hint').scrollIntoView().should('be.visible');

    // completing stops down to ten or fewer open collapses back to a single, unnumbered link
    for (let i = 0; i < 6; i++) {
      cy.byTestId('guidance-complete-button').click();
    }
    cy.byTestId('guidance-whole-route-button')
      .should('have.length', 1)
      .should('contain.text', 'Restliche Route in Karte öffnen');
    cy.byTestId('guidance-whole-route-chunked-hint').should('not.exist');
  });

  it('gives an overview of every stop as tappable dots, jumping straight to the one tapped', () => {
    selectRoute2();

    cy.byTestId('guidance-stepper-dot').should('have.length', 3);
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 1 von 3');

    cy.byTestId('guidance-stepper-dot').eq(2).click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 3 von 3');
    // jumping via the overview is browsing too - it records nothing
    cy.byTestId('guidance-summary').should('contain.text', '0 von 3 Stopps erledigt');
  });

  it('remembers the selected route for the next visit', () => {
    selectRoute('Route 3');

    cy.visit('/logistik/routen-navi');

    cy.byTestId('routeInput').should('contain.text', 'Route 3');
    cy.byTestId('guidance-stop').should('be.visible');
  });

  it('queues a completion made while offline and syncs it automatically once back online', () => {
    cy.viewport(PHONE_VIEWPORT);
    selectRoute2();

    cy.intercept('PUT', '**/routes/*/guidance/stops/*').as('setCompletion');
    cy.byTestId('guidance-offline-indicator').should('not.exist');

    // ConnectivityService only reacts to the online/offline window events, not a live network
    // cut - dispatching them directly is the standard way to exercise this without relying on
    // browser/OS-level network emulation (see food-collection-recording.cy.ts for the same pattern).
    goOffline();
    cy.byTestId('guidance-offline-indicator').should('contain.text', 'Offline').and('not.contain.text', 'ausstehend');

    cy.byTestId('guidance-complete-button').click();
    // applied to the screen right away and paged past - back to it shows not yet confirmed
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');
    cy.byTestId('guidance-previous-button').click();
    cy.byTestId('guidance-pending-badge').should('be.visible');
    cy.byTestId('guidance-completed-label').should('contain.text', 'Ausstehend');
    cy.byTestId('guidance-offline-indicator').should('contain.text', '1 Änderung ausstehend');
    cy.get('@setCompletion.all').should('have.length', 0);

    goOnline();

    cy.wait('@setCompletion').its('request.body').should('deep.equal', {completed: true});
    cy.byTestId('guidance-pending-badge').should('not.exist');
    cy.byTestId('guidance-done-badge').should('be.visible');
    cy.byTestId('guidance-offline-indicator').should('not.exist');
  });

  it('works on a phone screen', () => {
    cy.viewport(PHONE_VIEWPORT);
    selectRoute2();

    cy.byTestId('guidance-stop').should('be.visible');
    // the completion button is the most prominent control on the screen, fixed to the bottom, and
    // pages on to the next stop once pressed
    cy.byTestId('guidance-complete-button').scrollIntoView().should('be.visible').click();
    cy.byTestId('guidance-stop-position').should('contain.text', 'Stopp 2 von 3');

    cy.byTestId('guidance-previous-button').scrollIntoView().should('be.visible').click();
    cy.byTestId('guidance-done-badge').should('be.visible');
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
      cy.byTestId('guidance-complete-button').click();
      // completing pages to the next stop - page back to check the completed one itself
      cy.byTestId('guidance-previous-button').click();
      cy.byTestId('guidance-done-badge').should('be.visible');

      cy.checkAccessibility(MAIN_CONTENT);
    });
  });
});
