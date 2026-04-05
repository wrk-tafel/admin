describe('Food Collection Recording', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.createDistribution();
    cy.visit('/#/logistik/warenerfassung');
  });

  afterEach(() => {
    cy.closeDistribution();
  });

  it('food collection recorded properly on responsive layouts', () => {
    cy.viewport('iphone-7');

    cy.getAnyRandomNumber().then((randomNumber) => {
      enterRouteData();
      selectDriver();
      createAndSelectCoDriver(randomNumber);
      selectExistingCoDriver();

      cy.byTestId('save-routedata-button').click();

      cy.byTestId('km-diff-dialog')
        .should('be.visible')
        .within(() => {
          cy.byTestId('ok-button').click();
        });

      assertSavedToast();

      cy.byTestId('select-items-tab').click();

      cy.byTestId('category-1-input').type('12');
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-decrement-button').click();

      // validate auto-save on input change
      cy.reload();
      cy.byTestId('routeInput').select('Route 2');
      cy.byTestId('select-items-tab').click();
      cy.byTestId('category-1-input').should('have.value', '12');
      cy.byTestId('category-2-input').should('have.value', '2');

      cy.byTestId('save-items-responsive-button').click();
      assertSavedToast();

      // check if existing data is filled again
      cy.byTestId('routeInput').select('Route 1');
      cy.byTestId('routeInput').select('Route 2');
      cy.byTestId('category-1-input').should('have.value', '12');
      cy.byTestId('category-2-input').should('have.value', '2');

      assertNoEmployeeModalsOpen();

      // go to next shop
      cy.byTestId('next-shop-button').click();
      cy.byTestId('shop-title').should('have.text', '21 - Denns BioMarkt');

      cy.byTestId('previous-shop-button').click();
      cy.byTestId('shop-title').should('have.text', '20 - Lidl');
    });
  });

  function enterRouteData() {
    cy.byTestId('routeInput').select('Route 2');
    cy.byTestId('carInput').select('W-NC-123 (Nice Car 123)');
    cy.byTestId('kmStartInput').type('1000');
    cy.byTestId('kmEndInput').type('2000');
  }

  function selectDriver() {
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
  }

  function createAndSelectCoDriver(randomNumber: number) {
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
  }

  function selectExistingCoDriver() {
    cy.byTestId('coDriverSearchInput').clear();
    cy.byTestId('coDriverSearchInput').type('scan');
    cy.byTestId('codriver-employee-search-button').click();

    cy.byTestId('codriver-select-employee-dialog')
      .should('be.visible')
      .within(() => {
        cy.byTestId('select-employee-button-1').click();
      });
    cy.byTestId('selectedCoDriverDescription').should('have.text', '0500 Scanner 2');
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
