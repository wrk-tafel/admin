import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Food Return Categories', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/einstellungen/retourkategorien');
  });

  it('lists return categories', () => {
    cy.byTestId('food-return-categories-table').should('exist');
    cy.byTestId('food-return-categories-row-0').should('contain.text', 'Graue Kisten');
  });

  it('names both screens the categories drive', () => {
    cy.byTestId('food-return-categories-summary').should('contain.text', 'aktiv');
    cy.contains('Retourware').should('be.visible');
    cy.contains('Routen-Navigation').should('be.visible');
  });

  it('links to the food categories screen so a mix-up is caught before editing', () => {
    cy.byTestId('food-return-categories-distinction').should('contain.text', 'Waren-Kategorien');
    cy.byTestId('food-return-categories-distinction').find('a').click();

    cy.url().should('include', '/einstellungen/lebensmittelkategorien');
    cy.byTestId('food-categories-distinction').should('contain.text', 'Retour-Kategorien');
  });

  // Asserted through the state of the Aktiv switches rather than by row count: it then holds
  // whatever the other cases left behind, including a filter that matches nothing at all - and it
  // changes no data of its own.
  it('filters the list by status', () => {
    const switches = (state: 'true' | 'false') =>
      cy.get(`[testid^="food-return-categories-enabled-toggle-"] button[aria-checked="${state}"]`);

    cy.byTestId('food-return-categories-filter-enabled').click();
    switches('false').should('not.exist');

    cy.byTestId('food-return-categories-filter-disabled').click();
    switches('true').should('not.exist');

    cy.byTestId('food-return-categories-filter-all').click();
    cy.byTestId('food-return-categories-row-0').should('be.visible');
  });

  it('creates a new return category', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('addFoodReturnCategoryButton').click();

      // Dialog fields are rendered in an overlay; target visible inputs instead of the host element
      cy.get('input[formControlName="name"]').should('be.visible').type('Neue Kiste ' + randomId);
      cy.contains('Speichern').click();

      cy.byTestId('food-return-categories-table').should('contain.text', 'Neue Kiste ' + randomId);
    });
  });

  it('shows validation errors and does not submit an invalid new return category', () => {
    cy.byTestId('addFoodReturnCategoryButton').click();

    cy.get('input[formControlName="name"]').should('be.visible').clear();
    cy.contains('Speichern').click();

    cy.byTestId('food-return-category-create-dialog').should('be.visible');
    cy.get('input[formControlName="name"]').should('have.class', 'ng-invalid');
  });

  it('focuses the name input when starting an inline edit', () => {
    cy.byTestId('editFoodReturnCategoryButton-0').click();

    cy.byTestId('foodReturnCategoryNameInput-0').should('be.focused');
  });

  it('edits a return category inline', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('editFoodReturnCategoryButton-0').click();

      const newName = 'Graue Kisten Updated ' + randomId;
      cy.byTestId('foodReturnCategoryNameInput-0').should('be.visible').clear().type(newName);
      cy.byTestId('saveFoodReturnCategoryButton-0').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('food-return-categories-row-0').should('contain.text', newName);
    });
  });

  it('discards changes when cancelling an inline edit', () => {
    cy.byTestId('food-return-categories-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editFoodReturnCategoryButton-0').click();
      cy.byTestId('foodReturnCategoryNameInput-0').clear().type('Should Not Be Saved');
      cy.byTestId('cancelFoodReturnCategoryButton-0').click();

      cy.byTestId('food-return-categories-row-0').should('have.text', originalText);
    });
  });

  it('saves the inline edit when pressing Enter', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('editFoodReturnCategoryButton-0').click();

      const newName = 'Graue Kisten Enter ' + randomId;
      cy.byTestId('foodReturnCategoryNameInput-0').should('be.visible').clear().type(newName + '{enter}');

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('food-return-categories-row-0').should('contain.text', newName);
    });
  });

  it('discards changes when pressing Escape', () => {
    cy.byTestId('food-return-categories-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editFoodReturnCategoryButton-0').click();
      cy.byTestId('foodReturnCategoryNameInput-0').clear().type('Should Not Be Saved{esc}');

      cy.byTestId('food-return-categories-row-0').should('have.text', originalText);
    });
  });

  it('toggles return category visibility', () => {
    cy.byTestId('food-return-categories-enabled-toggle-0').find('button').click();
    cy.get('.toast-message').should('be.visible');
    cy.byTestId('food-return-categories-enabled-toggle-0').find('button')
      .should('have.attr', 'aria-checked', 'false');

    // toggle back on - a disabled row 0 would leak into the later tests, whose edit button is
    // disabled for disabled categories
    cy.byTestId('food-return-categories-enabled-toggle-0').find('button').click();
    cy.byTestId('food-return-categories-enabled-toggle-0').find('button')
      .should('have.attr', 'aria-checked', 'true');
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('food-return-categories-table').should('not.be.visible');
    cy.byTestId('addFoodReturnCategoryButton').should('be.visible');
    // The screen's intro text fills a phone viewport, so the card list starts below the fold -
    // scroll to it the way a user would before asserting on it.
    cy.byTestId('food-return-categories-cards').scrollIntoView().should('be.visible');

    // The 'toggles return category visibility' test above may have left row 0 disabled (its edit
    // button is disabled for disabled categories) - re-enable it first if needed.
    cy.byTestId('editFoodReturnCategoryButtonMobile-0').then(($btn) => {
      if ($btn.is(':disabled')) {
        cy.byTestId('food-return-categories-enabled-toggle-mobile-0').find('button').click();
        cy.get('.toast-message').should('be.visible');
      }
    });

    cy.getAnyRandomNumber().then((randomId) => {
      const newName = 'Graue Kisten Phone ' + randomId;

      cy.byTestId('editFoodReturnCategoryButtonMobile-0').click();
      cy.byTestId('foodReturnCategoryNameInputMobile-0').should('be.visible').clear().type(newName + '{enter}');

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('food-return-categories-cards').should('contain.text', newName);
    });
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('food-return-categories-table').should('be.visible');
    cy.byTestId('food-return-categories-cards').should('not.be.visible');
    cy.byTestId('addFoodReturnCategoryButton').should('be.visible');
  });


  // The states below exist only after a click, so neither the template lint nor the Lighthouse
  // `pages` sweep ever sees them - see cypress/support/accessibility.ts.
  describe('accessibility', () => {

    it('has no violations while the create dialog is open', () => {
      cy.byTestId('addFoodReturnCategoryButton').click();

      cy.checkDialogAccessibility();
    });

    it('has no violations while a row is edited inline', () => {
      cy.byTestId('editFoodReturnCategoryButton-0').click();
      cy.byTestId('foodReturnCategoryNameInput-0').should('be.visible');

      cy.checkAccessibility('[testid="food-return-categories-table"]');
    });

    it('has no violations while a card is edited inline on phone', () => {
      cy.viewport(PHONE_VIEWPORT);
      cy.reload();

      cy.byTestId('editFoodReturnCategoryButtonMobile-0').click();
      cy.byTestId('foodReturnCategoryNameInputMobile-0').should('be.visible');

      cy.checkAccessibility('[testid="food-return-categories-cards"]');
    });

  });

  // Angular CDK's drag-and-drop contributes no keyboard behaviour of its own, so without this the
  // sort order could only be changed with a pointing device (see #3131).
  //
  // Every lookup goes through `cy.get` scoped to the table, and each move waits for its request to
  // land: a reorder re-renders the rows optimistically and then again from the response, so a
  // subject captured before that second render is gone by the time it is used. The table scope
  // also picks the displayed one of the two responsive layouts, which share a testid.
  it('reorders with the keyboard and keeps focus on the moved record', () => {
    const handle = (index: number) =>
      cy.get('[testid="food-return-categories-table"] [testid="dragFoodReturnCategoryHandle-' + index + '"]');

    cy.intercept('POST', '/api/food-return-categories/reorder').as('reorder');

    handle(0).invoke('attr', 'aria-label').then((label) => {
      const movedRecord = label!.split(', Position')[0];
      expect(movedRecord).to.contain('Retour-Kategorie');

      handle(0).focus().trigger('keydown', {key: 'ArrowDown'});
      cy.wait('@reorder');

      handle(1).should(($handle) => {
        const movedLabel = $handle.attr('aria-label')!;
        expect(movedLabel).to.contain(movedRecord);
        expect(movedLabel).to.contain('Position 2 von');
      });
      cy.focused().should('have.attr', 'testid', 'dragFoodReturnCategoryHandle-1');

      // back where it started, so the order the other cases rely on is unchanged
      handle(1).focus().trigger('keydown', {key: 'ArrowUp'});
      cy.wait('@reorder');

      handle(0).should(($handle) => {
        expect($handle.attr('aria-label')).to.contain(movedRecord);
      });
    });
  });

});
