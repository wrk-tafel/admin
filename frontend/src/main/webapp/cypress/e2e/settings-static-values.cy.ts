describe('Settings - Static Values', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/einstellungen/statische-werte');
  });

  it('lists static values', () => {
    cy.byTestId('static-values-table').should('exist');
    cy.byTestId('static-values-row-0').should('contain.text', 'Einkommensgrenze');
  });

  it('creates a new static value', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      const countAdults = randomId % 90 + 10;

      cy.byTestId('addStaticValueButton').click();

      // Use a person-count combination that isn't already seeded, so it doesn't collide
      // with the overlap validation (every type/count combo in the seed data spans 1900-2999).
      cy.byTestId('staticValueTypeSelect').should('be.visible').click();
      cy.get('mat-option').contains('Einkommensgrenze').click();

      cy.get('input[formControlName="validFrom"]').should('be.visible').type('2030-01-01');
      cy.get('input[formControlName="validTo"]').type('2031-12-31');
      cy.get('input[formControlName="amount"]').type('55');
      cy.get('input[formControlName="countAdults"]').type(countAdults.toString());
      cy.get('input[formControlName="countChildren"]').type('0');

      cy.byTestId('static-value-save-button').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'erstellt');
    });
  });

  it('edits a static value', () => {
    cy.get('[testid^="editStaticValueButton-"]').first().click();

    cy.get('input[formControlName="amount"]').should('be.visible').clear().type('1500');
    cy.byTestId('static-value-save-button').click();

    cy.byTestId('static-values-row-0').should('contain.text', '1500');
  });

  it('shows validation errors and does not submit invalid static value', () => {
    cy.byTestId('addStaticValueButton').click();

    cy.get('input[formControlName="validFrom"]').should('be.visible').clear();
    cy.byTestId('static-value-save-button').click();
    cy.get('input[formControlName="validFrom"]').should('have.class', 'ng-invalid');
  });

  it('shows an error when the date range overlaps an existing value', () => {
    cy.byTestId('addStaticValueButton').click();

    cy.byTestId('staticValueTypeSelect').should('be.visible').click();
    cy.get('mat-option').contains('Toleranz').click();

    cy.get('input[formControlName="validFrom"]').should('be.visible').type('1999-01-01');
    cy.get('input[formControlName="validTo"]').type('2999-12-31');
    cy.get('input[formControlName="amount"]').type('10');

    cy.byTestId('static-value-save-button').click();

    cy.get('.toast-message').should('be.visible');
  });

});
