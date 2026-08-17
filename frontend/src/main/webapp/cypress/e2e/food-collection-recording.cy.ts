import {recurse} from 'cypress-recurse';
import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';
import {MAIN_CONTENT} from '../support/accessibility';

describe('Food Collection Recording', () => {
  beforeEach(() => {
    cy.loginDefault();
    cy.createDistribution();
    cy.visit('/logistik/warenerfassung');
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

      cy.byTestId('select-items-tab').click();
      // filled in one go once the car is back, so the mileage reads before the amounts
      assertKmIsBefore('items-section');
      enterKmData();
      fillCategories();
      fillReturnCategories();
      addFreetextReturnItem(20, 'Bananenkartons grün', 3);

      saveAndConfirmKmDiff();
      assertSavedToast();

      // check if existing data is filled again
      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 1').click();
      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 2').click();
      cy.byTestId('select-items-tab').click();
      cy.byTestId('kmStartInput').should('have.value', '1000');
      cy.byTestId('kmEndInput').should('have.value', '2000');
      cy.byTestId('category-1-shop-20-input').should('have.value', '12');
      cy.byTestId('return-category-11-shop-20-input').should('have.value', '4');
      cy.byTestId('return-item-0-description-input').should('have.value', 'Bananenkartons grün');
      cy.byTestId('return-item-0-amount-input').should('have.value', '3');

      assertNoEmployeeModalsOpen();

      // Route 2 now has both base data and food items entered, so the dashboard panel should
      // count it as fully recorded and mark its chip apart from the other (untouched) routes,
      // which must stay outstanding.
      cy.visit('/');
      cy.byTestId('recorded-food-collections-count').should('have.text', '1 / 5');
      // index 1: routes are rendered in number order (Route 1, 2, 3, 4, 5) and Route 2 is the
      // second of the five active routes seeded by testdata.sql.
      cy.byTestId('recorded-route-chip-1').should('contain.text', 'Route 2').and('have.class', 'route-chip-recorded');
      cy.byTestId('recorded-route-chip-0').should('contain.text', 'Route 1').and('not.have.class', 'route-chip-recorded');
    });
  });

  it('shows the saved driver and co-driver right away when the route is opened again', () => {
    // The employee search matches substrings, so the driver's own personnel number ('0200') also
    // finds '02000'. Resolving a stored driver through that search again would pop the employee
    // selection dialog open the moment the route is picked.
    cy.intercept('POST', '**/food-collections/routes/*').as('saveRouteData');
    cy.intercept('POST', '**/food-collections/routes/*/km').as('saveKm');

    enterRouteData();
    selectAmbiguousDriver();
    selectExistingCoDriver();

    // the mileage is filled in as well so the route counts as fully recorded - an incomplete route
    // blocks closing the distribution in afterEach
    cy.byTestId('select-items-tab').click();
    enterKmData();

    saveAndConfirmKmDiff();
    // waits on the two requests this test reopens the route for, rather than on the success toast,
    // which only appears once every section of the screen has been sent
    cy.wait('@saveRouteData').its('response.statusCode').should('eq', 200);
    cy.wait('@saveKm').its('response.statusCode').should('eq', 200);

    // reopening the route must not search for the stored employees again - that search is what
    // used to open the dialog, so its absence is the actual fix and not just a symptom of it
    cy.intercept({method: 'GET', url: /\/api\/employees(\?|$)/}).as('employeeSearchOnReopen');

    cy.byTestId('routeInput').click();
    cy.get('mat-option').contains('Route 1').click();
    cy.byTestId('routeInput').click();
    cy.get('mat-option').contains('Route 2').click();

    cy.byTestId('select-route-tab').click();
    cy.byTestId('selectedDriverDescription').should('have.text', '0200 Test User');
    cy.byTestId('selectedCoDriverDescription').should('have.text', '0500 Scanner 2');
    assertNoEmployeeModalsOpen();
    cy.get('@employeeSearchOnReopen.all').should('have.length', 0);
  });

  it('rejects a free-text return item repeating a return category', () => {
    cy.getAnyRandomNumber().then((randomNumber) => {
      enterRouteData();
      selectDriver();
      createAndSelectCoDriver(randomNumber);
      selectExistingCoDriver();

      cy.byTestId('select-items-tab').click();
      enterKmData();
      cy.byTestId('category-1-shop-20-input').clear().type('1');

      // read the label off the screen rather than hardcoding it - the return categories are
      // editable master data and the settings spec renames them
      returnCategoryName(11).then((name) => {
        addFreetextReturnItem(20, name, 2);

        cy.byTestId('return-item-0-description-input')
          .parents('mat-form-field')
          .should('contain.text', 'Beschreibung bereits erfasst');
      });

      // the invalid return items are skipped, everything else on the screen is still saved
      saveAndConfirmKmDiff();
      cy.get('.toast-message')
        .should('be.visible')
        .should('contain.text', 'Retourware');

      cy.byTestId('return-item-0-remove-button').click();
      cy.byTestId('return-item-0-description-input').should('not.exist');
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

      cy.byTestId('select-items-tab').click();
      // counted shop by shop while still on the road - the mileage is only known at the very end,
      // so on the phone it sits below the goods rather than above them
      assertKmIsAfter('return-items-section');
      enterKmData();

      // The offline queue coalesces rapid same-field changes into fewer requests than one per
      // keystroke/click if a later change overwrites an earlier one before it's sent - so the
      // exact request count isn't a stable thing to wait on. Instead wait until the two fields'
      // *final* settled values have each been seen in some PATCH request, in whatever order/count
      // they actually land.
      cy.intercept('PATCH', '**/food-collections/routes/*/items').as('patchItem');

      cy.byTestId('category-1-input').type('12');
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-increment-button').click();
      cy.byTestId('category-2-decrement-button').click();

      waitForFinalPatches([
        {categoryId: 1, shopId: 20, amount: 12},
        {categoryId: 2, shopId: 20, amount: 2}
      ]);

      // return boxes are not part of the auto-save queue - they go out with the save button
      cy.byTestId('return-category-11-increment-button').click();
      addFreetextReturnItem(undefined, 'Bananenkartons grün', 3);

      saveAndConfirmKmDiff();
      assertSavedToast();

      // validate auto-save on input change
      cy.reload();
      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 2').click();
      cy.byTestId('select-items-tab').click();
      cy.byTestId('category-1-input').should('have.value', '12');
      cy.byTestId('category-2-input').should('have.value', '2');
      cy.byTestId('return-category-11-input').should('have.value', '1');
      cy.byTestId('return-item-0-description-input').should('have.value', 'Bananenkartons grün');
      cy.byTestId('return-item-0-amount-input').should('have.value', '3');

      assertNoEmployeeModalsOpen();

      // go to next shop
      cy.byTestId('next-shop-button').click();
      cy.byTestId('shop-title').should('have.text', '21 - Denns BioMarkt');
      // the return boxes belong to the shop that was left, not to this one
      cy.byTestId('return-category-11-input').should('have.value', '0');
      cy.byTestId('return-item-0-description-input').should('not.exist');

      cy.byTestId('previous-shop-button').click();
      cy.byTestId('shop-title').should('have.text', '20 - Lidl');
      cy.byTestId('return-category-11-input').should('have.value', '1');
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

      cy.byTestId('select-items-tab').click();
      enterKmData();
      saveAndConfirmKmDiff();
      assertSavedToast();

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

      cy.byTestId('select-items-tab').click();
      enterKmData();
      saveAndConfirmKmDiff();
      assertSavedToast();

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

      cy.byTestId('select-items-tab').click();
      enterKmData();
      cy.byTestId('category-1-shop-20-input').should('be.visible').clear().type('12');
      saveAndConfirmKmDiff();
      assertSavedToast();
    });
  });

  it('shows running totals in the desktop matrix and keeps them up to date', () => {
    enterRouteData();
    cy.byTestId('select-items-tab').click();

    cy.byTestId('category-1-shop-20-input').clear().type('5');
    cy.byTestId('category-1-shop-21-input').clear().type('3');
    assertCellText('category-1-total', '8');

    cy.byTestId('category-2-shop-20-input').clear().type('2');
    assertCellText('items-shop-total-20', '7');
    assertCellText('items-grand-total', '10');
  });

  it('shows tab status badges that track each section\'s save state', () => {
    cy.getAnyRandomNumber().then((randomNumber) => {
      cy.byTestId('routeInput').click();
      cy.get('mat-option').contains('Route 2').click();

      cy.byTestId('route-tab-status-complete').should('not.exist');
      cy.byTestId('route-tab-status-unsaved').should('not.exist');
      cy.byTestId('route-tab-status-invalid').should('not.exist');

      // car alone, driver/co-driver still missing - already invalid, doesn't need to be dirty first
      cy.byTestId('carInput').click();
      cy.get('mat-option').contains('W-NC-123 (Lieferwagen 123)').click();
      cy.byTestId('route-tab-status-invalid').should('be.visible');

      selectDriver();
      createAndSelectCoDriver(randomNumber);
      selectExistingCoDriver();
      cy.byTestId('route-tab-status-unsaved').should('be.visible');

      cy.byTestId('select-items-tab').click();
      cy.byTestId('waren-tab-status-complete').should('not.exist');
      // "Waren" only reads complete once both the amounts and the mileage are in - amounts alone
      // (or mileage alone) leave it at "unsaved", see #3332
      cy.byTestId('category-1-shop-20-input').clear().type('3');
      enterKmData();
      // the km inputs sit at the bottom of the items tab, so entering them scrolls the tab header
      // (which carries the badges) out of the scrollport - scroll back up like a user would
      cy.byTestId('waren-tab-status-unsaved').scrollIntoView().should('be.visible');

      saveAndConfirmKmDiff();
      assertSavedToast();

      cy.byTestId('route-tab-status-complete').scrollIntoView().should('be.visible');
      cy.byTestId('waren-tab-status-complete').scrollIntoView().should('be.visible');
    });
  });

  it('warns when amounts are entered before the route base data is complete', () => {
    enterRouteData(); // route + car only, no driver/co-driver
    cy.byTestId('basedata-missing-warning').should('not.exist');

    cy.byTestId('select-items-tab').click();
    cy.byTestId('category-1-shop-20-input').clear().type('3');

    // the warning renders above the tab content, which typing in the grid has scrolled past
    cy.byTestId('basedata-missing-warning').scrollIntoView().should('be.visible');
  });

  it('shows the live computed distance next to the mileage inputs', () => {
    enterRouteData();
    cy.byTestId('select-items-tab').click();

    cy.byTestId('km-distance-hint').should('not.exist');
    cy.byTestId('kmStartInput').clear().type('1000');
    cy.byTestId('km-distance-hint').should('not.exist');
    cy.byTestId('kmEndInput').clear().type('1042');
    cy.byTestId('km-distance-hint').should('contain.text', '42 km');
  });

  it('warns before leaving the page with unsaved changes, and honours the dialog\'s choice', () => {
    enterRouteData();
    cy.byTestId('select-items-tab').click();
    enterKmData();

    cy.get('a[routerLink="/uebersicht"]').first().click();
    cy.byTestId('unsaved-changes-dialog').should('be.visible').within(() => {
      cy.byTestId('stay-button').click();
    });
    cy.byTestId('unsaved-changes-dialog').should('not.exist');
    cy.url().should('include', '/warenerfassung');

    cy.get('a[routerLink="/uebersicht"]').first().click();
    cy.byTestId('unsaved-changes-dialog').should('be.visible').within(() => {
      cy.byTestId('leave-button').click();
    });
    cy.url().should('include', '/uebersicht');
  });

  it('mobile: shows trip progress, a jump list and a per-shop recorded checkmark', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.byTestId('routeInput').should('be.visible');

    enterRouteData();
    cy.byTestId('select-items-tab').click();

    cy.byTestId('shop-progress-label').should('have.text', 'Filiale 1 von 2');
    cy.byTestId('shop-title').should('contain.text', 'Lidl');
    cy.byTestId('shop-recorded-badge').should('not.exist');

    // testdata: food categories 1-10 are the regular categories on this route's items screen
    for (let category = 1; category <= 10; category++) {
      cy.byTestId(`category-${category}-input`).clear().type('1');
    }
    cy.byTestId('shop-recorded-badge').should('contain.text', 'erfasst');

    cy.byTestId('shop-jump-select').click();
    cy.byTestId('shop-jump-option-21').click();
    cy.byTestId('shop-progress-label').should('have.text', 'Filiale 2 von 2');
    cy.byTestId('shop-title').should('contain.text', 'Denns BioMarkt');

    completeRouteViaApi();
  });

  it('mobile: shows a brief confirmation once a queued change has synced', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.byTestId('routeInput').should('be.visible');

    enterRouteData();
    cy.byTestId('select-items-tab').click();

    cy.intercept('PATCH', '**/food-collections/routes/*/items').as('patchItem');
    cy.byTestId('sync-confirmation').should('not.exist');

    goOffline();
    cy.byTestId('category-1-input').type('4');
    cy.byTestId('offline-indicator').should('contain.text', '1 Änderung ausstehend');

    goOnline();
    cy.wait('@patchItem');
    cy.byTestId('sync-confirmation').should('contain.text', 'Synchronisiert');

    completeRouteViaApi();
  });

  it('mobile: holding a counter button down repeats past what a single tap would give', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.byTestId('routeInput').should('be.visible');

    enterRouteData();
    cy.byTestId('select-items-tab').click();

    cy.byTestId('category-1-increment-button').trigger('pointerdown');
    cy.wait(900); // past the hold delay plus a couple of repeat ticks
    cy.byTestId('category-1-increment-button').trigger('pointerup');

    cy.byTestId('category-1-input').invoke('val').then(Number).should('be.greaterThan', 1);

    completeRouteViaApi();
  });

  // Nothing below exists on the route the Lighthouse `pages` sweep loads: with no route selected
  // `formReady()` is false, so the whole item matrix - a core screen during a distribution - is
  // audited by no gate at all. See cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations on the item matrix once a route is selected', () => {
      enterRouteData();
      cy.byTestId('select-items-tab').click();
      cy.byTestId('items-table').should('be.visible');
      addFreetextReturnItem(20, 'Bananenkartons grün', 3);

      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations on the item screen of the responsive layout', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.byTestId('routeInput').should('be.visible');

      enterRouteData();
      cy.byTestId('select-items-tab').click();
      cy.byTestId('items-section').should('be.visible');
      addFreetextReturnItem(undefined, 'Bananenkartons grün', 3);

      cy.checkAccessibility(MAIN_CONTENT);
    });

    it('has no violations in the employee dialogs', () => {
      cy.getAnyRandomNumber().then((randomNumber) => {
        enterRouteData();

        cy.byTestId('coDriverSearchInput').type(String(randomNumber));
        cy.byTestId('codriver-employee-search-button').click();
        cy.byTestId('codriver-search-create-dialog').should('be.visible');
        cy.checkDialogAccessibility();
        cy.byTestId('codriver-search-create-dialog').within(() => {
          cy.byTestId('cancel-button').click();
        });

        cy.byTestId('coDriverSearchInput').clear().type('scan');
        cy.byTestId('codriver-employee-search-button').click();
        cy.byTestId('codriver-select-employee-dialog').should('be.visible');
        cy.checkDialogAccessibility();
      });
    });

    it('has no violations on the mileage confirmation dialog', () => {
      enterRouteData();
      cy.byTestId('select-items-tab').click();
      enterKmData();

      cy.byTestId('save-button').click();
      cy.byTestId('km-diff-dialog').should('be.visible');

      cy.checkDialogAccessibility();
    });

  });

  function enterRouteData() {
    cy.byTestId('routeInput').click();
    cy.get('mat-option').contains('Route 2').click();
    cy.byTestId('carInput').click();
    cy.get('mat-option').contains('W-NC-123 (Lieferwagen 123)').click();
  }

  function enterKmData() {
    cy.byTestId('kmStartInput').clear().type('1000');
    cy.byTestId('kmEndInput').clear().type('2000');
  }

  // The mileage swaps position between the two layouts, so assert on real DOM order rather than
  // on the CSS classes that happen to produce it.
  function assertKmIsBefore(sectionTestId: string) {
    cy.byTestId(sectionTestId).then(($section) => {
      cy.byTestId('kmStartInput').then(($km) => {
        // eslint-disable-next-line no-bitwise
        const kmComesAfterSection = $section[0].compareDocumentPosition($km[0]) & Node.DOCUMENT_POSITION_FOLLOWING;
        expect(kmComesAfterSection, 'km input renders after ' + sectionTestId).to.equal(0);
      });
    });
  }

  function assertKmIsAfter(sectionTestId: string) {
    cy.byTestId(sectionTestId).then(($section) => {
      cy.byTestId('kmStartInput').then(($km) => {
        // eslint-disable-next-line no-bitwise
        const kmComesAfterSection = $section[0].compareDocumentPosition($km[0]) & Node.DOCUMENT_POSITION_FOLLOWING;
        expect(kmComesAfterSection, 'km input renders after ' + sectionTestId).to.be.greaterThan(0);
      });
    });
  }

  function saveAndConfirmKmDiff() {
    cy.byTestId('save-button').click();
    cy.byTestId('km-diff-dialog')
      .should('be.visible')
      .within(() => {
        cy.byTestId('ok-button').click();
      });
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

  // testdata: '0200' is a personnel number of its own and at the same time part of '02000', so the
  // search always returns both employees and the selection dialog has to be used
  function selectAmbiguousDriver() {
    cy.byTestId('driverSearchInput').type('0200');
    cy.byTestId('driver-employee-search-button').click();

    cy.byTestId('driver-select-employee-dialog')
      .should('be.visible')
      .within(() => {
        cy.byTestId('select-employee-row-0').should('contain.text', '0200 Test User');
        cy.byTestId('select-employee-button-0').click();
      });
    cy.byTestId('selectedDriverDescription').should('have.text', '0200 Test User');
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

  // Recurses over intercepted '@patchItem' requests until a request body matching each of
  // `targets` has been seen at least once, regardless of order or how many requests it takes -
  // the offline queue only guarantees the final value per field eventually gets sent, not one
  // request per interaction.
  // The phone layout auto-saves every change, which marks route 2 as started for this
  // distribution; a started-but-incomplete route blocks closing the distribution in afterEach, and
  // there is no way to un-start one - so finish it the way a driver would, through the same
  // endpoints the app uses. Food collections live per distribution, so nothing leaks into the next
  // test's freshly created one. Testdata ids: car 1 (W-NC-123), employees 200/500.
  function completeRouteViaApi() {
    cy.request('POST', '/api/food-collections/routes/2', {carId: 1, driverId: 200, coDriverId: 500});
    cy.request('POST', '/api/food-collections/routes/2/km', {kmStart: 1000, kmEnd: 2000});
  }

  function waitForFinalPatches(targets: { categoryId: number; shopId: number; amount: number }[]) {
    const seen: string[] = [];
    const remaining = () => targets.filter(t => !seen.includes(JSON.stringify(t)));

    recurse(
      () => cy.wait('@patchItem').its('request.body'),
      (body) => {
        seen.push(JSON.stringify(body));
        return remaining().length === 0;
      },
      {timeout: 20000, delay: 0}
    );
  }

  function goOffline() {
    cy.window().then((win) => win.dispatchEvent(new Event('offline')));
  }

  function goOnline() {
    cy.window().then((win) => win.dispatchEvent(new Event('online')));
  }

  // testdata: food categories 1-10 are regular categories, 11-14 are return-box categories
  function fillCategories() {
    const shopIds = [20, 21];
    for (let category = 1; category <= 10; category++) {
      for (const shopId of shopIds) {
        const value = category === 1 && shopId === 20 ? '12' : '1';
        cy.byTestId(`category-${category}-shop-${shopId}-input`).clear().type(value);
      }
    }
  }

  function fillReturnCategories() {
    const shopIds = [20, 21];
    for (let category = 11; category <= 14; category++) {
      for (const shopId of shopIds) {
        const value = category === 11 && shopId === 20 ? '4' : '1';
        cy.byTestId(`return-category-${category}-shop-${shopId}-input`).clear().type(value);
      }
    }
  }

  // The Retourware counters are labelled from the (editable) return-category master data, so tests
  // that need the label read it off the row instead of assuming a fixed name.
  function returnCategoryName(categoryId: number) {
    return cy.byTestId(`return-category-${categoryId}-shop-20-input`)
      .closest('tr')
      .find('th[scope="row"]')
      .invoke('text')
      .then((text) => text.trim());
  }

  // `shopId` is only picked on the desktop layout - the responsive one always records for the
  // shop currently shown
  function addFreetextReturnItem(shopId: number | undefined, description: string, amount: number) {
    cy.byTestId('add-return-item-button').click();
    if (shopId !== undefined) {
      cy.byTestId('return-item-0-shop-input').click();
      cy.byTestId(`return-item-0-shop-option-${shopId}`).click();
    }
    cy.byTestId('return-item-0-description-input').clear().type(description);
    cy.byTestId('return-item-0-amount-input').clear().type(String(amount));
  }

  // The totals cells are plain interpolated text nodes indented by the template, so their raw
  // textContent carries surrounding whitespace - trim before comparing.
  function assertCellText(testId: string, expected: string) {
    cy.byTestId(testId).invoke('text').then((text) => expect(text.trim()).to.equal(expected));
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
