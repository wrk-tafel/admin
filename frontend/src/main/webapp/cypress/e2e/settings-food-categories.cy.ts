import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Food Categories', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/einstellungen/lebensmittelkategorien');
  });

  it('lists food categories', () => {
    cy.byTestId('food-categories-table').should('exist');
    cy.byTestId('food-categories-row-0').should('contain.text', 'Backwaren');
  });

  it('creates a new food category', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('addFoodCategoryButton').click();

      // Dialog fields are rendered in an overlay; target visible inputs instead of the host element
      cy.get('input[formControlName="name"]').should('be.visible').type('New Category ' + randomId);
      cy.get('input[formControlName="weightPerUnit"]').type('12');
      cy.contains('Speichern').click();

      cy.byTestId('food-categories-table').should('contain.text', 'New Category ' + randomId);
    });
  });

  it('shows validation errors and does not submit an invalid new food category', () => {
    cy.byTestId('addFoodCategoryButton').click();

    // Try to save without required fields
    cy.get('input[formControlName="name"]').should('be.visible').clear();
    cy.get('input[formControlName="weightPerUnit"]').clear();
    cy.contains('Speichern').click();
    // Ensure dialog still open (save did not close because of validation)
    cy.get('input[formControlName="name"]').should('have.class', 'ng-invalid');
  });

  it('focuses the name input when starting an inline edit', () => {
    cy.byTestId('editFoodCategoryButton-0').click();

    cy.byTestId('foodCategoryNameInput-0').should('be.focused');
  });

  it('edits a food category inline', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('editFoodCategoryButton-0').click();

      const newName = 'Backwaren Updated ' + randomId;
      cy.byTestId('foodCategoryNameInput-0').should('be.visible').clear().type(newName);
      cy.byTestId('saveFoodCategoryButton-0').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('food-categories-row-0').should('contain.text', newName);
    });
  });

  it('discards changes when cancelling an inline edit', () => {
    cy.byTestId('food-categories-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editFoodCategoryButton-0').click();
      cy.byTestId('foodCategoryNameInput-0').clear().type('Should Not Be Saved');
      cy.byTestId('cancelFoodCategoryButton-0').click();

      cy.byTestId('food-categories-row-0').should('have.text', originalText);
    });
  });

  it('saves the inline edit when pressing Enter', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('editFoodCategoryButton-0').click();

      const newName = 'Backwaren Enter ' + randomId;
      cy.byTestId('foodCategoryNameInput-0').should('be.visible').clear().type(newName + '{enter}');

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('food-categories-row-0').should('contain.text', newName);
    });
  });

  it('discards changes when pressing Escape', () => {
    cy.byTestId('food-categories-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editFoodCategoryButton-0').click();
      cy.byTestId('foodCategoryNameInput-0').clear().type('Should Not Be Saved{esc}');

      cy.byTestId('food-categories-row-0').should('have.text', originalText);
    });
  });

  it('toggles food category visibility', () => {
    cy.byTestId('enableFoodCategoryButton').first().click();
    cy.get('.toast-message')
      .should('be.visible');
  });

  it('renders as a card list on phone and stays usable', () => {
    cy.viewport(PHONE_VIEWPORT);
    cy.reload();

    cy.byTestId('food-categories-table').should('not.be.visible');
    cy.byTestId('food-categories-cards').should('be.visible');
    cy.byTestId('addFoodCategoryButton').should('be.visible');

    // The 'toggles food category visibility' test above may have left row 0 disabled (its edit
    // button is disabled for disabled categories) - re-enable it first if needed.
    cy.byTestId('editFoodCategoryButtonMobile-0').then(($btn) => {
      if ($btn.is(':disabled')) {
        cy.byTestId('disableFoodCategoryButton').filterDisplayed().first().click();
        cy.get('.toast-message').should('be.visible');
      }
    });

    cy.getAnyRandomNumber().then((randomId) => {
      const newName = 'Backwaren Phone ' + randomId;

      cy.byTestId('editFoodCategoryButtonMobile-0').click();
      cy.byTestId('foodCategoryNameInputMobile-0').should('be.visible').clear().type(newName + '{enter}');

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('food-categories-cards').should('contain.text', newName);
    });
  });

  it('renders as a table at tablet breakpoint', () => {
    cy.viewport(TABLET_VIEWPORT);
    cy.reload();

    cy.byTestId('food-categories-table').should('be.visible');
    cy.byTestId('food-categories-cards').should('not.be.visible');
    cy.byTestId('addFoodCategoryButton').should('be.visible');
  });

});
