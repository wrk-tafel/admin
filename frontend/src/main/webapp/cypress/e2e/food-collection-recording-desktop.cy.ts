describe('Food Collection Recording', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.createDistribution();
    cy.visit('/#/logistik/warenerfassung');
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('food collection recorded properly on desktop', () => {
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
      cy.byTestId('driverSearchInput').should('not.exist');
      cy.byTestId('selectedDriverDescription').should('have.text', '00000 E2E Test');

      // create new employee
      cy.byTestId('coDriverSearchInput').type(String(randomNumber));
      cy.byTestId('codriver-employee-search-button').click();

      cy.byTestId('codriver-search-create-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('codriver-personnelnumber-input').type('personnelNumber-' + randomNumber);
          cy.byTestId('codriver-firstname-input').type('firstname-' + randomNumber);
          cy.byTestId('codriver-lastname-input').type('lastname-' + randomNumber);
          cy.byTestId('codriver-save-button').click();
        });
      cy.byTestId('selectedCoDriverRemoveButton').click();

      // search for existing employee
      cy.byTestId('coDriverSearchInput').clear();
      cy.byTestId('coDriverSearchInput').type('scan');
      cy.byTestId('codriver-employee-search-button').click();

      cy.byTestId('codriver-select-employee-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('select-employee-row-0').should('exist');
          cy.byTestId('select-employee-row-1').should('exist');
          cy.byTestId('select-employee-button-1').click();
        });
      cy.byTestId('selectedCoDriverDescription').should('have.text', '0500 Scanner 2');

      cy.byTestId('save-routedata-button').click();

      cy.byTestId('km-diff-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('ok-button').click();
        });

      assertSavedToast();

      cy.byTestId('select-items-tab').click();
      fillCategories();
      cy.byTestId('save-items-button').click();
      assertSavedToast();

      // check if existing data is filled again
      cy.byTestId('routeInput').select('Route 1');
      cy.byTestId('routeInput').select('Route 2');
      cy.byTestId('category-1-shop-20-input').should('have.value', '12');

      assertNoEmployeeModalsOpen();
    });
  });

  function fillCategories() {
    const shopIds = [20, 21];
    for (let category = 1; category <= 15; category++) {
      for (const shopId of shopIds) {
        const value = category === 1 && shopId === 20 ? '12' : '1';
        cy.byTestId(`category-${category}-shop-${shopId}-input`).clear().type(value);
      }
    }
  }

  function assertSavedToast() {
    cy.get('.toast-message')
      .should('be.visible')
      .should('contain.text', 'Daten wurden gespeichert!');
  }

  function assertNoEmployeeModalsOpen() {
    cy.byTestId('driver-search-create-dialog').should('not.exist');
    cy.byTestId('codriver-search-create-dialog').should('not.exist');

    cy.byTestId('driver-select-employee-dialog').should('not.exist');
    cy.byTestId('codriver-select-employee-dialog').should('not.exist');
  }

});
