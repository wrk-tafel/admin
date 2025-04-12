describe('Food Collection Recording', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.createDistribution();
    cy.visit('/#/logistik/warenerfassung');
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('food collection recorded properly', () => {
    cy.getAnyRandomNumber().then((randomNumber) => {
      cy.byTestId('routeInput').select('Route 2');
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

      fillCategories();

      cy.byTestId('save-button').click();

      cy.byTestId('tafel-toast-header')
        .should('be.visible')
        .within(() => {
          cy.byTestId('title').should('have.text', 'Waren wurden erfasst!');
        });

      cy.url().should('include', '/logistik/warenerfassung');

      // check if existing data is filled again
      cy.byTestId('routeInput').select('Route 1');
      cy.byTestId('routeInput').select('Route 2');
      cy.byTestId('category-1-shop-20-input').should('have.value', '12');

      cy.byTestId('driver-search-create-modal').should('not.exist');
      cy.byTestId('codriver-search-create-modal').should('not.exist');

      cy.byTestId('driver-select-employee-modal').should('not.exist');
      cy.byTestId('codriver-select-employee-modal').should('not.exist');
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
