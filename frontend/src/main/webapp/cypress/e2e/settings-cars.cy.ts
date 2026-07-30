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

      cy.byTestId('cars-table').should('contain.text', 'New Car ' + randomId);
    });
  });

  it('shows validation errors and does not submit an invalid new car', () => {
    cy.byTestId('addCarButton').click();

    // Try to save without required fields
    cy.get('input[formControlName="licensePlate"]').should('be.visible').clear();
    cy.contains('Speichern').click();
    // Ensure dialog still open (save did not close because of validation)
    cy.get('input[formControlName="licensePlate"]').should('have.class', 'ng-invalid');
  });

  it('focuses the license plate input when starting an inline edit', () => {
    cy.byTestId('editCarButton-0').click();

    cy.byTestId('carLicensePlateInput-0').should('be.focused');
  });

  it('edits a car inline', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('editCarButton-0').click();

      const newName = 'Nice Car Updated ' + randomId;
      cy.byTestId('carNameInput-0').should('be.visible').clear().type(newName);
      cy.byTestId('saveCarButton-0').click();

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('cars-row-0').should('contain.text', newName);
    });
  });

  it('discards changes when cancelling an inline edit', () => {
    cy.byTestId('cars-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editCarButton-0').click();
      cy.byTestId('carNameInput-0').clear().type('Should Not Be Saved');
      cy.byTestId('cancelCarButton-0').click();

      cy.byTestId('cars-row-0').should('have.text', originalText);
    });
  });

  it('saves the inline edit when pressing Enter', () => {
    cy.getAnyRandomNumber().then((randomId) => {
      cy.byTestId('editCarButton-0').click();

      const newName = 'Nice Car Enter ' + randomId;
      cy.byTestId('carNameInput-0').should('be.visible').clear().type(newName + '{enter}');

      cy.get('.toast-message').should('be.visible').and('contain.text', 'gespeichert');
      cy.byTestId('cars-row-0').should('contain.text', newName);
    });
  });

  it('discards changes when pressing Escape', () => {
    cy.byTestId('cars-row-0').invoke('text').then((originalText) => {
      cy.byTestId('editCarButton-0').click();
      cy.byTestId('carNameInput-0').clear().type('Should Not Be Saved{esc}');

      cy.byTestId('cars-row-0').should('have.text', originalText);
    });
  });

  it('toggles car visibility', () => {
    cy.byTestId('enableCarButton').first().click();
    cy.get('.toast-message')
      .should('be.visible');
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
