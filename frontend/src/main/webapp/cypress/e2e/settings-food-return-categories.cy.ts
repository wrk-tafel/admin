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
    cy.byTestId('enableFoodReturnCategoryButton').first().click();
    cy.get('.toast-message').should('be.visible');
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('food-return-categories-table').should('not.be.visible');
    cy.byTestId('food-return-categories-cards').should('be.visible');
    cy.byTestId('addFoodReturnCategoryButton').should('be.visible');

    // The 'toggles return category visibility' test above may have left row 0 disabled (its edit
    // button is disabled for disabled categories) - re-enable it first if needed.
    cy.byTestId('editFoodReturnCategoryButtonMobile-0').then(($btn) => {
      if ($btn.is(':disabled')) {
        cy.byTestId('disableFoodReturnCategoryButton').filterDisplayed().first().click();
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


  // Angular CDK's drag-and-drop contributes no keyboard behaviour of its own, so without this the
  // sort order could only be changed with a pointing device (see #3131).
  //
  // Every lookup goes through `cy.get` scoped to the table - the reorder re-renders the rows twice
  // (optimistically, then again from the response), so a subject captured up front detaches, and
  // only a re-queryable chain survives that. The table scope also picks the displayed one of the
  // two responsive layouts, which both carry the same testid.
  it('reorders with the keyboard and keeps focus on the moved record', () => {
    const handle = (index: number) =>
      cy.get('[testid="food-return-categories-table"] [testid="dragFoodReturnCategoryHandle-' + index + '"]');

    handle(0).invoke('attr', 'aria-label').then((label) => {
      const movedRecord = label!.split(', Position')[0];
      expect(movedRecord).to.contain('Retour-Kategorie');

      handle(0).focus().trigger('keydown', {key: 'ArrowDown'});

      handle(1).should(($handle) => {
        const movedLabel = $handle.attr('aria-label')!;
        expect(movedLabel).to.contain(movedRecord);
        expect(movedLabel).to.contain('Position 2 von');
      });
      cy.focused().should('have.attr', 'testid', 'dragFoodReturnCategoryHandle-1');

      // back where it started, so the order the other cases rely on is unchanged
      handle(1).focus().trigger('keydown', {key: 'ArrowUp'});
      handle(0).should(($handle) => {
        expect($handle.attr('aria-label')).to.contain(movedRecord);
      });
    });
  });

});
