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
    return cy.byTestId('shops-list').contains('[testid^="shops-row-"]', name);
  }

  // Creates a route with a single stop at the given shop, then returns to the shops screen - used
  // to test the "where is this shop used" list, which is built from routes/stops.
  function createRouteWithStop(routeName: string, routeNumber: string, shopName: string, shopNumber: number, time: string) {
    cy.visit('/einstellungen/routen');
    cy.byTestId('addRouteButton').click();
    cy.byTestId('route-number-input').should('be.visible').type(routeNumber);
    cy.byTestId('route-name-input').type(routeName);
    cy.byTestId('route-stop-add-button').click();
    cy.byTestId('route-stop-time-input-0').type(time);
    cy.byTestId('route-stop-shop-select-0').click();
    cy.contains('mat-option', shopNumber + ' - ' + shopName).click();
    cy.byTestId('route-save-button').click();
    cy.contains('.toast-message', 'erstellt').should('be.visible');

    cy.visit('/einstellungen/filialen');
  }

  it('lists shops with their address and unit', () => {
    cy.byTestId('shops-list').should('exist');
    cy.byTestId('shops-row-0').should('contain.text', 'Billa').and('contain.text', 'Kisten');
    cy.byTestId('shops-summary').should('contain.text', 'aktiv');
  });

  it('shows the contact details of a shop only once it is expanded', () => {
    cy.byTestId('shop-details-0').should('not.be.visible');

    cy.byTestId('shops-row-0').find('[testid^="shops-toggle-"]').click();

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

      shopPanel(name).find('[testid^="shops-enabled-toggle-"] button')
        .should('have.attr', 'aria-checked', 'false');
      shopPanel(name).find('[testid^="editShopButton-"]').should('be.disabled');

      cy.byTestId('shops-filter-enabled').click();
      cy.byTestId('shops-list').should('not.contain.text', name);

      cy.byTestId('shops-filter-disabled').click();
      cy.byTestId('shops-list').should('contain.text', name);
    });
  });

  it('filters the list by the search text and shows a result count', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Filiale suchen ' + randomId;

      createShop(name, shopNumber(randomId));
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      cy.byTestId('shops-search-input').type(name);
      cy.byTestId('shops-list').find('[testid^="shops-row-"]').should('have.length', 1);
      cy.byTestId('shops-row-0').should('contain.text', name);
      cy.byTestId('shops-result-count').should('contain.text', '1 von');

      cy.byTestId('shops-search-clear-button').click();
      cy.byTestId('shops-list').find('[testid^="shops-row-"]').should('have.length.greaterThan', 1);
      cy.byTestId('shops-result-count').should('not.exist');
    });
  });

  it('shows an empty state when nothing matches the search', () => {
    cy.byTestId('shops-search-input').type('gibt-es-nicht');

    cy.byTestId('shops-empty').should('be.visible').and('contain.text', 'Keine Filiale');
  });

  it('names the active filter in the empty-result message', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const name = 'E2E Filiale gefiltert ' + randomId;

      // an active shop can never show up under the "Inaktiv" filter
      createShop(name, shopNumber(randomId));
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      cy.byTestId('shops-search-input').type(name);
      cy.byTestId('shops-filter-disabled').click();

      cy.byTestId('shops-empty').should('be.visible').and('contain.text', 'Keine inaktiven Filialen gefunden');
    });
  });

  it('lists the shops ordered by number', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const shared = 'E2E Sort ' + randomId;
      // Beta gets the lower number but the alphabetically later name, so the order can only come
      // from the numbers rather than happen to agree with the names
      const beta = shared + ' Beta';
      const alpha = shared + ' Alpha';
      const betaNumber = shopNumber(randomId);
      const alphaNumber = betaNumber + 1;

      createShop(beta, betaNumber);
      cy.contains('.toast-message', 'erstellt').should('be.visible');
      createShop(alpha, alphaNumber);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      cy.byTestId('shops-search-input').type(shared);
      cy.byTestId('shops-list').find('[testid^="shops-row-"]').should('have.length', 2);

      cy.byTestId('shops-row-0').should('contain.text', beta);
      cy.byTestId('shops-row-1').should('contain.text', alpha);
    });
  });

  it('shows the address on a map', () => {
    cy.byTestId('shops-row-0').find('[testid^="shops-toggle-"]').click();

    cy.byTestId('shops-map-link-0')
      .should('have.attr', 'href')
      .and('include', 'google.com/maps')
      .and('include', 'Bloch-Bauer-Promenade');
  });

  it('shows which routes stop at a shop and links to them', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const shopName = 'E2E Filiale Route ' + randomId;
      const shopNr = shopNumber(randomId);
      const routeName = 'E2E Route Filiale ' + randomId;

      createShop(shopName, shopNr);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      createRouteWithStop(routeName, '90.6', shopName, shopNr, '08:15');

      shopPanel(shopName).find('[testid^="shops-toggle-"]').click();
      shopPanel(shopName).find('[testid^="shops-route-usage-"]')
        .should('contain.text', routeName)
        .and('contain.text', '08:15');

      shopPanel(shopName).find('[testid^="shops-route-link-"]').first().click();
      cy.url().should('include', '/einstellungen/routen');
    });
  });

  it('confirms before deactivating a shop an active route stops at', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const shopName = 'E2E Filiale Deaktivieren ' + randomId;
      const shopNr = shopNumber(randomId);
      const routeName = 'E2E Route Deaktivieren ' + randomId;

      createShop(shopName, shopNr);
      cy.contains('.toast-message', 'erstellt').should('be.visible');

      createRouteWithStop(routeName, '90.7', shopName, shopNr, '09:30');

      shopPanel(shopName).find('[testid^="shops-enabled-toggle-"]').click();

      cy.byTestId('shop-disable-confirm-dialog').should('be.visible').and('contain.text', routeName);

      // cancelling leaves the shop active
      cy.byTestId('cancel-button').click();
      shopPanel(shopName).find('[testid^="shops-enabled-toggle-"] button')
        .should('have.attr', 'aria-checked', 'true');

      shopPanel(shopName).find('[testid^="shops-enabled-toggle-"]').click();
      cy.byTestId('shop-disable-confirm-dialog').should('be.visible');
      cy.byTestId('ok-button').click();

      cy.contains('.toast-message', 'geändert').should('be.visible');
      shopPanel(shopName).find('[testid^="shops-enabled-toggle-"] button')
        .should('have.attr', 'aria-checked', 'false');

      // deactivating removed the shop's stop from the route
      shopPanel(shopName).find('[testid^="shops-toggle-"]').click();
      shopPanel(shopName).find('[testid^="shops-route-usage-"]')
        .should('contain.text', 'Wird derzeit von keiner Route angefahren');
    });
  });

  it('stays usable on phone', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('addShopButton').should('be.visible');
    cy.byTestId('shops-search-input').should('be.visible');
    cy.byTestId('shops-row-0').should('be.visible').find('[testid^="shops-toggle-"]').click();
    cy.byTestId('shop-details-0').should('be.visible').and('contain.text', 'Fr. Musterfrau');
  });

  // The states below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations while the edit dialog is open', () => {
      cy.byTestId('addShopButton').click();

      cy.checkDialogAccessibility();
    });

    it('has no violations while the deactivation confirm dialog is open', () => {
      cy.getAnyRandomNumber().then((randomId) => {
        const shopName = 'E2E Filiale A11y ' + randomId;
        const shopNr = shopNumber(randomId);
        const routeName = 'E2E Route A11y ' + randomId;

        createShop(shopName, shopNr);
        cy.contains('.toast-message', 'erstellt').should('be.visible');

        createRouteWithStop(routeName, '90.8', shopName, shopNr, '10:15');

        shopPanel(shopName).find('[testid^="shops-enabled-toggle-"]').click();

        cy.checkDialogAccessibility();
      });
    });

    // Scoped to the whole record, header row included: the summary toggle and the two actions
    // beside it are what #3137 restructured, so the assertion has to be able to see them.
    it('has no violations while a panel is expanded', () => {
      cy.byTestId('shops-row-0').find('[testid^="shops-toggle-"]').click();
      cy.byTestId('shop-details-0').should('be.visible');

      cy.checkAccessibility('[testid="shops-row-0"]');
    });

  });

});
