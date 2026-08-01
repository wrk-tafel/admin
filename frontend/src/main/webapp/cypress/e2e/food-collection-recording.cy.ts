import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

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
    // Uses the global 1024x768 desktop baseline from cypress.config.ts.

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
      fillCategories();
      cy.byTestId('save-items-button').click();
      assertSavedToast();

      // check if existing data is filled again
      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 1').click();
      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 2').click();
      cy.byTestId('category-1-shop-20-input').should('have.value', '12');

      assertNoEmployeeModalsOpen();
    });
  });

  it('food collection recorded properly on responsive layouts', () => {
    cy.viewport(PHONE_VIEWPORT);
    // give the layout a moment to settle after the resize before the first interaction -
    // otherwise a resize-triggered re-render can detach routeInput mid-click under load
    cy.byTestId('routeInput').should('be.visible');

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

      // the item-patch queue sends autosave requests sequentially, one per value change - alias
      // it so the reload below can wait for every queued patch to land instead of racing them
      cy.intercept('PATCH', '**/food-collections/routes/*/items').as('patchItem');

      cy.byTestId('category-1-input').type('12');
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-decrement-button').click();

      // category-1's two keystrokes ('1' then '12') plus category-2's 3 increments + 1 decrement
      cy.wait(new Array(6).fill('@patchItem'));

      // validate auto-save on input change
      cy.reload();
      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 2').click();
      cy.byTestId('select-items-tab').click();
      cy.byTestId('category-1-input').should('have.value', '12');
      cy.byTestId('category-2-input').should('have.value', '2');

      cy.byTestId('save-items-responsive-button').click();
      assertSavedToast();

      // check if existing data is filled again
      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 1').click();
      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 2').click();
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

  it('queues a change made while offline and syncs it automatically once back online', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.byTestId('routeInput').should('be.visible');

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

      cy.intercept('PATCH', '**/food-collections/routes/*/items').as('patchItem');

      cy.byTestId('offline-indicator').should('not.exist');

      // ConnectivityService only reacts to the online/offline window events, not a live network
      // cut - dispatching them directly is the standard way to exercise this without relying on
      // browser/OS-level network emulation.
      goOffline();
      cy.byTestId('offline-indicator').should('contain.text', 'Offline').and('not.contain.text', 'ausstehend');

      cy.byTestId('category-1-input').type('7');

      cy.byTestId('offline-indicator')
        .should('contain.text', 'Offline')
        .and('contain.text', '1 Änderung ausstehend');
      cy.get('@patchItem.all').should('have.length', 0);

      goOnline();

      cy.wait('@patchItem').its('request.body').should('deep.equal', {
        categoryId: 1,
        shopId: 20,
        amount: 7
      });
      cy.byTestId('offline-indicator').should('not.exist');
    });
  });

  it('keeps a change queued across a reload while offline and sends it once reopened online', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.byTestId('routeInput').should('be.visible');

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

      goOffline();
      cy.byTestId('category-2-input').type('9');
      cy.byTestId('offline-indicator').should('contain.text', '1 Änderung ausstehend');

      // The reload lands back in a real (online) browser, so the persisted queue - which
      // survives the reload via localStorage - should flush on its own once the item screen is
      // reopened, without dispatching another online event or any other manual action.
      cy.reload();

      cy.intercept('PATCH', '**/food-collections/routes/*/items').as('patchItem');

      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 2').click();
      cy.byTestId('select-items-tab').click();

      cy.wait('@patchItem').its('request.body').should('deep.equal', {
        categoryId: 2,
        shopId: 20,
        amount: 9
      });
      cy.byTestId('category-2-input').should('have.value', '9');
    });
  });

  it('food collection recording shows the desktop-style item grid at tablet breakpoint', () => {
    // At the tablet width the sidenav is already in mobile ("over") mode, but page content
    // switches to the desktop item grid at the app's md: (768px) breakpoint - verify both hold.
    cy.viewport(TABLET_VIEWPORT);

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
      cy.byTestId('category-1-shop-20-input').should('be.visible').clear().type('12');
      cy.byTestId('save-items-button').click();
      assertSavedToast();
    });
  });

  function enterRouteData() {
    cy.byTestId('routeInput').click();
    cy.get('mat-option').contains('Route 2').click();
    cy.byTestId('carInput').click();
    cy.get('mat-option').contains('W-NC-123 (Nice Car 123)').click();
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

  function goOffline() {
    cy.window().then((win) => win.dispatchEvent(new Event('offline')));
  }

  function goOnline() {
    cy.window().then((win) => win.dispatchEvent(new Event('online')));
  }

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
