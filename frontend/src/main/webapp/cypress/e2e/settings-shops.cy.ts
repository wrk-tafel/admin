import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Shops', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/filialen');
  });

  // The testdata shops are used by the food-collection recording specs, so every test that changes
  // something works on a shop it created itself and finds it by name rather than by row index
  // (shops are ordered by their number).
  function createShop(name: string, number: number, foodUnit: 'Kisten' | 'Kilogramm' = 'Kisten') {
    cy.byTestId('addShopButton').click();
    cy.byTestId('shop-number-input').should('be.visible').type(String(number));
    cy.byTestId('shop-name-input').type(name);
    cy.byTestId('shop-street-input').type('Teststraße 1');
    cy.byTestId('shop-postalcode-input').type('1100');
    cy.byTestId('shop-city-input').type('Wien');
    cy.byTestId('shop-foodunit-select').click();
    cy.get('mat-option').contains(foodUnit).click();
    cy.byTestId('shop-phone-input').type('01 234 56 78');
    cy.byTestId('shop-contactperson-input').type('Fr. Musterfrau');
    cy.byTestId('shop-save-button').click();
  }

  // shops.number is a Postgres integer, so the raw (timestamp-based) random id would overflow it
  function shopNumber(randomId: number) {
    return 90_000 + (randomId % 900_000);
  }

  function shopRow(name: string) {
    return cy.byTestId('shops-table').contains('tr[testid^="shops-row-"]', name);
  }

  it('lists shops', () => {
    cy.byTestId('shops-table').should('exist');
    cy.byTestId('shops-row-0').should('contain.text', 'Billa');
  });

  it('opens the details dialog', () => {
    cy.byTestId('viewShopButton').filterDisplayed().first().click();

    cy.byTestId('shop-details-dialog').should('be.visible')
      .and('contain.text', 'Billa')
      .and('contain.text', 'Kisten');
    cy.byTestId('shop-details-close-button').click();
  });

  it('creates a new shop', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Filiale ' + randomId;

      createShop(name, shopNumber(randomId), 'Kilogramm');

      cy.contains('.toast-message', 'erstellt').should('be.visible');
      shopRow(name).should('contain.text', 'Kilogramm');
    });
  });

  it('rejects a shop number that is already taken', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      // 100 belongs to 'Billa' in the testdata
      createShop('E2E Duplikat ' + randomId, 100);

      cy.contains('.toast-message', 'Filialnummer 100 ist bereits vergeben').should('be.visible');
    });
  });

  it('shows validation errors and does not submit an invalid shop', () => {
    cy.byTestId('addShopButton').click();

    cy.byTestId('shop-name-input').should('be.visible').clear();
    cy.byTestId('shop-save-button').click();

    cy.byTestId('shop-edit-dialog').should('be.visible');
    cy.byTestId('shop-name-input').should('have.class', 'ng-invalid');
    cy.byTestId('shop-cancel-button').click();
  });

  it('edits a shop', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Filiale bearbeiten ' + randomId;
      const newName = name + ' geändert';

      createShop(name, shopNumber(randomId));
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      shopRow(name).find('[testid^="editShopButton-"]').click();
      cy.byTestId('shop-name-input').should('be.visible').clear().type(newName);
      cy.byTestId('shop-save-button').click();

      cy.contains('.toast-message', 'gespeichert').should('be.visible');
      shopRow(newName).should('exist');
    });
  });

  it('toggles shop visibility', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Filiale umschalten ' + randomId;

      createShop(name, shopNumber(randomId));
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      shopRow(name).find('[testid="enableShopButton"]').click();
      cy.contains('.toast-message', 'geändert').should('be.visible');

      shopRow(name).find('[testid="disableShopButton"]').should('exist');
      shopRow(name).find('[testid^="editShopButton-"]').should('be.disabled');
    });
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('shops-table').should('not.be.visible');
    cy.byTestId('shops-cards').should('be.visible').and('contain.text', 'Billa');
    cy.byTestId('addShopButton').should('be.visible');
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('shops-table').should('be.visible');
    cy.byTestId('shops-cards').should('not.be.visible');
    cy.byTestId('addShopButton').should('be.visible');
  });

});
