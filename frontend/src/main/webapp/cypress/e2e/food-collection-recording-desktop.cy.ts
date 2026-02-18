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

  it('food collection recorded properly on desktop', () => {
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
      fillCategories();

      cy.intercept('POST', '/api/food-collections/route/*/items').as('saveItems');
      cy.byTestId('save-items-button').click();
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
      cy.byTestId('category-1-shop-20-input').should('have.value', '12');

      cy.byTestId('driver-search-create-modal').should('not.be.visible');
      cy.byTestId('codriver-search-create-modal').should('not.be.visible');

      cy.byTestId('driver-select-employee-modal').should('not.be.visible');
      cy.byTestId('codriver-select-employee-modal').should('not.be.visible');
    });
  });

  function fillCategories() {
    cy.byTestId('category-1-shop-20-input').clear().type('12');
    cy.byTestId('category-1-shop-21-input').clear().type('1');
    cy.byTestId('category-2-shop-20-input').clear().type('1');
    cy.byTestId('category-2-shop-21-input').clear().type('1');
    cy.byTestId('category-3-shop-20-input').clear().type('1');
    cy.byTestId('category-3-shop-21-input').clear().type('1');
    cy.byTestId('category-4-shop-20-input').clear().type('1');
    cy.byTestId('category-4-shop-21-input').clear().type('1');
    cy.byTestId('category-5-shop-20-input').clear().type('1');
    cy.byTestId('category-5-shop-21-input').clear().type('1');
    cy.byTestId('category-6-shop-20-input').clear().type('1');
    cy.byTestId('category-6-shop-21-input').clear().type('1');
    cy.byTestId('category-7-shop-20-input').clear().type('1');
    cy.byTestId('category-7-shop-21-input').clear().type('1');
    cy.byTestId('category-8-shop-20-input').clear().type('1');
    cy.byTestId('category-8-shop-21-input').clear().type('1');
    cy.byTestId('category-9-shop-20-input').clear().type('1');
    cy.byTestId('category-9-shop-21-input').clear().type('1');
    cy.byTestId('category-10-shop-20-input').clear().type('1');
    cy.byTestId('category-10-shop-21-input').clear().type('1');
    cy.byTestId('category-11-shop-20-input').clear().type('1');
    cy.byTestId('category-11-shop-21-input').clear().type('1');
    cy.byTestId('category-12-shop-20-input').clear().type('1');
    cy.byTestId('category-12-shop-21-input').clear().type('1');
    cy.byTestId('category-13-shop-20-input').clear().type('1');
    cy.byTestId('category-13-shop-21-input').clear().type('1');
    cy.byTestId('category-14-shop-20-input').clear().type('1');
    cy.byTestId('category-14-shop-21-input').clear().type('1');
    cy.byTestId('category-15-shop-20-input').clear().type('1');
    cy.byTestId('category-15-shop-21-input').clear().type('1');
  }

});
