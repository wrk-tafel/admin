import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Routes', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/routen');
  });

  // The testdata routes are used by the food-collection recording specs, so every test that
  // changes something works on a route it created itself and finds it by name rather than by
  // row index (routes are ordered by their number).
  function createRoute(name: string, number: string, times: string[]) {
    cy.byTestId('addRouteButton').click();
    cy.byTestId('route-number-input').should('be.visible').type(number);
    cy.byTestId('route-name-input').type(name);
    cy.byTestId('route-note-input').type('E2E Notiz');

    times.forEach((time, index) => {
      cy.byTestId('route-stop-add-button').click();
      cy.byTestId('route-stop-time-input-' + index).type(time);
      cy.byTestId('route-stop-shop-select-' + index).click();
      // option 0 is 'Kein Markt', so every stop picks a different shop
      cy.get('mat-option').eq(index + 1).click();
      cy.byTestId('route-stop-description-input-' + index).type('Stopp ' + (index + 1));
    });

    cy.byTestId('route-save-button').click();
  }

  function routeRow(name: string) {
    return cy.byTestId('routes-table').contains('tr[testid^="routes-row-"]', name);
  }

  it('lists routes', () => {
    cy.byTestId('routes-table').should('exist');
    cy.byTestId('routes-row-0').should('contain.text', 'Route 1');
  });

  it('opens the details dialog', () => {
    cy.byTestId('viewRouteButton').filterDisplayed().first().click();

    cy.byTestId('route-details-dialog').should('be.visible')
      .and('contain.text', 'Route 1')
      .and('contain.text', 'Stopps');
    cy.byTestId('route-details-close-button').click();
  });

  it('creates a new route with stops', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Route ' + randomId;

      createRoute(name, '90.1', ['08:00', '08:30']);

      cy.contains('.toast-message', 'erstellt').should('be.visible');
      // 4th column is 'Anz. Stopps'
      routeRow(name).find('td').eq(3).should('have.text', '2');
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

    cy.byTestId('route-edit-dialog').should('be.visible');
    cy.byTestId('route-name-input').should('have.class', 'ng-invalid');
    cy.byTestId('route-cancel-button').click();
  });

  it('edits a route and removes one of its stops', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Route bearbeiten ' + randomId;
      const newName = name + ' geändert';

      createRoute(name, '90.3', ['10:00', '10:30']);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      routeRow(name).find('[testid^="editRouteButton-"]').click();
      cy.byTestId('route-name-input').should('be.visible').clear().type(newName);
      cy.byTestId('route-stop-remove-button-1').click();
      cy.byTestId('route-save-button').click();

      cy.contains('.toast-message', 'gespeichert').should('be.visible');
      routeRow(newName).find('td').eq(3).should('have.text', '1');
    });
  });

  it('toggles route visibility', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Route umschalten ' + randomId;

      createRoute(name, '90.4', ['11:00']);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      routeRow(name).find('[testid="enableRouteButton"]').click();
      cy.contains('.toast-message', 'geändert').should('be.visible');

      routeRow(name).find('[testid="disableRouteButton"]').should('exist');
      routeRow(name).find('[testid^="editRouteButton-"]').should('be.disabled');
    });
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('routes-table').should('not.be.visible');
    cy.byTestId('routes-cards').should('be.visible').and('contain.text', 'Route 1');
    cy.byTestId('addRouteButton').should('be.visible');
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('routes-table').should('be.visible');
    cy.byTestId('routes-cards').should('not.be.visible');
    cy.byTestId('addRouteButton').should('be.visible');
  });

});
