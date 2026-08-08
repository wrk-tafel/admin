import {PHONE_VIEWPORT} from '../support/viewports';

describe('Settings - Shops', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/filialen');
  });

  // The testdata shops are used by the food-collection recording specs, so every test that changes
  // something works on a shop it created itself and finds it by name rather than by panel index
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

  function shopPanel(name: string) {
    return cy.byTestId('shops-list').contains('mat-expansion-panel', name);
  }

  it('lists shops with their address and unit', () => {
    cy.byTestId('shops-list').should('exist');
    cy.byTestId('shops-row-0').should('contain.text', 'Billa').and('contain.text', 'Kisten');
    cy.byTestId('shops-summary').should('contain.text', 'aktiv');
  });

  it('shows the contact details of a shop only once it is expanded', () => {
    cy.byTestId('shop-details-0').should('not.be.visible');

    cy.byTestId('shops-row-0').find('mat-expansion-panel-header').click();

    cy.byTestId('shop-details-0').should('be.visible')
      .and('contain.text', 'Fr. Musterfrau')
      .and('contain.text', 'Bloch-Bauer-Promenade 1');
  });

  it('creates a new shop', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Filiale ' + randomId;

      createShop(name, shopNumber(randomId), 'Kilogramm');

      cy.contains('.toast-message', 'erstellt').should('be.visible');
      shopPanel(name).should('contain.text', 'Kilogramm');
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

    cy.byTestId('shop-edit-dialog').should('be.visible').and('contain.text', 'Pflichtfeld');
    cy.byTestId('shop-name-input').should('have.class', 'ng-invalid');
    cy.byTestId('shop-cancel-button').click();
  });

  it('edits a shop', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Filiale bearbeiten ' + randomId;
      const newName = name + ' geändert';

      createShop(name, shopNumber(randomId));
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      // the edit button sits in the collapsed header, so editing needs no expanding
      shopPanel(name).find('[testid^="editShopButton-"]').click();
      cy.byTestId('shop-edit-dialog').should('be.visible');
      cy.byTestId('shop-name-input').should('be.visible').clear().type(newName);
      cy.byTestId('shop-save-button').click();

      cy.contains('.toast-message', 'gespeichert').should('be.visible');
      shopPanel(newName).should('exist');
    });
  });

  it('deactivates a shop and finds it again through the status filter', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Filiale umschalten ' + randomId;

      createShop(name, shopNumber(randomId));
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      // the toggle sits in the collapsed header next to the edit button
      shopPanel(name).find('[testid^="shops-enabled-toggle-"]').click();
      cy.contains('.toast-message', 'geändert').should('be.visible');

      shopPanel(name).should('contain.text', 'Inaktiv');
      shopPanel(name).find('[testid^="editShopButton-"]').should('be.disabled');

      cy.byTestId('shops-filter-enabled').click();
      cy.byTestId('shops-list').should('not.contain.text', name);

      cy.byTestId('shops-filter-disabled').click();
      cy.byTestId('shops-list').should('contain.text', name);
    });
  });

  it('filters the list by the search text', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Filiale suchen ' + randomId;

      createShop(name, shopNumber(randomId));
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      cy.byTestId('shops-search-input').type(name);
      cy.byTestId('shops-list').find('mat-expansion-panel').should('have.length', 1);
      cy.byTestId('shops-row-0').should('contain.text', name);

      cy.byTestId('shops-search-clear-button').click();
      cy.byTestId('shops-list').find('mat-expansion-panel').should('have.length.greaterThan', 1);
    });
  });

  it('shows an empty state when nothing matches the search', () => {
    cy.byTestId('shops-search-input').type('gibt-es-nicht');

    cy.byTestId('shops-empty').should('be.visible').and('contain.text', 'Keine Filiale');
  });

  it('stays usable on phone', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('addShopButton').should('be.visible');
    cy.byTestId('shops-search-input').should('be.visible');
    cy.byTestId('shops-row-0').should('be.visible').find('mat-expansion-panel-header').click();
    cy.byTestId('shop-details-0').should('be.visible').and('contain.text', 'Fr. Musterfrau');
  });

});
