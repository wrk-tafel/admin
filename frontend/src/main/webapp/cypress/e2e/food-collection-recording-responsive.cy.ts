describe('Food Collection Recording', () => {

  beforeEach(() => {
    cy.loginDefault();

    // Ensure no distribution is open from previous tests
    cy.request({
      method: 'POST',
      url: '/api/distributions/close?forceClose=true',
      failOnStatusCode: false
    });

    cy.intercept('POST', '/api/distributions/new').as('createDistribution');
    cy.createDistribution();
    cy.wait('@createDistribution');
    cy.visit('/#/logistik/warenerfassung');
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('food collection recorded properly on responsive layouts', () => {
    cy.viewport('iphone-7');

    cy.getAnyRandomNumber().then((randomNumber) => {
      cy.intercept('GET', '/api/food-collections/*').as('getFoodCollection');
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
        .should('be.visible')
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
        .should('be.visible')
        .within(() => {
          cy.byTestId('codriver-select-employee-row-0').should('exist');
          cy.byTestId('codriver-select-employee-row-1').should('exist');
          cy.byTestId('codriver-select-employee-button-1').click();
        });
      cy.byTestId('selectedCoDriverDescription').should('have.text', '0500 Scanner 2');

      cy.intercept('POST', '/api/food-collections/*/basedata').as('saveBaseData');
      cy.byTestId('save-routedata-button').click();

      cy.byTestId('km-diff-modal')
        .should('be.visible')
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

      cy.byTestId('category-1-input').type('12');
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-decrement-button').click();

      // validate auto-save on input change
      cy.intercept('GET', '/api/food-collections/*').as('getFoodCollectionReload');
      cy.intercept('GET', '/api/routes/*/shops').as('getShopsOfRouteReload');
      cy.reload();
      cy.wait('@getFoodCollectionReload');
      cy.wait('@getShopsOfRouteReload');

      cy.byTestId('routeInput').select('Route 2');
      cy.byTestId('select-items-tab').click();
      cy.byTestId('category-1-input').should('have.value', '12');
      cy.byTestId('category-2-input').should('have.value', '2');

      cy.intercept('POST', '/api/food-collections/*/items').as('saveItems');
      cy.byTestId('save-items-responsive-button').click();
      cy.wait('@saveItems');
      cy.byTestId('tafel-toast-header')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').should('have.text', 'Daten wurden gespeichert!');
        });

      // check if existing data is filled again
      cy.intercept('GET', '/api/food-collections/*').as('getFoodCollection2');
      cy.intercept('GET', '/api/routes/*/shops').as('getShopsOfRoute2');
      cy.byTestId('routeInput').select('Route 1');
      cy.wait('@getFoodCollection2');
      cy.wait('@getShopsOfRoute2');

      cy.intercept('GET', '/api/food-collections/*').as('getFoodCollection3');
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
