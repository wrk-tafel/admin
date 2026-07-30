import {PHONE_VIEWPORT, TABLET_VIEWPORT} from '../support/viewports';

describe('Settings - Cars', () => {

  beforeEach(() => {
    cy.loginDefault();
    cy.visit('/#/einstellungen/fahrzeuge');
  });

  it('lists cars', () => {
    cy.byTestId('cars-table').should('exist');
    cy.byTestId('cars-row-0').should('contain.text', 'Nice Car');
  });

  it('creates a new car', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('addCarButton').click();

      // Dialog fields are rendered in an overlay; target visible inputs instead of the host element
      cy.get('input[formControlName="licensePlate"]').should('be.visible').type('W-NEW-' + randomId);
      cy.get('input[formControlName="name"]').type('New Car ' + randomId);
      cy.contains('Speichern').click();
    });
  });

  it('edits a car', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.get('[testid^="editCarButton-"]').first().click();

      // Dialog fields are rendered in the overlay; target visible inputs instead
      const newName = 'A Car Updated ' + randomId;
      cy.get('input[formControlName="name"]').should('be.visible').clear().type(newName);
      cy.contains('Speichern').click();

      cy.byTestId('cars-row-0').should('contain.text', newName);
    });
  });

  it('toggles car visibility', () => {
    cy.byTestId('enableCarButton').first().click();
    cy.get('.toast-message')
      .should('be.visible');
  });

  it('shows validation errors and does not submit invalid car', () => {
    cy.byTestId('addCarButton').click();

    // Try to save without required fields
    cy.get('input[formControlName="licensePlate"]').should('be.visible').clear();
    cy.contains('Speichern').click();
    // Ensure dialog still open (save did not close because of validation)
    cy.get('input[formControlName="licensePlate"]').should('have.class', 'ng-invalid');
  });

  it('remains usable on mobile viewports', () => {
    [PHONE_VIEWPORT, TABLET_VIEWPORT].forEach((viewport) => {
      cy.viewport(viewport);
      cy.reload();

      cy.byTestId('cars-table').should('exist');
      cy.byTestId('addCarButton').should('be.visible');
    });
  });

});
