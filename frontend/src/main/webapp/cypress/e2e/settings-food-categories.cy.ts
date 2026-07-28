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
      cy.get('input[formControlName="sortOrder"]').clear().type('500');
      cy.contains('Speichern').click();

      cy.byTestId('food-categories-table').should('contain.text', 'New Category ' + randomId);
    });
  });

  it('edits a food category', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('edit-foodcategory-button-0').click();

      // Dialog fields are rendered in the overlay; target visible inputs instead
      const newName = 'Backwaren Updated ' + randomId;
      cy.get('input[formControlName="name"]').should('be.visible').clear().type(newName);
      cy.contains('Speichern').click();

      cy.byTestId('food-categories-row-0').should('contain.text', newName);
    });
  });

  it('toggles food category visibility', () => {
    cy.byTestId('enableFoodCategoryButton').first().click();
    cy.get('.toast-message')
      .should('be.visible');
  });

  it('shows validation errors and does not submit invalid food category', () => {
    cy.byTestId('addFoodCategoryButton').click();

    // Try to save without required fields
    // Dialog fields are rendered in the overlay; target visible inputs instead
    cy.get('input[formControlName="name"]').should('be.visible').clear();
    cy.get('input[formControlName="weightPerUnit"]').clear();
    cy.contains('Speichern').click();
    // Ensure dialog still open (save did not close because of validation)
    cy.get('input[formControlName="name"]').should('have.class', 'ng-invalid');
  });

});
