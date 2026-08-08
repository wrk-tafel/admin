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
    return cy.byTestId('routes-list').contains('mat-expansion-panel', name);
  }

  it('lists routes with their stop summary', () => {
    cy.byTestId('routes-list').should('exist');
    cy.byTestId('routes-row-0').should('contain.text', 'Route 1').and('contain.text', 'Stopps');
    cy.byTestId('routes-summary').should('contain.text', 'aktiv');
  });

  it('shows the stops of a route only once it is expanded', () => {
    cy.byTestId('route-stops-0').should('not.be.visible');

    cy.byTestId('routes-row-0').find('mat-expansion-panel-header').click();

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

      routePanel(name).should('contain.text', 'Inaktiv');
      routePanel(name).find('[testid^="editRouteButton-"]').should('be.disabled');

      cy.byTestId('routes-filter-enabled').click();
      cy.byTestId('routes-list').should('not.contain.text', name);

      cy.byTestId('routes-filter-disabled').click();
      cy.byTestId('routes-list').should('contain.text', name);
    });
  });

  it('filters the list by the search text', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Route suchen ' + randomId;

      createRoute(name, '90.5', ['13:00']);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      cy.byTestId('routes-search-input').type(name);
      cy.byTestId('routes-list').find('mat-expansion-panel').should('have.length', 1);
      cy.byTestId('routes-row-0').should('contain.text', name);

      cy.byTestId('routes-search-clear-button').click();
      cy.byTestId('routes-list').find('mat-expansion-panel').should('have.length.greaterThan', 1);
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
    cy.byTestId('routes-row-0').should('be.visible').find('mat-expansion-panel-header').click();
    cy.byTestId('route-stops-0').should('be.visible').and('contain.text', '14:00');
  });

});
