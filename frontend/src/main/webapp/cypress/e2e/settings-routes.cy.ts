import {PHONE_VIEWPORT} from '../support/viewports';

describe('Settings - Routes', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/routen');
  });

  // The testdata routes are used by the food-collection recording specs, so every test that
  // changes something works on a route it created itself and finds it by name rather than by
  // panel index (routes are ordered by their number).
  function createRoute(name: string, number: string, times: string[]) {
    cy.byTestId('addRouteButton').click();
    cy.byTestId('route-number-input').should('be.visible').type(number);
    cy.byTestId('route-name-input').type(name);
    cy.byTestId('route-note-input').type('E2E Notiz');

    times.forEach((time, index) => {
      cy.byTestId('route-stop-add-button').click();
      cy.byTestId('route-stop-time-input-' + index).type(time);
      cy.byTestId('route-stop-shop-select-' + index).click();
      // option 0 is 'Keine Filiale', so every stop picks a different shop
      cy.get('mat-option').eq(index + 1).click();
      cy.byTestId('route-stop-description-input-' + index).type('Stopp ' + (index + 1));
    });

    cy.byTestId('route-save-button').click();
  }

  function routePanel(name: string) {
    return cy.byTestId('routes-list').contains('[testid^="routes-row-"]', name);
  }

  it('lists routes with their stop summary', () => {
    cy.byTestId('routes-list').should('exist');
    cy.byTestId('routes-row-0').should('contain.text', 'Route 1').and('contain.text', 'Stopps');
    cy.byTestId('routes-summary').should('contain.text', 'aktiv');
  });

  it('shows the stops of a route only once it is expanded', () => {
    cy.byTestId('route-stops-0').should('not.be.visible');

    cy.byTestId('routes-row-0').find('[testid^="routes-toggle-"]').click();

    cy.byTestId('route-stops-0').should('be.visible')
      .and('contain.text', '14:00')
      .and('contain.text', 'Billa');
  });

  it('creates a new route with stops', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Route ' + randomId;

      createRoute(name, '90.1', ['08:00', '08:30']);

      cy.contains('.toast-message', 'erstellt').should('be.visible');
      routePanel(name).should('contain.text', '2 Stopps · 08:00 – 08:30');
    });
  });

  it('rejects two stops at the same time', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      createRoute('E2E Route doppelt ' + randomId, '90.2', ['09:00', '09:00']);

      cy.contains('.toast-message', 'nur einen Stopp geben').should('be.visible');
    });
  });

  it('shows validation errors and does not submit an invalid route', () => {
    cy.byTestId('addRouteButton').click();

    cy.byTestId('route-name-input').should('be.visible').clear();
    cy.byTestId('route-save-button').click();

    cy.byTestId('route-edit-dialog').should('be.visible').and('contain.text', 'Pflichtfeld');
    cy.byTestId('route-name-input').should('have.class', 'ng-invalid');
    cy.byTestId('route-cancel-button').click();
  });

  it('shows a live preview of the driven order as stop times are entered out of order', () => {
    cy.byTestId('addRouteButton').click();
    cy.byTestId('route-number-input').should('be.visible').type('90.65');
    cy.byTestId('route-name-input').type('E2E Reihenfolge Vorschau');

    cy.byTestId('route-stop-add-button').click();
    cy.byTestId('route-stop-time-input-0').type('15:00');
    cy.byTestId('route-stop-shop-select-0').click();
    cy.get('mat-option').eq(1).click();

    cy.byTestId('route-stop-order-preview').should('not.exist');

    cy.byTestId('route-stop-add-button').click();
    cy.byTestId('route-stop-time-input-1').type('08:00');
    cy.byTestId('route-stop-shop-select-1').click();
    cy.get('mat-option').eq(2).click();

    // entered as 15:00 then 08:00, previewed as 08:00 then 15:00 - the order the driver gets
    cy.byTestId('route-stop-order-preview').find('li').first().should('contain.text', '08:00');
    cy.byTestId('route-stop-order-preview').find('li').last().should('contain.text', '15:00');

    cy.byTestId('route-cancel-button').click();
  });

  it('warns about a duplicate shop and an unusual time gap without blocking save', () => {
    cy.byTestId('addRouteButton').click();
    cy.byTestId('route-number-input').should('be.visible').type('90.66');
    cy.byTestId('route-name-input').type('E2E Route Warnungen');

    cy.byTestId('route-stop-warnings').should('not.exist');

    cy.byTestId('route-stop-add-button').click();
    cy.byTestId('route-stop-time-input-0').type('08:00');
    cy.byTestId('route-stop-shop-select-0').click();
    cy.get('mat-option').eq(1).click();

    cy.byTestId('route-stop-add-button').click();
    cy.byTestId('route-stop-time-input-1').type('08:01');
    cy.byTestId('route-stop-shop-select-1').click();
    // same shop as stop 0 and only a minute later - both worth a warning
    cy.get('mat-option').eq(1).click();

    cy.byTestId('route-stop-warnings').should('be.visible')
      .and('contain.text', 'ist 2-mal als Stopp eingetragen')
      .and('contain.text', 'ungewöhnlich');

    cy.byTestId('route-cancel-button').click();
  });

  it('edits a route and removes one of its stops', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Route bearbeiten ' + randomId;
      const newName = name + ' geändert';

      createRoute(name, '90.3', ['10:00', '10:30']);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      // the edit button sits in the collapsed header, so editing needs no expanding
      routePanel(name).find('[testid^="editRouteButton-"]').click();
      cy.byTestId('route-edit-dialog').should('be.visible');
      cy.byTestId('route-name-input').should('be.visible').clear().type(newName);
      cy.byTestId('route-stop-remove-button-1').click();
      cy.byTestId('route-save-button').click();

      cy.contains('.toast-message', 'gespeichert').should('be.visible');
      routePanel(newName).should('contain.text', '1 Stopp · 10:00');
    });
  });

  it('deactivates a route and finds it again through the status filter', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Route umschalten ' + randomId;

      createRoute(name, '90.4', ['11:00']);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      // the toggle sits in the collapsed header next to the edit button
      routePanel(name).find('[testid^="routes-enabled-toggle-"]').click();
      cy.contains('.toast-message', 'geändert').should('be.visible');

      routePanel(name).find('[testid^="routes-enabled-toggle-"] button')
        .should('have.attr', 'aria-checked', 'false');
      routePanel(name).find('[testid^="editRouteButton-"]').should('be.disabled');

      cy.byTestId('routes-filter-enabled').click();
      cy.byTestId('routes-list').should('not.contain.text', name);

      cy.byTestId('routes-filter-disabled').click();
      cy.byTestId('routes-list').should('contain.text', name);
    });
  });

  it('filters the list by the search text and shows how many routes matched', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Route suchen ' + randomId;

      createRoute(name, '90.5', ['13:00']);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      cy.byTestId('routes-search-input').type(name);
      cy.byTestId('routes-list').find('[testid^="routes-row-"]').should('have.length', 1);
      cy.byTestId('routes-row-0').should('contain.text', name);
      cy.byTestId('routes-result-count').should('contain.text', '1 von').and('contain.text', 'Routen gefunden');

      cy.byTestId('routes-search-clear-button').click();
      cy.byTestId('routes-list').find('[testid^="routes-row-"]').should('have.length.greaterThan', 1);
      // the count line keeps its space (invisible) so the record cards below never shift
      cy.byTestId('routes-result-count').should('not.be.visible');
    });
  });

  it('sorts the list by number even when names would order the other way round', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const suffix = 'E2E Sortierung ' + randomId;
      const nameWithLowerNumber = 'Zeta ' + suffix;
      const nameWithHigherNumber = 'Alpha ' + suffix;

      // the lower route number sorts first, although its name would sort after the other's
      createRoute(nameWithLowerNumber, '90.61', ['07:00']);
      cy.contains('.toast-message', 'erstellt').should('be.visible');
      createRoute(nameWithHigherNumber, '90.62', ['07:00']);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      cy.byTestId('routes-search-input').type(suffix);
      cy.byTestId('routes-row-0').should('contain.text', nameWithLowerNumber);
      cy.byTestId('routes-row-1').should('contain.text', nameWithHigherNumber);
    });
  });

  it('expands a route on its own when the search matches one of its stops', () => {
    cy.byTestId('route-stops-0').should('not.be.visible');

    // Billa is a stop of testdata Route 1, invisible while its card is collapsed
    cy.byTestId('routes-search-input').type('Billa');

    cy.byTestId('routes-list').find('[testid^="route-stops-"]').first()
      .should('be.visible')
      .and('contain.text', 'Billa');
  });

  it('shows a "Route in Karte öffnen" link covering the route\'s stops', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Route Karte ' + randomId;

      createRoute(name, '90.63', ['08:00', '08:30']);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      routePanel(name).find('[testid^="routes-toggle-"]').click();
      routePanel(name).find('[testid^="route-map-link-"]')
        .should('have.attr', 'href')
        .and('include', 'google.com/maps/dir');
      routePanel(name).find('[testid^="route-map-link-"]').should('have.attr', 'target', '_blank');
    });
  });

  it('removes the stop from the route when its shop is deactivated', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const shopName = 'E2E Filiale inaktiv ' + randomId;
      const shopNumber = 90_000 + (randomId % 900_000);
      const routeName = 'E2E Route Filiale inaktiv ' + randomId;

      cy.visit('/einstellungen/filialen');
      cy.byTestId('addShopButton').click();
      cy.byTestId('shop-number-input').should('be.visible').type(String(shopNumber));
      cy.byTestId('shop-name-input').type(shopName);
      cy.byTestId('shop-street-input').type('Teststraße 1');
      cy.byTestId('shop-postalcode-input').type('1100');
      cy.byTestId('shop-city-input').type('Wien');
      cy.byTestId('shop-foodunit-select').click();
      cy.get('mat-option').contains('Kisten').click();
      cy.byTestId('shop-save-button').click();
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      cy.visit('/einstellungen/routen');
      cy.byTestId('addRouteButton').click();
      cy.byTestId('route-number-input').should('be.visible').type('90.64');
      cy.byTestId('route-name-input').type(routeName);
      cy.byTestId('route-stop-add-button').click();
      cy.byTestId('route-stop-time-input-0').type('06:30');
      cy.byTestId('route-stop-shop-select-0').click();
      cy.get('mat-option').contains(shopName).click();
      cy.byTestId('route-save-button').click();
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      cy.visit('/einstellungen/filialen');
      cy.byTestId('shops-search-input').type(shopName);
      cy.byTestId('shops-row-0').find('[testid^="shops-enabled-toggle-"]').click();
      // the shop is stopped at by an active route, so deactivating asks for confirmation first
      cy.byTestId('shop-disable-confirm-dialog').should('be.visible');
      cy.byTestId('ok-button').click();
      cy.contains('.toast-message', 'geändert').should('be.visible');

      cy.visit('/einstellungen/routen');
      cy.byTestId('routes-search-input').type(routeName);
      cy.byTestId('routes-row-0').find('[testid^="routes-toggle-"]').click();
      cy.byTestId('routes-row-0')
        .should('contain.text', 'Keine Stopps hinterlegt')
        .and('not.contain.text', shopName);
    });
  });

  it('shows an empty state when nothing matches the search', () => {
    cy.byTestId('routes-search-input').type('gibt-es-nicht');

    cy.byTestId('routes-empty').should('be.visible').and('contain.text', 'Keine Route');
  });

  it('stays usable on phone', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('addRouteButton').should('be.visible');
    cy.byTestId('routes-search-input').should('be.visible');
    cy.byTestId('routes-row-0').should('be.visible').find('[testid^="routes-toggle-"]').click();
    cy.byTestId('route-stops-0').should('be.visible').and('contain.text', '14:00');
  });

  // The states below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations while the edit dialog is open, including an added stop', () => {
      cy.byTestId('addRouteButton').click();
      cy.byTestId('route-number-input').should('be.visible');

      cy.checkDialogAccessibility();

      // a stop's own controls are one interaction deeper again
      cy.byTestId('route-stop-add-button').click();
      cy.byTestId('route-stop-time-input-0').should('be.visible');

      cy.checkDialogAccessibility();
    });

    // The warnings box and the order preview only render once two stops share a shop - one
    // interaction deeper again than the plain added-stop case above.
    it('has no violations while the stop warnings and order preview are shown', () => {
      cy.byTestId('addRouteButton').click();
      cy.byTestId('route-stop-add-button').click();
      cy.byTestId('route-stop-time-input-0').type('08:00');
      cy.byTestId('route-stop-shop-select-0').click();
      cy.get('mat-option').eq(1).click();
      cy.byTestId('route-stop-add-button').click();
      cy.byTestId('route-stop-time-input-1').type('08:01');
      cy.byTestId('route-stop-shop-select-1').click();
      cy.get('mat-option').eq(1).click();

      cy.byTestId('route-stop-warnings').should('be.visible');
      cy.checkDialogAccessibility();
    });

    // Scoped to the whole record, header row included: the summary toggle and the two actions
    // beside it are what #3137 restructured, so the assertion has to be able to see them.
    it('has no violations while a panel is expanded', () => {
      cy.byTestId('routes-row-0').find('[testid^="routes-toggle-"]').click();
      cy.byTestId('route-stops-0').should('be.visible');

      cy.checkAccessibility('[testid="routes-row-0"]');
    });

    it('has no violations with a stop\'s shop autocomplete open', () => {
      cy.byTestId('addRouteButton').click();
      cy.byTestId('route-stop-add-button').click();
      cy.byTestId('route-stop-shop-select-0').click();

      cy.checkAutocompleteAccessibility();
    });

  });

});
