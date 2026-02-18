describe('Food Collection Recording', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.createDistribution();

    // Visit overview first to let SSE deliver the distribution state to GlobalStateService
    cy.visit('/#/uebersicht');
    cy.byTestId('distribution-state-text').should('have.text', 'Geöffnet');

    cy.visit('/#/logistik/warenerfassung');
    cy.byTestId('routeInput').should('be.visible');
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('food collection recorded properly on responsive layouts', () => {
    cy.viewport('iphone-7');

    cy.getAnyRandomNumber().then((randomNumber) => {
      cy.intercept('GET', '/api/food-collections/route/*').as('getFoodCollection');
      cy.intercept('GET', '/api/routes/*/shops').as('getShopsOfRoute');
      cy.byTestId('routeInput').select('Route 2');
      cy.wait('@getFoodCollection');
      cy.wait('@getShopsOfRoute');

      cy.byTestId('carInput').select('W-NC-123 (Nice Car 123)');
      cy.byTestId('kmStartInput').type('1000');
      cy.byTestId('kmEndInput').type('2000');

      // enter existing employee, delete and repeat
      cy.byTestId('driverSearchInput').type('00000');
      cy.byTestId('driver-employee-search-button').click();
      cy.byTestId('driverSearchInput').should('not.exist');
      cy.byTestId('selectedDriverDescription').should('have.text', '00000 E2E Test');

      const driverRemoveButton = cy.byTestId('selectedDriverRemoveButton');
      driverRemoveButton.should('be.visible');
      driverRemoveButton.click();
      cy.byTestId('driverSearchInput').should('exist');
      cy.byTestId('driverSearchInput').type('00000');
      cy.byTestId('driver-employee-search-button').click();

      // create new employee
      cy.byTestId('coDriverSearchInput').type(String(randomNumber));
      cy.byTestId('codriver-employee-search-button').click();

      cy.byTestId('codriver-search-create-modal')
        .should('have.class', 'show')
        .within(() => {
          cy.byTestId('codriver-create-personnelnumber-input').type('personnelNumber-' + randomNumber);
          cy.byTestId('codriver-create-firstname-input').type('firstname-' + randomNumber);
          cy.byTestId('codriver-create-lastname-input').type('lastname-' + randomNumber);
          cy.byTestId('codriver-save-button').click();
        });
      cy.byTestId('selectedCoDriverRemoveButton').click();

      // search for existing employee
      cy.byTestId('coDriverSearchInput').clear();
      cy.byTestId('coDriverSearchInput').type('scan');
      cy.byTestId('codriver-employee-search-button').click();

      cy.byTestId('codriver-select-employee-modal')
        .should('have.class', 'show')
        .within(() => {
          cy.byTestId('codriver-select-employee-row-0').should('exist');
          cy.byTestId('codriver-select-employee-row-1').should('exist');
          cy.byTestId('codriver-select-employee-button-1').click();
        });
      cy.byTestId('selectedCoDriverDescription').should('have.text', '0500 Scanner 2');

      cy.intercept('POST', '/api/food-collections/route/*').as('saveBaseData');
      cy.byTestId('save-routedata-button').click();

      cy.byTestId('km-diff-modal')
        .should('have.class', 'show')
        .within(() => {
          cy.byTestId('ok-button').click();
        });

      cy.wait('@saveBaseData');
      cy.byTestId('tafel-toast-header')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').should('have.text', 'Daten wurden gespeichert!');
        });

      cy.byTestId('select-items-tab').click();
      // Wait for the shop title to appear - indicates selectShop() GET has completed
      cy.byTestId('shop-title').should('be.visible');

      // Wait for each auto-save PATCH to complete before triggering the next.
      // Concurrent PATCHes on the same food collection cause duplicate key constraint errors.
      // ngModelChange fires per keystroke, so type each digit separately and wait for its PATCH.
      cy.intercept('PATCH', '/api/food-collections/route/*/items').as('autoSave1a');
      cy.byTestId('category-1-input').should('be.visible').type('{selectall}1');
      cy.wait('@autoSave1a').its('response.statusCode').should('eq', 200);

      cy.intercept('PATCH', '/api/food-collections/route/*/items').as('autoSave1b');
      cy.byTestId('category-1-input').type('2');
      cy.wait('@autoSave1b').its('response.statusCode').should('eq', 200);

      cy.intercept('PATCH', '/api/food-collections/route/*/items').as('autoSave2');
      cy.byTestId('category-2-increment-button').click();
      cy.wait('@autoSave2').its('response.statusCode').should('eq', 200);

      cy.intercept('PATCH', '/api/food-collections/route/*/items').as('autoSave3');
      cy.byTestId('category-2-increment-button').click();
      cy.wait('@autoSave3').its('response.statusCode').should('eq', 200);

      cy.intercept('PATCH', '/api/food-collections/route/*/items').as('autoSave4');
      cy.byTestId('category-2-increment-button').click();
      cy.wait('@autoSave4').its('response.statusCode').should('eq', 200);

      cy.intercept('PATCH', '/api/food-collections/route/*/items').as('autoSave5');
      cy.byTestId('category-2-decrement-button').click();
      cy.wait('@autoSave5').its('response.statusCode').should('eq', 200);

      // validate auto-save on input change
      cy.reload();
      cy.byTestId('routeInput').should('be.visible');

      cy.intercept('GET', '/api/food-collections/route/*').as('getFoodCollectionReload');
      cy.intercept('GET', '/api/routes/*/shops').as('getShopsOfRouteReload');
      cy.byTestId('routeInput').select('Route 2');
      cy.wait('@getFoodCollectionReload');
      cy.wait('@getShopsOfRouteReload');

      cy.byTestId('select-items-tab').click();
      cy.byTestId('shop-title').should('be.visible');
      cy.byTestId('category-1-input').should('have.value', '12');
      cy.byTestId('category-2-input').should('have.value', '2');

      cy.intercept('POST', '/api/food-collections/route/*/shop/*/items').as('saveItems');
      cy.byTestId('save-items-responsive-button').click();
      cy.wait('@saveItems');
      cy.byTestId('tafel-toast-header')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').should('have.text', 'Daten wurden gespeichert!');
        });

      // check if existing data is filled again
      cy.intercept('GET', '/api/food-collections/route/*').as('getFoodCollection2');
      cy.intercept('GET', '/api/routes/*/shops').as('getShopsOfRoute2');
      cy.byTestId('routeInput').select('Route 1');
      cy.wait('@getFoodCollection2');
      cy.wait('@getShopsOfRoute2');

      cy.intercept('GET', '/api/food-collections/route/*').as('getFoodCollection3');
      cy.intercept('GET', '/api/routes/*/shops').as('getShopsOfRoute3');
      cy.byTestId('routeInput').select('Route 2');
      cy.wait('@getFoodCollection3');
      cy.wait('@getShopsOfRoute3');
      cy.byTestId('category-1-input').should('have.value', '12');
      cy.byTestId('category-2-input').should('have.value', '2');

      cy.byTestId('driver-search-create-modal').should('not.be.visible');
      cy.byTestId('codriver-search-create-modal').should('not.be.visible');

      cy.byTestId('driver-select-employee-modal').should('not.be.visible');
      cy.byTestId('codriver-select-employee-modal').should('not.be.visible');

      // go to next shop
      cy.byTestId('next-shop-button').click();
      cy.byTestId('shop-title').should('have.text', '21 - Denns BioMarkt');

      cy.byTestId('previous-shop-button').click();
      cy.byTestId('shop-title').should('have.text', '20 - Lidl');
    });
  });

});
